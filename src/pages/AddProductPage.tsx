import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDropdownOptions, type OptionType } from "@/hooks/use-dropdown-options";

export default function AddProductPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { getOptionsByType, loading: optionsLoading } = useDropdownOptions();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState(searchParams.get("barcode") || "");
  const [stock, setStock] = useState("0");
  const [productNumber, setProductNumber] = useState("");
  const [catalogPage, setCatalogPage] = useState("");
  const [parentCategory, setParentCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [priceWithTax, setPriceWithTax] = useState("");
  const [isNew, setIsNew] = useState(false);

  // Auto-compute
  const computedModelNumber = productNumber
    ? `${productNumber}${size ? `-${size}` : ""}`
    : "";
  const computedPriceWithoutTax = priceWithTax
    ? Math.round(parseInt(priceWithTax) / 1.1)
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !barcode.trim()) {
      toast({ title: "エラー", description: "商品名とJANコードは必須です", variant: "destructive" });
      return;
    }

    const taxIncluded = priceWithTax ? parseInt(priceWithTax) || null : null;

    setLoading(true);
    const { error } = await supabase.from("products").insert({
      name: name.trim(),
      barcode: barcode.trim(),
      stock: Math.max(0, parseInt(stock) || 0),
      product_number: productNumber.trim() || null,
      model_number: computedModelNumber || null,
      catalog_page: catalogPage.trim() || null,
      parent_category: parentCategory || null,
      sub_category: subCategory || null,
      color: color || null,
      size: size || null,
      price_with_tax: taxIncluded,
      price_without_tax: taxIncluded ? Math.round(taxIncluded / 1.1) : null,
      is_new: isNew,
    });
    setLoading(false);

    if (error) {
      toast({
        title: "登録エラー",
        description: error.code === "23505" ? "このJANコードは既に登録されています" : error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "登録完了", description: `${name} を登録しました` });
    navigate("/products");
  };

  function DropdownField({
    label,
    type,
    value,
    onChange,
  }: {
    label: string;
    type: OptionType;
    value: string;
    onChange: (v: string) => void;
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

  return (
    <div className="flex flex-col gap-6 p-4 pb-24 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">商品登録</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="product-number">商品番号</Label>
            <Input
              id="product-number"
              value={productNumber}
              onChange={(e) => setProductNumber(e.target.value)}
              placeholder="例: 12345"
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label>商品型番（自動計算）</Label>
            <Input
              value={computedModelNumber || "—"}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">商品名 *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: Tシャツ"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="catalog-page">カタログページ</Label>
            <Input
              id="catalog-page"
              value={catalogPage}
              onChange={(e) => setCatalogPage(e.target.value)}
              placeholder="例: P.12"
              maxLength={20}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="barcode">JANコード *</Label>
            <Input
              id="barcode"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="例: 4901234567890"
              maxLength={50}
              inputMode="numeric"
            />
          </div>

          <DropdownField
            label="親カテゴリ"
            type="parent_category"
            value={parentCategory}
            onChange={setParentCategory}
          />
          <DropdownField
            label="子カテゴリ"
            type="sub_category"
            value={subCategory}
            onChange={setSubCategory}
          />
          <DropdownField
            label="カラー"
            type="color"
            value={color}
            onChange={setColor}
          />
          <DropdownField
            label="サイズ"
            type="size"
            value={size}
            onChange={setSize}
          />

          <div className="space-y-2">
            <Label htmlFor="price-with-tax">上代（税込）</Label>
            <Input
              id="price-with-tax"
              type="number"
              min="0"
              value={priceWithTax}
              onChange={(e) => setPriceWithTax(e.target.value)}
              placeholder="例: 3300"
              inputMode="numeric"
            />
          </div>

          <div className="space-y-2">
            <Label>上代（税抜）自動計算</Label>
            <Input
              value={
                computedPriceWithoutTax != null
                  ? `¥${computedPriceWithoutTax.toLocaleString()}`
                  : "—"
              }
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stock">初期在庫数</Label>
            <Input
              id="stock"
              type="number"
              min="0"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 pt-6">
            <Checkbox
              id="is-new"
              checked={isNew}
              onCheckedChange={(checked) => setIsNew(checked === true)}
            />
            <Label htmlFor="is-new" className="cursor-pointer">新商品</Label>
          </div>
        </div>

        <Button type="submit" className="mt-2" disabled={loading}>
          {loading ? "登録中..." : "商品を登録"}
        </Button>
      </form>
    </div>
  );
}
