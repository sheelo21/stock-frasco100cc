import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInventory } from "@/hooks/use-inventory";

export default function ProductListPage() {
  const { products, loading } = useInventory();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category).filter(Boolean))] as string[],
    [products]
  );

  const filtered = useMemo(() => {
    let list = products;
    if (selectedCategory) list = list.filter((p) => p.category === selectedCategory);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.barcode.includes(q)
      );
    }
    return list;
  }, [products, selectedCategory, search]);

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">在庫一覧</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} / {products.length} 商品
          </p>
        </div>
        <Button size="sm" onClick={() => navigate("/products/add")}>
          <Plus className="h-4 w-4 mr-1" />
          追加
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="商品名・JANコードで検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              !selectedCategory
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border"
            }`}
          >
            すべて
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          該当する商品がありません
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((product) => {
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