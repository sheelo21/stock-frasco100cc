import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import StockControls from "@/components/StockControls";
import { useInventory } from "@/hooks/use-inventory";
import { toast } from "sonner";

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, addStock, removeStock, setStockValue, loading } =
    useInventory();

  const product = products.find((p) => p.id === id);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 pb-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 pb-24">
        <Package className="h-16 w-16 text-muted-foreground" />
        <p className="text-lg font-medium text-muted-foreground">
          商品が見つかりません
        </p>
        <Button variant="outline" onClick={() => navigate("/")}>
          戻る
        </Button>
      </div>
    );
  }

  const stockStatus =
    product.stock <= 5
      ? "low"
      : product.stock <= 20
      ? "medium"
      : "good";

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit -ml-2"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        戻る
      </Button>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="h-20 w-20 flex-shrink-0 rounded-lg bg-muted flex items-center justify-center">
            <Package className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{product.category}</p>
            <h2 className="text-lg font-bold text-foreground leading-tight">
              {product.name}
            </h2>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              JAN: {product.barcode}
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-end justify-between rounded-lg bg-muted p-4">
          <div>
            <p className="text-xs text-muted-foreground">現在の在庫数</p>
            <p className="text-4xl font-bold text-foreground">
              {product.stock}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              stockStatus === "low"
                ? "bg-destructive/10 text-destructive"
                : stockStatus === "medium"
                ? "bg-warning/10 text-warning"
                : "bg-success/10 text-success"
            }`}
          >
            {stockStatus === "low"
              ? "在庫少"
              : stockStatus === "medium"
              ? "注意"
              : "十分"}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
          在庫操作
        </h3>
        <StockControls
          product={product}
          onAdd={async () => {
            const ok = await addStock(product.id);
            if (ok) toast.success("入庫しました (+1)");
          }}
          onRemove={async () => {
            const ok = await removeStock(product.id);
            if (ok) toast.success("出庫しました (-1)");
            else toast.error("在庫が不足しています");
          }}
          onSetStock={async (val) => {
            const ok = await setStockValue(product.id, val);
            if (ok) toast.success(`在庫を ${val} に更新しました`);
          }}
        />
      </div>
    </div>
  );
}
