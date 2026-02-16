import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, GripVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useDropdownOptions,
  OPTION_TYPES,
  type OptionType,
} from "@/hooks/use-dropdown-options";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableItem({
  id,
  value,
  onRemove,
}: {
  id: string;
  value: string;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm"
    >
      <button
        {...attributes}
        {...listeners}
        className="touch-none p-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 truncate">{value}</span>
      <button
        onClick={onRemove}
        className="p-1 text-muted-foreground hover:text-destructive"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

export default function SettingsDetailPage() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { getOptionsByType, addOption, removeOption, reorderOptions, loading } =
    useDropdownOptions();

  const [newValue, setNewValue] = useState("");
  const [adding, setAdding] = useState(false);

  const optionType = type as OptionType;
  const label = OPTION_TYPES[optionType];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  if (!label) {
    return (
      <div className="p-4">
        <p>不明な設定項目です</p>
        <Button variant="outline" onClick={() => navigate("/settings")}>
          戻る
        </Button>
      </div>
    );
  }

  const options = getOptionsByType(optionType);

  const handleAdd = async () => {
    if (!newValue.trim()) return;
    setAdding(true);
    const ok = await addOption(optionType, newValue.trim());
    setAdding(false);
    if (ok) {
      setNewValue("");
      toast.success(`「${newValue.trim()}」を追加しました`);
    } else {
      toast.error("追加に失敗しました（重複の可能性があります）");
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = options.findIndex((o) => o.id === active.id);
    const newIndex = options.findIndex((o) => o.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(options, oldIndex, newIndex);
    reorderOptions(optionType, reordered.map((o) => o.id));
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">{label}</h1>
      </div>

      <p className="text-sm text-muted-foreground">
        項目を追加・削除・ドラッグで並び替えできます。
      </p>

      {/* Add input */}
      <div className="flex gap-2">
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

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : options.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          項目がありません
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={options.map((o) => o.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-1">
              {options.map((opt) => (
                <SortableItem
                  key={opt.id}
                  id={opt.id}
                  value={opt.value}
                  onRemove={async () => {
                    const ok = await removeOption(opt.id);
                    if (ok) toast.success("削除しました");
                  }}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
