import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Users, Plus, Search, Edit, Save, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useUserRole, type AppRole } from "@/hooks/use-user-role";
import { toast } from "sonner";

interface UserWithRole {
  user_id: string;
  email: string;
  display_name: string | null;
  role: AppRole;
  role_row_id: string;
  discount_rate: number | null;
  memo: string | null;
  created_at: string;
}

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "管理者",
  user: "利用者",
  client: "顧客",
};

const ROLE_COLORS: Record<AppRole, string> = {
  admin: "bg-destructive/10 text-destructive border-destructive/20",
  user: "bg-primary/10 text-primary border-primary/20",
  client: "bg-muted text-muted-foreground border-border",
};

function formatRate(rate: number | null): string {
  if (rate == null) return "—";
  const display = rate * 10;
  return `${display % 1 === 0 ? display.toFixed(0) : display}掛け`;
}

export default function UserManagementPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { isAdmin } = useUserRole();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "role" | "created">("created");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [creating, setCreating] = useState(false);
  
  // ページネーション用
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;
  
  // 新規ユーザー用フォーム
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("user");
  const [newDiscountRate, setNewDiscountRate] = useState("");
  const [newMemo, setNewMemo] = useState("");
  
  // 編集用フォーム
  const [editFormData, setEditFormData] = useState({
    display_name: "",
    role: "user" as AppRole,
    discount_rate: "",
    memo: ""
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let filtered = users;

    // 検索フィルター
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          (u.display_name && u.display_name.toLowerCase().includes(query)) ||
          u.email.toLowerCase().includes(query)
      );
    }

    // 並び替え
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "name":
          const nameA = (a.display_name || a.email).toLowerCase();
          const nameB = (b.display_name || b.email).toLowerCase();
          comparison = nameA.localeCompare(nameB);
          break;
        case "role":
          const roleOrder: Record<AppRole, number> = { admin: 0, user: 1, client: 2 };
          comparison = roleOrder[a.role] - roleOrder[b.role];
          break;
        case "created":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });

    setFilteredUsers(filtered);
    setCurrentPage(1); // 検索・並び替え時に1ページ目に戻る
  }, [users, searchQuery, sortBy, sortOrder]);

  // ページネーション計算
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  const fetchUsers = async () => {
    try {
      // まず全ユーザーを取得
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) throw authError;

      // profilesとuser_rolesをJOINして取得
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          user_id,
          display_name,
          discount_rate,
          memo,
          created_at,
          user_roles!inner(
            id,
            role
          )
        `)
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // profilesに存在するユーザーをマージ
      const merged = (profiles || []).map((profile: any) => {
        const authUser = authUsers.users.find((u: any) => u.id === profile.user_id);
        return {
          user_id: profile.user_id,
          email: authUser?.email || "",
          display_name: profile.display_name,
          role: profile.user_roles.role,
          role_row_id: profile.user_roles.id,
          discount_rate: profile.discount_rate,
          memo: profile.memo,
          created_at: profile.created_at,
        };
      });

      // profilesに存在しないユーザーを追加（roleがない場合はclientとして扱う）
      const existingUserIds = new Set(merged.map(u => u.user_id));
      const missingUsers = authUsers.users
        .filter((authUser: any) => !existingUserIds.has(authUser.id))
        .map((authUser: any) => ({
          user_id: authUser.id,
          email: authUser.email || "",
          display_name: null,
          role: "client" as AppRole,
          role_row_id: "",
          discount_rate: null,
          memo: null,
          created_at: authUser.created_at,
        }));

      const allUsers = [...merged, ...missingUsers].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setUsers(allUsers);
      setFilteredUsers(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("ユーザー情報の読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, roleRowId: string, newRole: AppRole) => {
    try {
      if (roleRowId) {
        const { error } = await supabase
          .from("user_roles")
          .update({ role: newRole })
          .eq("id", roleRowId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: newRole });
        if (error) throw error;
      }

      toast.success("権限を更新しました");
      await fetchUsers();
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("権限の更新に失敗しました");
    }
  };

  const handleEditUser = (user: UserWithRole) => {
    setEditingUser(user);
    setEditFormData({
      display_name: user.display_name || "",
      role: user.role,
      discount_rate: user.discount_rate?.toString() || "",
      memo: user.memo || ""
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    try {
      // プロフィール更新
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          display_name: editFormData.display_name.trim() || null,
          discount_rate: editFormData.discount_rate ? parseFloat(editFormData.discount_rate) : null,
          memo: editFormData.memo.trim() || null
        })
        .eq("user_id", editingUser.user_id);

      if (profileError) throw profileError;

      // 権限更新
      if (editFormData.role !== editingUser.role) {
        await handleRoleChange(editingUser.user_id, editingUser.role_row_id, editFormData.role);
      } else {
        await fetchUsers();
      }

      toast.success("ユーザー情報を更新しました");
      setShowEditDialog(false);
      setEditingUser(null);
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("ユーザー情報の更新に失敗しました");
    }
  };

  const handleCreateUser = async () => {
    if (!newEmail.trim() || !newPassword.trim()) {
      toast.error("メールアドレスとパスワードを入力してください");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("パスワードは6文字以上にしてください");
      return;
    }
    setCreating(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newEmail.trim(),
        password: newPassword,
        email_confirm: true,
      });

      if (authError) throw authError;

      const userId = authData.user.id;

      // プロフィール作成
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          user_id: userId,
          display_name: newDisplayName.trim() || null,
          discount_rate: newDiscountRate ? parseFloat(newDiscountRate) : null,
          memo: newMemo.trim() || null
        });

      if (profileError) throw profileError;

      // 権限設定
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: newRole });

      if (roleError) throw roleError;

      toast.success("ユーザーを作成しました");
      setShowAddDialog(false);
      resetForm();
      await fetchUsers();
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error("ユーザーの作成に失敗しました");
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setNewEmail("");
    setNewPassword("");
    setNewDisplayName("");
    setNewRole("user");
    setNewDiscountRate("");
    setNewMemo("");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 pb-20">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">ユーザー管理</h1>
        </div>

        {/* 検索・並び替え */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="名前やメールアドレスで検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as "name" | "role" | "created")}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created">作成日</SelectItem>
                <SelectItem value="name">名前</SelectItem>
                <SelectItem value="role">権限</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "asc" | "desc")}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">新しい順</SelectItem>
                <SelectItem value="asc">古い順</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ユーザー追加ボタン */}
        {isAdmin && (
          <div className="mb-4">
            <Button onClick={() => setShowAddDialog(true)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              ユーザー追加
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-2">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>ユーザーが見つかりません</p>
                {searchQuery && <p className="text-sm">検索条件を変えてみてください</p>}
              </div>
            ) : (
              <>
                <div className="text-sm text-muted-foreground mb-2">
                  全{filteredUsers.length}件中 {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)}件を表示
                </div>
                {currentUsers.map((u) => (
                <div
                  key={u.user_id}
                  className={`flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm ${
                    u.user_id === currentUser?.id ? "border-primary/20 bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {u.display_name || u.email}
                      </p>
                      {u.user_id === currentUser?.id && (
                        <Badge variant="outline" className="text-[10px]">
                          あなた
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={`text-[10px] ${ROLE_COLORS[u.role]}`}>
                        {ROLE_LABELS[u.role]}
                      </Badge>
                      {u.role === "client" && (
                        <span className="text-[10px] text-muted-foreground">
                          {formatRate(u.discount_rate)}
                        </span>
                      )}
                      {u.memo && (
                        <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                          {u.memo}
                        </span>
                      )}
                    </div>
                  </div>
                  {(isAdmin || u.user_id === currentUser?.id) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditUser(u)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              )}
              {/* ページネーション */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
              </>
            )}
          </div>
        )}

        {/* ユーザー追加ダイアログ */}
        {isAdmin && (
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>ユーザー追加</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">表示名</label>
                  <Input value={newDisplayName} onChange={(e) => setNewDisplayName(e.target.value)} placeholder="山田太郎" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">メールアドレス *</label>
                  <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="user@example.com" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">パスワード *</label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="6文字以上" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">権限</label>
                  <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">管理者</SelectItem>
                      <SelectItem value="user">利用者</SelectItem>
                      <SelectItem value="client">顧客</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newRole === "client" && (
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">掛率（例: 0.6 = 6掛け）</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={newDiscountRate}
                      onChange={(e) => setNewDiscountRate(e.target.value)}
                      placeholder="0.6"
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">メモ</label>
                  <Textarea
                    value={newMemo}
                    onChange={(e) => setNewMemo(e.target.value)}
                    placeholder="備考などを入力..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>キャンセル</Button>
                <Button onClick={handleCreateUser} disabled={creating}>
                  {creating ? "作成中..." : "作成"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* ユーザー編集ダイアログ */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>ユーザー編集</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">メールアドレス</label>
                <Input value={editingUser?.email || ""} disabled className="bg-muted" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">表示名</label>
                <Input
                  value={editFormData.display_name}
                  onChange={(e) => setEditFormData({...editFormData, display_name: e.target.value})}
                  placeholder="山田太郎"
                />
              </div>
              {isAdmin && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">権限</label>
                  <Select value={editFormData.role} onValueChange={(v) => setEditFormData({...editFormData, role: v as AppRole})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">管理者</SelectItem>
                      <SelectItem value="user">利用者</SelectItem>
                      <SelectItem value="client">顧客</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {editFormData.role === "client" && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">掛率（例: 0.6 = 6掛け）</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={editFormData.discount_rate}
                    onChange={(e) => setEditFormData({...editFormData, discount_rate: e.target.value})}
                    placeholder="0.6"
                  />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">メモ</label>
                <Textarea
                  value={editFormData.memo}
                  onChange={(e) => setEditFormData({...editFormData, memo: e.target.value})}
                  placeholder="備考などを入力..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>キャンセル</Button>
              <Button onClick={handleSaveEdit}>
                <Save className="h-4 w-4 mr-2" />
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
