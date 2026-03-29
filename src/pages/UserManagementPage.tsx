import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Users, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { useUserRole, type AppRole } from "@/hooks/use-user-role";
import { toast } from "sonner";

interface UserWithRole {
  user_id: string;
  email: string;
  display_name: string | null;
  role: AppRole;
  role_row_id: string;
  discount_rate: number | null;
}

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "管理者",
  user: "利用者",
  client: "クライアント",
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
  const { isAdmin } = useUserRole();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("client");
  const [newDiscountRate, setNewDiscountRate] = useState("");
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "role" | "discount">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    if (!isAdmin) return;
    fetchUsers();
  }, [isAdmin]);

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
        case "discount":
          const discountA = a.discount_rate ?? 1;
          const discountB = b.discount_rate ?? 1;
          comparison = discountA - discountB;
          break;
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });

    setFilteredUsers(filtered);
  }, [users, searchQuery, sortBy, sortOrder]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("user_id, display_name, discount_rate");

    const { data: roles, error: rErr } = await supabase
      .from("user_roles")
      .select("id, user_id, role");

    if (pErr || rErr) {
      toast.error("ユーザー情報の取得に失敗しました");
      setLoading(false);
      return;
    }

    const roleMap = new Map(roles?.map((r) => [r.user_id, { role: r.role as AppRole, id: r.id }]));

    const merged: UserWithRole[] = (profiles || []).map((p: any) => {
      const r = roleMap.get(p.user_id);
      return {
        user_id: p.user_id,
        email: p.display_name || "不明",
        display_name: p.display_name,
        role: r?.role || "client",
        role_row_id: r?.id || "",
        discount_rate: p.discount_rate,
      };
    });

    const order: Record<AppRole, number> = { admin: 0, user: 1, client: 2 };
    merged.sort((a, b) => order[a.role] - order[b.role]);

    setUsers(merged);
    setFilteredUsers(merged);
    setLoading(false);
  };

  const handleRoleChange = async (userId: string, roleRowId: string, newRole: AppRole) => {
    setUpdatingId(userId);

    if (roleRowId) {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("id", roleRowId);
      if (error) {
        toast.error("権限の更新に失敗しました");
        setUpdatingId(null);
        return;
      }
    } else {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: newRole });
      if (error) {
        toast.error("権限の設定に失敗しました");
        setUpdatingId(null);
        return;
      }
    }

    toast.success("権限を更新しました");
    setUpdatingId(null);
    await fetchUsers();
  };

  const handleDiscountRateChange = async (userId: string, value: string) => {
    const rate = value === "" ? null : parseFloat(value);
    const { error } = await supabase
      .from("profiles")
      .update({ discount_rate: rate })
      .eq("user_id", userId);
    if (error) {
      toast.error("掛率の更新に失敗しました");
      return;
    }
    toast.success("掛率を更新しました");
    await fetchUsers();
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
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("create-user", {
        body: {
          email: newEmail,
          password: newPassword,
          display_name: newDisplayName || newEmail,
          role: newRole,
          discount_rate: newRole === "client" && newDiscountRate ? parseFloat(newDiscountRate) : null,
        },
      });

      if (res.error || res.data?.error) {
        toast.error(res.data?.error || "ユーザー作成に失敗しました");
        return;
      }

      toast.success("ユーザーを作成しました");
      setShowAddDialog(false);
      setNewEmail("");
      setNewPassword("");
      setNewDisplayName("");
      setNewRole("client");
      setNewDiscountRate("");
      await fetchUsers();
    } catch {
      toast.error("ユーザー作成に失敗しました");
    } finally {
      setCreating(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 pb-24">
        <Shield className="h-16 w-16 text-muted-foreground" />
        <p className="text-lg font-medium text-muted-foreground">管理者権限が必要です</p>
        <Button variant="outline" onClick={() => navigate("/settings")}>戻る</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex-1">ユーザー管理</h1>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-1" />
          追加
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">各ユーザーの権限を変更できます</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
          <div className="rounded-lg border border-border p-2">
            <p className="font-semibold text-foreground">管理者</p>
            <p>全て編集可能</p>
          </div>
          <div className="rounded-lg border border-border p-2">
            <p className="font-semibold text-foreground">利用者</p>
            <p>商品編集・ユーザー管理不可</p>
          </div>
          <div className="rounded-lg border border-border p-2">
            <p className="font-semibold text-foreground">クライアント</p>
            <p>設定画面は非表示</p>
          </div>
        </div>
      </div>

      {/* 検索・並び替え */}
      <div className="flex flex-col sm:flex-row gap-3">
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
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as "name" | "role" | "discount")}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">名前</SelectItem>
              <SelectItem value="role">権限</SelectItem>
              <SelectItem value="discount">掛率</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "asc" | "desc")}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">昇順</SelectItem>
              <SelectItem value="desc">降順</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

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
            filteredUsers.map((u) => (
            <div
              key={u.user_id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {u.display_name || u.email}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className={`text-[10px] ${ROLE_COLORS[u.role]}`}>
                    {ROLE_LABELS[u.role]}
                  </Badge>
                  {u.role === "client" && (
                    <span className="text-[10px] text-muted-foreground">
                      {formatRate(u.discount_rate)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {u.role === "client" && (
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    placeholder="掛率"
                    value={u.discount_rate ?? ""}
                    onChange={(e) => handleDiscountRateChange(u.user_id, e.target.value)}
                    className="h-9 w-[70px] text-xs text-center"
                  />
                )}
                <Select
                  value={u.role}
                  onValueChange={(v) => handleRoleChange(u.user_id, u.role_row_id, v as AppRole)}
                  disabled={updatingId === u.user_id}
                >
                  <SelectTrigger className="w-[120px] h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="admin">管理者</SelectItem>
                    <SelectItem value="user">利用者</SelectItem>
                    <SelectItem value="client">クライアント</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))
          )}
        </div>
      )}

      {/* Add User Dialog */}
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
                  <SelectItem value="client">クライアント</SelectItem>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>キャンセル</Button>
            <Button onClick={handleCreateUser} disabled={creating}>
              {creating ? "作成中..." : "作成"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
