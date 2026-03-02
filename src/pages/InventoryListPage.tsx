import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, ArrowUpDown, X, Download, Upload, Scan, ClipboardList, Pencil, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useInventory } from "@/hooks/use-inventory";
import { useIsMobile } from "@/hooks/use-mobile";
import { exportProductsToCSV, downloadCSV } from "@/lib/csv-utils";
import CsvImportDialog from "@/components/CsvImportDialog";

type SortKey = "name" | "product_number" | "stock" | "barcode";
type SortDir = "asc" | "desc";

export default function InventoryListPage() {
  const { products, loading, refresh } = useInventory();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterParentCategory, setFilterParentCategory] = useState<string>("__all__");
  const [filterSubCategory, setFilterSubCategory] = useState<string>("__all__");
  const [filterColor, setFilterColor] = useState<string>("__all__");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

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
    return count;
  }, [filterParentCategory, filterSubCategory, filterColor]);

  const clearFilters = () => {
    setFilterParentCategory("__all__");
    setFilterSubCategory("__all__");
    setFilterColor("__all__");
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

    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name, "ja");
          break;
        case "product_number":
          cmp = (a.product_number || "").localeCompare(b.product_number || "", "ja");
          break;
        case "stock":
          cmp = a.stock - b.stock;
          break;
        case "barcode":
          cmp = a.barcode.localeCompare(b.barcode);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [products, search, filterParentCategory, filterSubCategory, filterColor, sortKey, sortDir]);

  const displayProducts = useMemo(
    () =>
      filtered.map((p) => ({
        ...p,
        computed_model_number:
          p.product_number
            ? `${p.product_number}${p.size ? `-${p.size}` : ""}`
            : "—",
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
    <div className="flex flex-col gap-3 p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">在庫一覧</h1>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isMobile ? (
            <>
              <Button variant="outline" size="sm" className="h-8 px-2.5" onClick={() => navigate("/scan")}>
                <Scan className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 px-2.5">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover">
                  <DropdownMenuItem onSelect={() => navigate("/history")}>
                    <ClipboardList className="h-4 w-4 mr-2" />
                    履歴
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => {
                    const csv = exportProductsToCSV(products);
                    downloadCSV(csv, `products_${new Date().toISOString().slice(0, 10)}.csv`);
                  }}>
                    <Download className="h-4 w-4 mr-2" />
                    CSV出力
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <CsvImportDialog onComplete={refresh} />
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => navigate("/scan")}>
                <Scan className="h-4 w-4 mr-1" />
                スキャン
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/history")}>
                <ClipboardList className="h-4 w-4 mr-1" />
                履歴
              </Button>
              <CsvImportDialog onComplete={refresh} />
              <Button variant="outline" size="sm" onClick={() => {
                const csv = exportProductsToCSV(products);
                downloadCSV(csv, `products_${new Date().toISOString().slice(0, 10)}.csv`);
              }}>
                <Download className="h-4 w-4 mr-1" />
                CSV出力
              </Button>
            </>
          )}
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
            className="pl-9 h-9"
          />
        </div>
        <Button
          variant={showFilters ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFilters((v) => !v)}
          className="relative h-9"
        >
          <Filter className="h-4 w-4" />
          {!isMobile && <span className="ml-1">絞り込み</span>}
          {activeFilterCount > 0 && (
            <Badge className="ml-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="rounded-lg border border-border bg-card p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">フィルタ</p>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                <X className="h-3 w-3 mr-1" />
                クリア
              </Button>
            )}
          </div>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">親カテゴリ</label>
              <Select value={filterParentCategory} onValueChange={setFilterParentCategory}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="__all__">すべて</SelectItem>
                  {uniqueValues.parentCategories.map((v) => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">子カテゴリ</label>
              <Select value={filterSubCategory} onValueChange={setFilterSubCategory}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="__all__">すべて</SelectItem>
                  {uniqueValues.subCategories.map((v) => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">カラー</label>
              <Select value={filterColor} onValueChange={setFilterColor}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="__all__">すべて</SelectItem>
                  {uniqueValues.colors.map((v) => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
                </SelectContent>
              </Select>
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
      ) : isMobile ? (
        /* Mobile card view */
        <div className="space-y-2">
          {displayProducts.map((product) => (
            <div
              key={product.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm active:bg-muted/50"
              onClick={() => navigate(`/product/${product.id}`)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{product.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  {[product.computed_model_number !== "—" && product.computed_model_number, product.parent_category, product.color].filter(Boolean).join(" / ")}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-bold text-foreground">{product.stock}</p>
                <p className="text-[10px] text-muted-foreground">在庫</p>
              </div>
              <Pencil className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
          ))}
        </div>
      ) : (
        /* Desktop table view */
        <div className="rounded-lg border border-border overflow-auto" style={{ maxHeight: "calc(100vh - 220px)" }}>
          <Table className="text-xs" style={{ minWidth: 1200 }}>
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="bg-muted">
                <TableHead className="w-10 bg-muted" />
                <SortableHead label="商品番号" sortField="product_number" className="min-w-[80px] text-center bg-muted" />
                <TableHead className="whitespace-nowrap min-w-[100px] text-center bg-muted">商品型番</TableHead>
                <SortableHead label="商品名" sortField="name" className="min-w-[120px] bg-muted" />
                <TableHead className="whitespace-nowrap min-w-[80px] text-center bg-muted">親カテゴリ</TableHead>
                <TableHead className="whitespace-nowrap min-w-[80px] text-center bg-muted">子カテゴリ</TableHead>
                <TableHead className="whitespace-nowrap min-w-[60px] text-center bg-muted">カラー</TableHead>
                <SortableHead label="JANコード" sortField="barcode" className="min-w-[120px] bg-muted" />
                <SortableHead label="在庫数" sortField="stock" className="min-w-[70px] text-center bg-muted" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayProducts.map((product) => (
                <TableRow key={product.id} className="hover:bg-muted/50">
                  <TableCell className="w-10 p-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/product/${product.id}`)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-center">{product.product_number || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-center">{product.computed_model_number}</TableCell>
                  <TableCell className="whitespace-nowrap font-medium">{product.name}</TableCell>
                  <TableCell className="whitespace-nowrap text-center">{product.parent_category || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-center">{product.sub_category || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-center">{product.color || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono">{product.barcode}</TableCell>
                  <TableCell className="whitespace-nowrap text-center font-bold">{product.stock}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
