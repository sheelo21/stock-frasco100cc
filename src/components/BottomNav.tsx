import { NavLink } from "react-router-dom";
import { Package, BoxesIcon, Settings, FileText, BarChart3, Users } from "lucide-react";
import { useUserRole } from "@/hooks/use-user-role";

export default function BottomNav() {
  const { isClient } = useUserRole();

  const navItems = [
    { to: "/", icon: BarChart3, label: "ダッシュボード" },
    { to: "/products", icon: Package, label: "商品一覧" },
    ...(!isClient ? [{ to: "/inventory", icon: BoxesIcon, label: "在庫一覧" }] : []),
    { to: "/orders", icon: FileText, label: "書類履歴" },
    { to: "/customers", icon: Users, label: "顧客" },
    ...(!isClient ? [{ to: "/settings", icon: Settings, label: "設定" }] : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card safe-bottom">
      <div className="mx-auto flex max-w-lg items-stretch">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`
            }
          >
            <Icon className="h-6 w-6" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
