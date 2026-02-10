import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Minus, Save } from "lucide-react";
import type { Product } from "@/lib/inventory-store";

interface StockControlsProps {
  product: Product;
  onAdd: () => void;
  onRemove: () => void;
  onSetStock: (value: number) => void;
}

export default function StockControls({
  product,
  onAdd,
  onRemove,
  onSetStock,
}: StockControlsProps) {
  const [manualValue, setManualValue] = useState(product.stock.toString());
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    const val = parseInt(manualValue, 10);
    if (!isNaN(val) && val >= 0) {
      onSetStock(val);
      setIsEditing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Quick buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          size="lg"
          className="h-16 text-lg font-bold bg-success hover:bg-success/90 text-success-foreground"
          onClick={onAdd}
        >
          <Plus className="mr-2 h-6 w-6" />
          入庫 +1
        </Button>
        <Button
          size="lg"
          variant="destructive"
          className="h-16 text-lg font-bold"
          onClick={onRemove}
          disabled={product.stock <= 0}
        >
          <Minus className="mr-2 h-6 w-6" />
          出庫 -1
        </Button>
      </div>

      {/* Manual input */}
      {!isEditing ? (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setManualValue(product.stock.toString());
            setIsEditing(true);
          }}
        >
          数量を直接入力
        </Button>
      ) : (
        <div className="flex gap-2">
          <Input
            type="number"
            min={0}
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
            className="text-center text-lg font-bold h-12"
            autoFocus
          />
          <Button
            size="lg"
            className="h-12 px-6"
            onClick={handleSave}
          >
            <Save className="mr-2 h-5 w-5" />
            保存
          </Button>
        </div>
      )}
    </div>
  );
}
