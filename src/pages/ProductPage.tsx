import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StockControls from "@/components/StockControls";
import { useInventory } from "@/hooks/use-inventory";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, addStock, removeStock, setStockValue, loading, refresh } =
    useInventory();

  const product = products.find((p) => p.id === id);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBarcode, setEditBarcode] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    if (!product) return;
    setEditName(product.name);
    setEditBarcode(product.barcode);
    setEditCategory(product.category || "");
    setEditing(true);
  };

  const handleSave = async () => {
    if (!product || !editName.trim() || !editBarcode.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("products")
      .update({
        name: editName.trim(),
        barcode: editBarcode.trim(),
        category: editCategory.trim() || null,
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

  const handleDelete = async () => {
    if (!product) return;
    const { error } = await supabase.from("products").delete().eq("id", product.id);
    if (error) {
      toast.error("削除に失敗しました");
      return;
    }
    toast.success(`${product.name} を削除しました`);
    navigate("/products", { replace: true });
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

  const stockStatus =
    product.stock <= 5
      ? "low"
      : product.stock <= 20
      ? "medium"
      : "good";

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
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
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={startEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Trash2 className="h-4 w-4 text-destructive" />
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
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  削除する
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {editing ? (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-muted-foreground">商品編集</h3>
          <div className="space-y-2">
            <Label htmlFor="edit-name">商品名 *</Label>
            <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={100} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-barcode">JANコード *</Label>
            <Input id="edit-barcode" value={editBarcode} onChange={(e) => setEditBarcode(e.target.value)} maxLength={50} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-category">カテゴリ</Label>
            <Input id="edit-category" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} maxLength={50} />
          </div>
          <div className="flex gap-2">
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
              <p className="text-xs text-muted-foreground">{product.category}</p>
              <h2 className="text-lg font-bold text-foreground leading-tight">
                {product.name}
              </h2>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                JAN: {product.barcode}
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-end justify-between rounded-lg bg-muted p-4">
            <div>
              <p className="text-xs text-muted-foreground">現在の在庫数</p>
              <p className="text-4xl font-bold text-foreground">
                {product.stock}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                stockStatus === "low"
                  ? "bg-destructive/10 text-destructive"
                  : stockStatus === "medium"
                  ? "bg-warning/10 text-warning"
                  : "bg-success/10 text-success"
              }`}
            >
              {stockStatus === "low"
                ? "在庫少"
                : stockStatus === "medium"
                ? "注意"
                : "十分"}
            </span>
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