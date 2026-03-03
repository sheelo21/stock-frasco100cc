import { useNavigate } from "react-router-dom";
import { Pencil } from "lucide-react";

interface DisplayProduct {
  id: string;
  name: string;
  barcode: string;
  stock: number;
  parent_category: string | null;
  color: string | null;
  computed_model_number: string;
}

export default function InventoryMobileCard({ product }: { product: DisplayProduct }) {
  const navigate = useNavigate();

  return (
    <div
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
  );
}
