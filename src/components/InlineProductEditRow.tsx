import { useState } from "react";
import { Check, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useDropdownOptions, type OptionType } from "@/hooks/use-dropdown-options";
import { toast } from "sonner";
import type { Product } from "@/hooks/use-inventory";

interface InlineProductEditRowProps {
  product: Product & { computed_model_number: string; computed_price_without_tax: number | null };
  onSave: () => Promise<void>;
  onCancel: () => void;
  onDelete: () => Promise<void>;
}

export default function InlineProductEditRow({ product, onSave, onCancel, onDelete }: InlineProductEditRowProps) {
  const { getOptionsByType } = useDropdownOptions();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(product.name);
  const [barcode, setBarcode] = useState(product.barcode);
  const [productNumber, setProductNumber] = useState(product.product_number || "");
  const [catalogPage, setCatalogPage] = useState(product.catalog_page || "");
  const [parentCategory, setParentCategory] = useState(product.parent_category || "");
  const [subCategory, setSubCategory] = useState(product.sub_category || "");
  const [color, setColor] = useState(product.color || "");
  const [size, setSize] = useState(product.size || "");
  const [priceWithTax, setPriceWithTax] = useState(product.price_with_tax?.toString() || "");
  const [isNew, setIsNew] = useState(product.is_new ?? false);

  const modelNumber = productNumber ? `${productNumber}${size ? `-${size}` : ""}` : "—";
  const priceWithoutTax = priceWithTax ? Math.round(parseInt(priceWithTax) / 1.1) : null;

  const handleSave = async () => {
    if (!name.trim() || !barcode.trim()) return;
    setSaving(true);
    const taxIncluded = priceWithTax ? parseInt(priceWithTax) || null : null;
    const { error } = await supabase
      .from("products")
      .update({
        name: name.trim(),
        barcode: barcode.trim(),
        product_number: productNumber.trim() || null,
        model_number: modelNumber === "—" ? null : modelNumber,
        catalog_page: catalogPage.trim() || null,
        parent_category: parentCategory || null,
        sub_category: subCategory || null,
        color: color || null,
        size: size || null,
        price_with_tax: taxIncluded,
        price_without_tax: taxIncluded ? Math.round(taxIncluded / 1.1) : null,
        is_new: isNew,
      })
      .eq("id", product.id);
    setSaving(false);
    if (error) {
      toast.error(error.code === "23505" ? "このJANコードは既に使われています" : error.message);
      return;
    }
    toast.success("商品情報を更新しました");
    await onSave();
  };

  const DropdownCell = ({ type, value, onChange }: { type: OptionType; value: string; onChange: (v: string) => void }) => {
    const items = getOptionsByType(type);
    return (
      <Select value={value || "__none__"} onValueChange={(v) => onChange(v === "__none__" ? "" : v)}>
        <SelectTrigger className="h-8 text-xs min-w-[80px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover z-50">
          <SelectItem value="__none__">—</SelectItem>
          {items.map((item) => (
            <SelectItem key={item.id} value={item.value}>{item.value}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  return (
    <TableRow className="bg-primary/5">
      <TableCell className="whitespace-nowrap">
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSave} disabled={saving || !name.trim() || !barcode.trim()}>
            <Check className="h-3.5 w-3.5 text-success" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}>
            <X className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </TableCell>
      <TableCell className="text-center">
        {/* empty - product page link not applicable in edit mode */}
      </TableCell>
      <TableCell className="text-center">
        <Checkbox checked={isNew} onCheckedChange={(c) => setIsNew(c === true)} className="rounded" />
      </TableCell>
      <TableCell className="text-center">
        <Input value={productNumber} onChange={(e) => setProductNumber(e.target.value)} className="h-8 text-xs w-20" />
      </TableCell>
      <TableCell className="whitespace-nowrap text-xs font-mono text-center">
        {modelNumber}
      </TableCell>
      <TableCell>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-xs min-w-[100px]" />
      </TableCell>
      <TableCell className="text-center">
        <Input value={catalogPage} onChange={(e) => setCatalogPage(e.target.value)} className="h-8 text-xs w-16" />
      </TableCell>
      <TableCell className="text-center">
        <DropdownCell type="parent_category" value={parentCategory} onChange={setParentCategory} />
      </TableCell>
      <TableCell className="text-center">
        <DropdownCell type="sub_category" value={subCategory} onChange={setSubCategory} />
      </TableCell>
      <TableCell className="text-center">
        <DropdownCell type="color" value={color} onChange={setColor} />
      </TableCell>
      <TableCell>
        <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} className="h-8 text-xs font-mono w-28" />
      </TableCell>
      <TableCell className="text-center">
        <Input type="number" min="0" value={priceWithTax} onChange={(e) => setPriceWithTax(e.target.value)} className="h-8 text-xs text-center w-20" />
      </TableCell>
      <TableCell className="whitespace-nowrap text-xs text-center">
        {priceWithoutTax != null ? `¥${priceWithoutTax.toLocaleString()}` : "—"}
      </TableCell>
      <TableCell className="text-center">
        <DropdownCell type="size" value={size} onChange={(v) => setSize(v)} />
      </TableCell>
      <TableCell className="text-center">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>商品を削除しますか？</AlertDialogTitle>
              <AlertDialogDescription>
                「{product.name}」を削除します。この操作は取り消せません。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                削除する
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
}
