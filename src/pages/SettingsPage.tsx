import { useState } from "react";
import { ArrowLeft, Plus, GripVertical, X, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useDropdownOptions,
  OPTION_TYPES,
  type OptionType,
} from "@/hooks/use-dropdown-options";
import { toast } from "sonner";

function OptionSection({
  type,
  label,
  options,
  onAdd,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  type: OptionType;
  label: string;
  options: { id: string; value: string; sort_order: number }[];
  onAdd: (value: string) => Promise<boolean>;
  onRemove: (id: string) => Promise<boolean>;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}) {
  const [newValue, setNewValue] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newValue.trim()) return;
    setAdding(true);
    const ok = await onAdd(newValue.trim());
    setAdding(false);
    if (ok) {
      setNewValue("");
      toast.success(`${label}に「${newValue.trim()}」を追加しました`);
    } else {
      toast.error("追加に失敗しました（重複の可能性があります）");
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground mb-3">{label}</h3>

      <div className="flex gap-2 mb-3">
        <Input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder={`${label}を追加...`}
          className="flex-1"
          maxLength={50}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <Button size="sm" onClick={handleAdd} disabled={adding || !newValue.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {options.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">項目がありません</p>
      ) : (
        <ul className="space-y-1">
          {options.map((opt, idx) => (
            <li
              key={opt.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="flex-1 truncate">{opt.value}</span>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => onMoveUp(idx)}
                  disabled={idx === 0}
                  className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onMoveDown(idx)}
                  disabled={idx === options.length - 1}
                  className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={async () => {
                    const ok = await onRemove(opt.id);
                    if (ok) toast.success("削除しました");
                  }}
                  className="p-1 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { getOptionsByType, addOption, removeOption, reorderOptions, loading } =
    useDropdownOptions();

  const handleMoveUp = (type: OptionType, index: number) => {
    const items = getOptionsByType(type);
    if (index <= 0) return;
    const newOrder = [...items];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    reorderOptions(type, newOrder.map((o) => o.id));
  };

  const handleMoveDown = (type: OptionType, index: number) => {
    const items = getOptionsByType(type);
    if (index >= items.length - 1) return;
    const newOrder = [...items];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    reorderOptions(type, newOrder.map((o) => o.id));
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">設定</h1>
      </div>

      <p className="text-sm text-muted-foreground">
        商品登録時のプルダウン選択肢を管理します。上下ボタンで並び替えできます。
      </p>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(Object.keys(OPTION_TYPES) as OptionType[]).map((type) => (
            <OptionSection
              key={type}
              type={type}
              label={OPTION_TYPES[type]}
              options={getOptionsByType(type)}
              onAdd={(val) => addOption(type, val)}
              onRemove={removeOption}
              onMoveUp={(idx) => handleMoveUp(type, idx)}
              onMoveDown={(idx) => handleMoveDown(type, idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
