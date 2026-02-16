import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Minus, Save } from "lucide-react";
import type { Product } from "@/hooks/use-inventory";

interface StockControlsProps {
  product: Product;
  onAdd: (quantity: number) => void | Promise<void>;
  onRemove: (quantity: number) => void | Promise<void>;
  onSetStock: (value: number) => void | Promise<void>;
}

export default function StockControls({
  product,
  onAdd,
  onRemove,
  onSetStock,
}: StockControlsProps) {
  const [quantity, setQuantity] = useState(1);
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
      {/* Quantity selector */}
      <div className="flex items-center justify-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">数量:</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              if (!isNaN(v) && v >= 1) setQuantity(v);
            }}
            className="h-10 w-20 text-center text-lg font-bold"
          />
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10"
            onClick={() => setQuantity((q) => q + 1)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          size="lg"
          className="h-16 text-lg font-bold bg-success hover:bg-success/90 text-success-foreground"
          onClick={() => onAdd(quantity)}
        >
          <Plus className="mr-2 h-6 w-6" />
          入庫 +{quantity}
        </Button>
        <Button
          size="lg"
          variant="destructive"
          className="h-16 text-lg font-bold"
          onClick={() => onRemove(quantity)}
          disabled={product.stock < quantity}
        >
          <Minus className="mr-2 h-6 w-6" />
          出庫 -{quantity}
        </Button>
      </div>

      {!isEditing ? (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setManualValue(product.stock.toString());
            setIsEditing(true);
          }}
        >
          現在庫を直接入力
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
          <Button size="lg" className="h-12 px-6" onClick={handleSave}>
            <Save className="mr-2 h-5 w-5" />
            保存
          </Button>
        </div>
      )}
    </div>
  );
}
