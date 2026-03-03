import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FilterValues {
  parentCategories: string[];
  subCategories: string[];
  colors: string[];
}

interface InventoryFilterPanelProps {
  uniqueValues: FilterValues;
  filterParentCategory: string;
  setFilterParentCategory: (v: string) => void;
  filterSubCategory: string;
  setFilterSubCategory: (v: string) => void;
  filterColor: string;
  setFilterColor: (v: string) => void;
  activeFilterCount: number;
  clearFilters: () => void;
}

export default function InventoryFilterPanel({
  uniqueValues,
  filterParentCategory,
  setFilterParentCategory,
  filterSubCategory,
  setFilterSubCategory,
  filterColor,
  setFilterColor,
  activeFilterCount,
  clearFilters,
}: InventoryFilterPanelProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">フィルタ</p>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
            <X className="h-3 w-3 mr-1" />
            クリア
          </Button>
        )}
      </div>
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">親カテゴリ</label>
          <Select value={filterParentCategory} onValueChange={setFilterParentCategory}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="__all__">すべて</SelectItem>
              {uniqueValues.parentCategories.map((v) => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">子カテゴリ</label>
          <Select value={filterSubCategory} onValueChange={setFilterSubCategory}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="__all__">すべて</SelectItem>
              {uniqueValues.subCategories.map((v) => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">カラー</label>
          <Select value={filterColor} onValueChange={setFilterColor}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="__all__">すべて</SelectItem>
              {uniqueValues.colors.map((v) => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
