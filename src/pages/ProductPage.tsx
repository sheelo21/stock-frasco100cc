import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import StockControls from "@/components/StockControls";
import { useInventory } from "@/hooks/use-inventory";
import { useDropdownOptions, type OptionType } from "@/hooks/use-dropdown-options";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function DropdownField({
  label,
  type,
  value,
  onChange,
  getOptionsByType,
}: {
  label: string;
  type: OptionType;
  value: string;
  onChange: (v: string) => void;
  getOptionsByType: (type: OptionType) => { id: string; value: string }[];
}) {
  const items = getOptionsByType(type);
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="選択..." />
        </SelectTrigger>
        <SelectContent className="bg-popover z-50">
          {items.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              設定画面から追加してください
            </div>
          ) : (
            items.map((item) => (
              <SelectItem key={item.id} value={item.value}>
                {item.value}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, addStock, removeStock, setStockValue, loading, refresh } =
    useInventory();
  const { getOptionsByType } = useDropdownOptions();

  const product = products.find((p) => p.id === id);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBarcode, setEditBarcode] = useState("");
  const [editProductNumber, setEditProductNumber] = useState("");
  const [editCatalogPage, setEditCatalogPage] = useState("");
  const [editParentCategory, setEditParentCategory] = useState("");
  const [editSubCategory, setEditSubCategory] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editSize, setEditSize] = useState("");
  const [editPriceWithTax, setEditPriceWithTax] = useState("");
  const [editIsNew, setEditIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const editModelNumber = editProductNumber
    ? `${editProductNumber}${editSize ? `-${editSize}` : ""}`
    : "";
  const editPriceWithoutTax = editPriceWithTax
    ? Math.round(parseInt(editPriceWithTax) / 1.1)
    : null;

  const startEdit = () => {
    if (!product) return;
    setEditName(product.name);
    setEditBarcode(product.barcode);
    setEditProductNumber(product.product_number || "");
    setEditCatalogPage(product.catalog_page || "");
    setEditParentCategory(product.parent_category || "");
    setEditSubCategory(product.sub_category || "");
    setEditColor(product.color || "");
    setEditSize(product.size || "");
    setEditPriceWithTax(product.price_with_tax?.toString() || "");
    setEditIsNew(product.is_new ?? false);
    setEditing(true);
  };

  const handleSave = async () => {
    if (!product || !editName.trim() || !editBarcode.trim()) return;
    setSaving(true);
    const taxIncluded = editPriceWithTax ? parseInt(editPriceWithTax) || null : null;
    const { error } = await supabase
      .from("products")
      .update({
        name: editName.trim(),
        barcode: editBarcode.trim(),
        product_number: editProductNumber.trim() || null,
        model_number: editModelNumber || null,
        catalog_page: editCatalogPage.trim() || null,
        parent_category: editParentCategory || null,
        sub_category: editSubCategory || null,
        color: editColor || null,
        size: editSize || null,
        price_with_tax: taxIncluded,
        price_without_tax: taxIncluded ? Math.round(taxIncluded / 1.1) : null,
        is_new: editIsNew,
      })
      .eq("id", product.id);
    setSaving(false);
    if (error) {
      toast.error(error.code === "23505" ? "このJANコードは既に使われています" : error.message);
      return;
    }
    toast.success("商品情報を更新しました");
    setEditing(false);
    await refresh();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 pb-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 pb-24">
        <Package className="h-16 w-16 text-muted-foreground" />
        <p className="text-lg font-medium text-muted-foreground">
          商品が見つかりません
        </p>
        <Button variant="outline" onClick={() => navigate("/")}>
          戻る
        </Button>
      </div>
    );
  }


  return (
    <div className="flex flex-col gap-4 p-4 pb-24 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit -ml-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          戻る
        </Button>
      </div>

      {editing ? (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-muted-foreground">商品編集</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>商品番号</Label>
              <Input value={editProductNumber} onChange={(e) => setEditProductNumber(e.target.value)} maxLength={50} />
            </div>
            <div className="space-y-2">
              <Label>商品型番（自動計算）</Label>
              <Input value={editModelNumber || "—"} disabled className="bg-muted" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>商品名 *</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label>カタログページ</Label>
              <Input value={editCatalogPage} onChange={(e) => setEditCatalogPage(e.target.value)} maxLength={20} />
            </div>
            <div className="space-y-2">
              <Label>JANコード *</Label>
              <Input value={editBarcode} onChange={(e) => setEditBarcode(e.target.value)} maxLength={50} />
            </div>
            <DropdownField label="親カテゴリ" type="parent_category" value={editParentCategory} onChange={setEditParentCategory} getOptionsByType={getOptionsByType} />
            <DropdownField label="子カテゴリ" type="sub_category" value={editSubCategory} onChange={setEditSubCategory} getOptionsByType={getOptionsByType} />
            <DropdownField label="カラー" type="color" value={editColor} onChange={setEditColor} getOptionsByType={getOptionsByType} />
            <DropdownField label="サイズ" type="size" value={editSize} onChange={setEditSize} getOptionsByType={getOptionsByType} />
            <div className="space-y-2">
              <Label>上代（税込）</Label>
              <Input type="number" min="0" value={editPriceWithTax} onChange={(e) => setEditPriceWithTax(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>上代（税抜）自動計算</Label>
              <Input
                value={editPriceWithoutTax != null ? `¥${editPriceWithoutTax.toLocaleString()}` : "—"}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="flex items-center gap-3 pt-4">
              <Checkbox id="edit-is-new" checked={editIsNew} onCheckedChange={(c) => setEditIsNew(c === true)} />
              <Label htmlFor="edit-is-new" className="cursor-pointer">新商品</Label>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setEditing(false)}>キャンセル</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving || !editName.trim() || !editBarcode.trim()}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="h-20 w-20 flex-shrink-0 rounded-lg bg-muted flex items-center justify-center">
              <Package className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">{product.parent_category} {product.sub_category && `> ${product.sub_category}`}</p>
              <h2 className="text-lg font-bold text-foreground leading-tight">
                {product.name}
              </h2>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                JAN: {product.barcode}
              </p>
              {product.product_number && (
                <p className="text-xs text-muted-foreground">
                  型番: {product.product_number}{product.size ? `-${product.size}` : ""}
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 rounded-lg bg-muted p-4">
            <p className="text-xs text-muted-foreground">現在の在庫数</p>
            <p className="text-4xl font-bold text-foreground">
              {product.stock}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
          在庫操作
        </h3>
        <StockControls
          product={product}
          onAdd={async () => {
            const ok = await addStock(product.id);
            if (ok) toast.success("入庫しました (+1)");
          }}
          onRemove={async () => {
            const ok = await removeStock(product.id);
            if (ok) toast.success("出庫しました (-1)");
            else toast.error("在庫が不足しています");
          }}
          onSetStock={async (val) => {
            const ok = await setStockValue(product.id, val);
            if (ok) toast.success(`在庫を ${val} に更新しました`);
          }}
        />
      </div>
    </div>
  );
}
