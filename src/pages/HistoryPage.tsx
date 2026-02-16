import { useState, useMemo } from "react";
import { useInventory } from "@/hooks/use-inventory";
import { ArrowUp, ArrowDown, Edit, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const ITEMS_PER_PAGE = 100;

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "たった今";
  if (mins < 60) return `${mins}分前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}時間前`;
  return date.toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryPage() {
  const { logs, products, loading } = useInventory();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Build product detail map
  const productMap = useMemo(() => {
    const map = new Map<string, typeof products[0]>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter((log) => {
      const prod = productMap.get(log.product_id);
      return (
        (log.product_name || "").toLowerCase().includes(q) ||
        (prod?.model_number || "").toLowerCase().includes(q) ||
        (prod?.parent_category || "").toLowerCase().includes(q) ||
        (prod?.sub_category || "").toLowerCase().includes(q) ||
        (prod?.color || "").toLowerCase().includes(q) ||
        (prod?.size || "").toLowerCase().includes(q) ||
        (prod?.barcode || "").toLowerCase().includes(q)
      );
    });
  }, [logs, search, productMap]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pagedLogs = filteredLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page on search change
  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-foreground">変動履歴</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          在庫の入出庫ログ
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="商品名・型番・カテゴリで検索..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9 h-10"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <p className="text-muted-foreground">
            {search ? "検索結果がありません" : "まだ履歴がありません"}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {pagedLogs.map((log) => {
              const prod = productMap.get(log.product_id);
              const details = [
                prod?.model_number,
                prod?.parent_category,
                prod?.sub_category,
                prod?.color,
                prod?.size,
              ].filter(Boolean);

              return (
                <div
                  key={log.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm"
                >
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                      log.type === "in"
                        ? "bg-success/10"
                        : log.type === "out"
                        ? "bg-destructive/10"
                        : "bg-primary/10"
                    }`}
                  >
                    {log.type === "in" ? (
                      <ArrowUp className="h-5 w-5 text-success" />
                    ) : log.type === "out" ? (
                      <ArrowDown className="h-5 w-5 text-destructive" />
                    ) : (
                      <Edit className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {log.product_name}
                    </p>
                    {details.length > 0 && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        {details.join(" / ")}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {log.display_name && log.display_name !== "不明" ? `${log.display_name} · ` : ""}
                      {formatTime(log.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-base font-bold ${
                        log.change > 0
                          ? "text-success"
                          : log.change < 0
                          ? "text-destructive"
                          : "text-foreground"
                      }`}
                    >
                      {log.change > 0 ? `+${log.change}` : log.change}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      残: {log.new_stock}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
