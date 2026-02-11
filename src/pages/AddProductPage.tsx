import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function AddProductPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [stock, setStock] = useState("0");
  const [category, setCategory] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !barcode.trim()) {
      toast({ title: "エラー", description: "商品名とJANコードは必須です", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("products").insert({
      name: name.trim(),
      barcode: barcode.trim(),
      stock: Math.max(0, parseInt(stock) || 0),
      category: category.trim() || null,
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

  return (
    <div className="flex flex-col gap-6 p-4 pb-24">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">商品登録</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="space-y-2">
          <Label htmlFor="name">商品名 *</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="例: 六角ボルト M8" maxLength={100} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="barcode">JANコード *</Label>
          <Input id="barcode" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="例: 4901234567890" maxLength={50} inputMode="numeric" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="stock">初期在庫数</Label>
          <Input id="stock" type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">カテゴリ</Label>
          <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="例: ボルト・ナット" maxLength={50} />
        </div>

        <Button type="submit" className="mt-2" disabled={loading}>
          {loading ? "登録中..." : "商品を登録"}
        </Button>
      </form>
    </div>
  );
}
