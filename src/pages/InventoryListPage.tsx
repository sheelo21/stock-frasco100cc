import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, ArrowUpDown, Download, Upload, Scan, ClipboardList, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import InventoryFilterPanel from "@/components/inventory/InventoryFilterPanel";
import InventoryDesktopTable from "@/components/inventory/InventoryDesktopTable";
import InventoryMobileCard from "@/components/inventory/InventoryMobileCard";

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
              <Button variant="outline" size="sm" className="h-8 px-2.5" onClick={() => navigate("/history")}>
                <ClipboardList className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 px-2.5">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover">
                  <CsvImportDialog onComplete={refresh} trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Upload className="h-4 w-4 mr-2" />
                      CSV取込
                    </DropdownMenuItem>
                  } />
                  <DropdownMenuItem onSelect={() => {
                    const csv = exportProductsToCSV(products);
                    downloadCSV(csv, `products_${new Date().toISOString().slice(0, 10)}.csv`);
                  }}>
                    <Download className="h-4 w-4 mr-2" />
                    CSV出力
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
        <InventoryFilterPanel
          uniqueValues={uniqueValues}
          filterParentCategory={filterParentCategory}
          setFilterParentCategory={setFilterParentCategory}
          filterSubCategory={filterSubCategory}
          setFilterSubCategory={setFilterSubCategory}
          filterColor={filterColor}
          setFilterColor={setFilterColor}
          activeFilterCount={activeFilterCount}
          clearFilters={clearFilters}
        />
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
        <div className="space-y-2">
          {displayProducts.map((product) => (
            <InventoryMobileCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <InventoryDesktopTable
          products={displayProducts}
          sortKey={sortKey}
          sortDir={sortDir}
          toggleSort={toggleSort}
        />
      )}
    </div>
  );
}
