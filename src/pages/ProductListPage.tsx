import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Download, Filter, ArrowUpDown, X, Pencil, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useInventory } from "@/hooks/use-inventory";
import { exportProductsToCSV, downloadCSV } from "@/lib/csv-utils";
import CsvImportDialog from "@/components/CsvImportDialog";
import InlineProductEditRow from "@/components/InlineProductEditRow";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type SortKey = "name" | "product_number" | "price_with_tax" | "barcode";
type SortDir = "asc" | "desc";

export default function ProductListPage() {
  const { products, loading, refresh } = useInventory();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterParentCategory, setFilterParentCategory] = useState<string>("__all__");
  const [filterSubCategory, setFilterSubCategory] = useState<string>("__all__");
  const [filterColor, setFilterColor] = useState<string>("__all__");
  const [filterNewOnly, setFilterNewOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Unique values for filter dropdowns
  const uniqueValues = useMemo(() => {
    const parentCategories = [...new Set(products.map((p) => p.parent_category).filter(Boolean))] as string[];
    const subCategories = [...new Set(products.map((p) => p.sub_category).filter(Boolean))] as string[];
    const colors = [...new Set(products.map((p) => p.color).filter(Boolean))] as string[];
    return { parentCategories: parentCategories.sort(), subCategories: subCategories.sort(), colors: colors.sort() };
  }, [products]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterParentCategory !== "__all__") count++;
    if (filterSubCategory !== "__all__") count++;
    if (filterColor !== "__all__") count++;
    if (filterNewOnly) count++;
    return count;
  }, [filterParentCategory, filterSubCategory, filterColor, filterNewOnly]);

  const clearFilters = () => {
    setFilterParentCategory("__all__");
    setFilterSubCategory("__all__");
    setFilterColor("__all__");
    setFilterNewOnly(false);
  };

  const filtered = useMemo(() => {
    let result = products;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.barcode.includes(q) ||
          p.product_number?.toLowerCase().includes(q) ||
          p.model_number?.toLowerCase().includes(q)
      );
    }

    if (filterParentCategory !== "__all__") {
      result = result.filter((p) => p.parent_category === filterParentCategory);
    }
    if (filterSubCategory !== "__all__") {
      result = result.filter((p) => p.sub_category === filterSubCategory);
    }
    if (filterColor !== "__all__") {
      result = result.filter((p) => p.color === filterColor);
    }
    if (filterNewOnly) {
      result = result.filter((p) => p.is_new);
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name, "ja");
          break;
        case "product_number":
          cmp = (a.product_number || "").localeCompare(b.product_number || "", "ja");
          break;
        case "price_with_tax":
          cmp = (a.price_with_tax ?? 0) - (b.price_with_tax ?? 0);
          break;
        case "barcode":
          cmp = a.barcode.localeCompare(b.barcode);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [products, search, filterParentCategory, filterSubCategory, filterColor, filterNewOnly, sortKey, sortDir]);

  const displayProducts = useMemo(
    () =>
      filtered.map((p) => ({
        ...p,
        computed_model_number:
          p.product_number
            ? `${p.product_number}${p.size ? `-${p.size}` : ""}`
            : "—",
        computed_price_without_tax:
          p.price_with_tax != null
            ? Math.round(p.price_with_tax / 1.1)
            : null,
      })),
    [filtered]
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleDelete = async (productId: string, productName: string) => {
    const { error } = await supabase.from("products").delete().eq("id", productId);
    if (error) {
      toast.error("削除に失敗しました");
      return;
    }
    toast.success(`${productName} を削除しました`);
    setEditingId(null);
    await refresh();
  };

  const SortableHead = ({ label, sortField, className }: { label: string; sortField: SortKey; className?: string }) => (
    <TableHead
      className={`whitespace-nowrap cursor-pointer select-none hover:bg-muted/80 ${className || ""}`}
      onClick={() => toggleSort(sortField)}
    >
      <span className="inline-flex items-center gap-1 justify-center">
        {label}
        {sortKey === sortField && (
          <ArrowUpDown className="h-3 w-3 text-primary" />
        )}
      </span>
    </TableHead>
  );

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">商品一覧</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} / {products.length} 商品
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CsvImportDialog onComplete={refresh} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const csv = exportProductsToCSV(products);
              downloadCSV(csv, `products_${new Date().toISOString().slice(0, 10)}.csv`);
            }}
          >
            <Download className="h-4 w-4 mr-1" />
            CSV出力
          </Button>
          <Button size="sm" onClick={() => navigate("/products/add")}>
            <Plus className="h-4 w-4 mr-1" />
            追加
          </Button>
        </div>
      </div>

      {/* Search + Filter toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="商品名・型番・JANコードで検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant={showFilters ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFilters((v) => !v)}
          className="relative"
        >
          <Filter className="h-4 w-4 mr-1" />
          絞り込み
          {activeFilterCount > 0 && (
            <Badge className="ml-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">フィルタ</p>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                <X className="h-3 w-3 mr-1" />
                クリア
              </Button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">親カテゴリ</label>
              <Select value={filterParentCategory} onValueChange={setFilterParentCategory}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="__all__">すべて</SelectItem>
                  {uniqueValues.parentCategories.map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">子カテゴリ</label>
              <Select value={filterSubCategory} onValueChange={setFilterSubCategory}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="__all__">すべて</SelectItem>
                  {uniqueValues.subCategories.map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">カラー</label>
              <Select value={filterColor} onValueChange={setFilterColor}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="__all__">すべて</SelectItem>
                  {uniqueValues.colors.map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox
                  checked={filterNewOnly}
                  onCheckedChange={(checked) => setFilterNewOnly(checked === true)}
                  className="rounded"
                />
                新商品のみ
              </label>
            </div>
          </div>
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
        <div className="rounded-lg border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="whitespace-nowrap w-[50px]"></TableHead>
                <SortableHead label="商品番号" sortField="product_number" className="min-w-[80px] text-center" />
                <TableHead className="whitespace-nowrap min-w-[100px] text-center">商品型番</TableHead>
                <SortableHead label="商品名" sortField="name" className="min-w-[120px]" />
                <TableHead className="whitespace-nowrap min-w-[80px] text-center">カタログページ</TableHead>
                <TableHead className="whitespace-nowrap min-w-[80px] text-center">親カテゴリ</TableHead>
                <TableHead className="whitespace-nowrap min-w-[80px] text-center">子カテゴリ</TableHead>
                <TableHead className="whitespace-nowrap min-w-[60px] text-center">カラー</TableHead>
                <SortableHead label="JANコード" sortField="barcode" className="min-w-[120px]" />
                <SortableHead label="上代(税込)" sortField="price_with_tax" className="min-w-[90px] text-center" />
                <TableHead className="whitespace-nowrap min-w-[90px] text-center">上代(税抜)</TableHead>
                <TableHead className="whitespace-nowrap min-w-[60px] text-center">サイズ</TableHead>
                <TableHead className="whitespace-nowrap min-w-[60px] text-center">新商品</TableHead>
                <TableHead className="whitespace-nowrap min-w-[80px] text-center">商品ページ</TableHead>
                <TableHead className="whitespace-nowrap min-w-[50px] text-center">削除</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayProducts.map((product) =>
                editingId === product.id ? (
                  <InlineProductEditRow
                    key={product.id}
                    product={product}
                    onSave={async () => { setEditingId(null); await refresh(); }}
                    onCancel={() => setEditingId(null)}
                    onDelete={async () => handleDelete(product.id, product.name)}
                  />
                ) : (
                <TableRow
                  key={product.id}
                  className={`hover:bg-muted/50 ${product.is_new ? "bg-yellow-50 dark:bg-yellow-950/30" : ""}`}
                >
                  <TableCell className="whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setEditingId(product.id)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-center">
                    {product.product_number || "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm font-mono text-center">
                    {product.computed_model_number}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm font-medium">
                    {product.name}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-center">
                    {product.catalog_page || "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-center">
                    {product.parent_category || "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-center">
                    {product.sub_category || "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-center">
                    {product.color || "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm font-mono">
                    {product.barcode}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-center">
                    {product.price_with_tax != null
                      ? `¥${product.price_with_tax.toLocaleString()}`
                      : "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-center">
                    {product.computed_price_without_tax != null
                      ? `¥${product.computed_price_without_tax.toLocaleString()}`
                      : "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-center">
                    {product.size || "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox checked={product.is_new} disabled className="pointer-events-none rounded" />
                  </TableCell>
                  <TableCell className="text-center">
                    {product.product_number ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        asChild
                      >
                        <a
                          href={`https://b-five.jp/personal/?action_goods_new=true&goods_no=${encodeURIComponent(product.product_number)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          商品ページ
                        </a>
                      </Button>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditingId(product.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
