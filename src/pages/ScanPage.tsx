import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Scan, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ScannerView from "@/components/ScannerView";
import { useInventory } from "@/hooks/use-inventory";
import { toast } from "sonner";

export default function ScanPage() {
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const navigate = useNavigate();
  const { findByBarcode } = useInventory();

  const handleScan = useCallback(
    (barcode: string) => {
      setScanning(false);
      const product = findByBarcode(barcode);
      if (product) {
        toast.success(`${product.name} を検出しました`);
        navigate(`/product/${product.id}`);
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
    [findByBarcode, navigate]
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
          バーコードをスキャンして在庫を確認
        </p>
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
          検索
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
