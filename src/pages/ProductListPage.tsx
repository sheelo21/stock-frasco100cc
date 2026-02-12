import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useInventory } from "@/hooks/use-inventory";

export default function ProductListPage() {
  const { products, loading } = useInventory();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        p.product_number?.toLowerCase().includes(q) ||
        p.model_number?.toLowerCase().includes(q)
    );
  }, [products, search]);

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
          placeholder="商品名・型番・JANコードで検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          該当する商品がありません
        </p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="whitespace-nowrap">商品番号</TableHead>
                <TableHead className="whitespace-nowrap">商品型番</TableHead>
                <TableHead className="whitespace-nowrap">商品名</TableHead>
                <TableHead className="whitespace-nowrap">カタログページ</TableHead>
                <TableHead className="whitespace-nowrap">親カテゴリ</TableHead>
                <TableHead className="whitespace-nowrap">子カテゴリ</TableHead>
                <TableHead className="whitespace-nowrap">カラー</TableHead>
                <TableHead className="whitespace-nowrap">JANコード</TableHead>
                <TableHead className="whitespace-nowrap text-right">上代(税込)</TableHead>
                <TableHead className="whitespace-nowrap text-right">上代(税抜)</TableHead>
                <TableHead className="whitespace-nowrap">サイズ</TableHead>
                <TableHead className="whitespace-nowrap">新商品</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((product) => (
                <TableRow
                  key={product.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  <TableCell className="whitespace-nowrap text-sm">
                    {product.product_number || "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {product.model_number || "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm font-medium">
                    {product.name}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {product.catalog_page || "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {product.parent_category || "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {product.sub_category || "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {product.color || "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm font-mono">
                    {product.barcode}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-right">
                    {product.price_with_tax != null
                      ? `¥${product.price_with_tax.toLocaleString()}`
                      : "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-right">
                    {product.price_without_tax != null
                      ? `¥${product.price_without_tax.toLocaleString()}`
                      : "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {product.size || "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {product.is_new ? (
                      <Badge variant="default" className="text-xs">NEW</Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
