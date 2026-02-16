import { useNavigate } from "react-router-dom";
import { ChevronRight, Tag, Palette, Layers, Ruler } from "lucide-react";
import { OPTION_TYPES, type OptionType } from "@/hooks/use-dropdown-options";

const ICONS: Record<OptionType, React.ElementType> = {
  parent_category: Layers,
  sub_category: Tag,
  color: Palette,
  size: Ruler,
};

export default function SettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <h1 className="text-2xl font-bold text-foreground">設定</h1>
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
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm hover:bg-muted/50 transition-colors text-left"
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
