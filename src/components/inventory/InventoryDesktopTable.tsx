import { useNavigate } from "react-router-dom";
import { Pencil, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SortKey = "name" | "product_number" | "stock" | "barcode";
type SortDir = "asc" | "desc";

interface DisplayProduct {
  id: string;
  name: string;
  barcode: string;
  stock: number;
  product_number: string | null;
  parent_category: string | null;
  sub_category: string | null;
  color: string | null;
  computed_model_number: string;
}

interface InventoryDesktopTableProps {
  products: DisplayProduct[];
  sortKey: SortKey;
  sortDir: SortDir;
  toggleSort: (key: SortKey) => void;
}

export default function InventoryDesktopTable({ products, sortKey, sortDir, toggleSort }: InventoryDesktopTableProps) {
  const navigate = useNavigate();

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
          {products.map((product) => (
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
  );
}
