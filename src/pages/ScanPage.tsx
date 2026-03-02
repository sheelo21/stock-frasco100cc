import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Scan, Keyboard, PackagePlus, PackageMinus, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import ScannerView from "@/components/ScannerView";
import { useInventory } from "@/hooks/use-inventory";
import { toast } from "sonner";

type ScanMode = "in" | "out";

export default function ScanPage() {
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [mode, setMode] = useState<ScanMode>("in");
  const [quantity, setQuantity] = useState(1);
  const navigate = useNavigate();
  const { findByBarcode, addStock, removeStock } = useInventory();

  const handleScan = useCallback(
    async (barcode: string) => {
      setScanning(false);
      const product = findByBarcode(barcode);
      if (product) {
        if (mode === "in") {
          const ok = await addStock(product.id, quantity);
          if (ok) {
            toast.success("読み取りが完了しました。", { description: `${product.name} を${quantity}個入庫しました（在庫: ${product.stock + quantity}）` });
          } else {
            toast.error("入庫に失敗しました");
          }
        } else {
          if (product.stock < quantity) {
            toast.error(`${product.name} の在庫が足りません（現在: ${product.stock}）`);
            return;
          }
          const ok = await removeStock(product.id, quantity);
          if (ok) {
            toast.success("読み取りが完了しました。", { description: `${product.name} を${quantity}個出庫しました（在庫: ${product.stock - quantity}）` });
          } else {
            toast.error("出庫に失敗しました");
          }
        }
      } else {
        toast.error("商品が見つかりませんでした", {
          description: `JANコード: ${barcode}`,
          action: {
            label: "新規登録",
            onClick: () => navigate(`/products/add?barcode=${encodeURIComponent(barcode)}`),
          },
        });
      }
    },
    [findByBarcode, navigate, mode, addStock, removeStock]
  );

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleScan(manualCode.trim());
      setManualCode("");
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 pb-24">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">在庫スキャン</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          バーコードをスキャンして在庫を操作
        </p>
      </div>

      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={mode === "in" ? "default" : "outline"}
          size="lg"
          className="h-14 text-base font-bold"
          onClick={() => setMode("in")}
        >
          <PackagePlus className="mr-2 h-5 w-5" />
          入庫モード
        </Button>
        <Button
          variant={mode === "out" ? "destructive" : "outline"}
          size="lg"
          className="h-14 text-base font-bold"
          onClick={() => setMode("out")}
        >
          <PackageMinus className="mr-2 h-5 w-5" />
          出庫モード
        </Button>
      </div>

      {/* Quantity selector */}
      <div className="flex items-center justify-center gap-4">
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

      {/* Current mode indicator */}
      <div className={`rounded-lg p-3 text-center text-sm font-medium ${
        mode === "in"
          ? "bg-primary/10 text-primary border border-primary/20"
          : "bg-destructive/10 text-destructive border border-destructive/20"
      }`}>
        {mode === "in" ? `📦 スキャンした商品を${quantity}個入庫します` : `📤 スキャンした商品を${quantity}個出庫します`}
      </div>

      {/* Scanner toggle */}
      <Button
        size="lg"
        className="h-16 text-lg font-bold"
        onClick={() => setScanning(!scanning)}
      >
        <Scan className="mr-3 h-6 w-6" />
        {scanning ? "スキャンを停止" : "カメラでスキャン"}
      </Button>

      {scanning && <ScannerView onScan={handleScan} active={scanning} />}

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">または</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Manual input */}
      <form onSubmit={handleManualSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Keyboard className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="JANコードを入力"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            className="h-12 pl-10 text-base"
          />
        </div>
        <Button type="submit" size="lg" className="h-12 px-6">
          {mode === "in" ? "入庫" : "出庫"}
        </Button>
      </form>

      {/* Demo barcodes hint */}
      <div className="rounded-lg bg-muted p-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">
          テスト用JANコード:
        </p>
        <div className="flex flex-wrap gap-2">
          {["4901234567890", "4902345678901", "4903456789012"].map((code) => (
            <button
              key={code}
              onClick={() => handleScan(code)}
              className="rounded-md bg-card px-3 py-1.5 text-xs font-mono text-foreground shadow-sm border border-border active:scale-95 transition-transform"
            >
              {code}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
