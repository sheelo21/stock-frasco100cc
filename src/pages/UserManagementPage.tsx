import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole, type AppRole } from "@/hooks/use-user-role";
import { toast } from "sonner";

interface UserWithRole {
  user_id: string;
  email: string;
  display_name: string | null;
  role: AppRole;
  role_row_id: string;
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

export default function UserManagementPage() {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    fetchUsers();
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    // Get profiles + roles
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("user_id, display_name");

    const { data: roles, error: rErr } = await supabase
      .from("user_roles")
      .select("id, user_id, role");

    if (pErr || rErr) {
      toast.error("ユーザー情報の取得に失敗しました");
      setLoading(false);
      return;
    }

    const roleMap = new Map(roles?.map((r) => [r.user_id, { role: r.role as AppRole, id: r.id }]));

    const merged: UserWithRole[] = (profiles || []).map((p) => {
      const r = roleMap.get(p.user_id);
      return {
        user_id: p.user_id,
        email: p.display_name || "不明",
        display_name: p.display_name,
        role: r?.role || "client",
        role_row_id: r?.id || "",
      };
    });

    // Sort: admin first, then user, then client
    const order: Record<AppRole, number> = { admin: 0, user: 1, client: 2 };
    merged.sort((a, b) => order[a.role] - order[b.role]);

    setUsers(merged);
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

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 pb-24">
        <Shield className="h-16 w-16 text-muted-foreground" />
        <p className="text-lg font-medium text-muted-foreground">
          管理者権限が必要です
        </p>
        <Button variant="outline" onClick={() => navigate("/settings")}>
          戻る
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">ユーザー管理</h1>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            各ユーザーの権限を変更できます
          </p>
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

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
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
                <Badge variant="outline" className={`text-[10px] mt-0.5 ${ROLE_COLORS[u.role]}`}>
                  {ROLE_LABELS[u.role]}
                </Badge>
              </div>
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
          ))}
        </div>
      )}
    </div>
  );
}
