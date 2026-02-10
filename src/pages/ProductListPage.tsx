import { useNavigate } from "react-router-dom";
import { Package } from "lucide-react";
import { useInventory } from "@/hooks/use-inventory";

export default function ProductListPage() {
  const { products, loading } = useInventory();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-foreground">在庫一覧</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          全 {products.length} 商品
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((product) => {
            const stockStatus =
              product.stock <= 5
                ? "low"
                : product.stock <= 20
                ? "medium"
                : "good";

            return (
              <button
                key={product.id}
                onClick={() => navigate(`/product/${product.id}`)}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm text-left active:scale-[0.98] transition-transform"
              >
                <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-muted flex items-center justify-center">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {product.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {product.category}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">
                    {product.stock}
                  </p>
                  <span
                    className={`text-[10px] font-bold ${
                      stockStatus === "low"
                        ? "text-destructive"
                        : stockStatus === "medium"
                        ? "text-warning"
                        : "text-success"
                    }`}
                  >
                    {stockStatus === "low"
                      ? "在庫少"
                      : stockStatus === "medium"
                      ? "注意"
                      : "十分"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
