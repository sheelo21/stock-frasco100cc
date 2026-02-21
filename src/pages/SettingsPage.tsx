import { useNavigate } from "react-router-dom";
import { ChevronRight, Tag, Palette, Layers, Ruler, LogOut, Shield } from "lucide-react";
import { OPTION_TYPES, type OptionType } from "@/hooks/use-dropdown-options";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useUserRole } from "@/hooks/use-user-role";
import { Badge } from "@/components/ui/badge";

const ICONS: Record<OptionType, React.ElementType> = {
  parent_category: Layers,
  sub_category: Tag,
  color: Palette,
  size: Ruler,
};

const ROLE_LABELS: Record<string, string> = {
  admin: "管理者",
  user: "利用者",
  client: "クライアント",
};

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { role } = useUserRole();

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <h1 className="text-xl sm:text-2xl font-bold text-foreground">設定</h1>

      {/* User info card */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{user?.email}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {role && (
                <Badge variant="secondary" className="text-[10px]">
                  {ROLE_LABELS[role] || role}
                </Badge>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={signOut} className="flex-shrink-0">
            <LogOut className="h-4 w-4 mr-1" />
            ログアウト
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        商品登録時のプルダウン選択肢を管理します。
      </p>

      <div className="grid gap-3">
        {(Object.keys(OPTION_TYPES) as OptionType[]).map((type) => {
          const Icon = ICONS[type];
          return (
            <button
              key={type}
              onClick={() => navigate(`/settings/${type}`)}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm hover:bg-muted/50 active:bg-muted transition-colors text-left"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{OPTION_TYPES[type]}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  選択肢の追加・削除・並び替え
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
