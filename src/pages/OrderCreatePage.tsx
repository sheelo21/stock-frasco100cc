import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import type { Product } from "@/hooks/use-inventory";

interface ClientOption {
  user_id: string;
  display_name: string | null;
  discount_rate: number | null;
}

function formatRate(rate: number): string {
  const display = rate * 10;
  return `${display % 1 === 0 ? display.toFixed(0) : display}掛け`;
}

export default function OrderCreatePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const selectedProducts: Product[] = location.state?.products || [];

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [companyName, setCompanyName] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [discountRate, setDiscountRate] = useState("0.6");
  const [shippingCost, setShippingCost] = useState("0");
  const [docType, setDocType] = useState<"発注書" | "納品書">("発注書");

  useEffect(() => {
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "client");
      if (!roles?.length) return;
      const clientIds = roles.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, discount_rate")
        .in("user_id", clientIds);
      setClients((profiles as any) || []);
    })();
  }, []);

  const handleClientSelect = (userId: string) => {
    setSelectedClient(userId);
    const client = clients.find((c) => c.user_id === userId);
    if (client) {
      setCompanyName(client.display_name || "");
      if (client.discount_rate != null) {
        setDiscountRate(String(client.discount_rate));
      }
    }
  };
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(selectedProducts.map((p) => [p.id, 1]))
  );
  const [saving, setSaving] = useState(false);

  const rate = parseFloat(discountRate) || 0;
  const shipping = parseInt(shippingCost) || 0;

  const items = useMemo(() => {
    return selectedProducts.map((p) => {
      const priceWithTax = p.price_with_tax ?? 0;
      const priceWithoutTax = p.price_without_tax ?? Math.round(priceWithTax / 1.1);
      const discountedWithTax = Math.round(priceWithTax * rate);
      const discountedWithoutTax = Math.round(priceWithoutTax * rate);
      const qty = quantities[p.id] || 0;
      const subtotal = discountedWithTax * qty;
      return {
        product: p,
        priceWithTax,
        priceWithoutTax,
        discountedWithTax,
        discountedWithoutTax,
        qty,
        subtotal,
      };
    });
  }, [selectedProducts, rate, quantities]);

  const subtotalSum = items.reduce((s, i) => s + i.subtotal, 0);
  const grandTotal = subtotalSum + shipping;

  const handleSave = async () => {
    if (!user) return;
    if (!companyName.trim()) {
      toast.error("会社名を入力してください");
      return;
    }
    setSaving(true);
    try {
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          company_name: companyName,
          order_date: orderDate,
          discount_rate: parseFloat(discountRate),
          shipping_cost: shipping,
          total_amount: grandTotal,
          doc_type: docType,
          status: docType === "発注書" ? "発注済" : "納品済",
        })
        .select()
        .single();

      if (orderErr || !order) throw orderErr;

      const orderItems = items.map((i) => ({
        order_id: order.id,
        product_id: i.product.id,
        model_number: i.product.model_number || "",
        product_name: i.product.name,
        color: i.product.color || "",
        size: i.product.size || "",
        price_with_tax: i.priceWithTax,
        price_without_tax: i.priceWithoutTax,
        discounted_price_with_tax: i.discountedWithTax,
        discounted_price_without_tax: i.discountedWithoutTax,
        quantity: i.qty,
        subtotal: i.subtotal,
      }));

      const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
      if (itemsErr) throw itemsErr;

      toast.success(`${docType}を保存しました`);
      navigate("/orders");
    } catch (e) {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (selectedProducts.length === 0) {
    return (
      <div className="p-4 pb-24 text-center">
        <p className="text-muted-foreground">商品が選択されていません</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>
          商品一覧に戻る
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">{docType}作成</h1>
      </div>

      {/* Basic info */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        {clients.length > 0 && (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">クライアント選択（自動入力）</label>
            <Select value={selectedClient} onValueChange={handleClientSelect}>
              <SelectTrigger>
                <SelectValue placeholder="クライアントを選択..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.user_id} value={c.user_id}>
                    {c.display_name || "不明"}{c.discount_rate != null ? ` (${formatRate(c.discount_rate)})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">書類種別</label>
            <Select value={docType} onValueChange={(v) => setDocType(v as any)}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="発注書">発注書</SelectItem>
                <SelectItem value="納品書">納品書</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">会社名</label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="株式会社〇〇" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">発行日付</label>
            <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">掛率</label>
            <div className="flex items-center gap-2">
              <Input type="number" step="0.01" min="0" max="1" value={discountRate} onChange={(e) => setDiscountRate(e.target.value)} />
              <span className="text-xs text-muted-foreground whitespace-nowrap">{rate > 0 ? formatRate(rate) : ""}</span>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">送料(税込)</label>
            <Input type="number" min="0" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Items table */}
      <div className="rounded-lg border border-border overflow-auto">
        <Table className="text-xs">
          <TableHeader>
            <TableRow className="bg-muted">
              <TableHead className="whitespace-nowrap">商品型番</TableHead>
              <TableHead className="whitespace-nowrap">商品名</TableHead>
              <TableHead className="whitespace-nowrap">カラー</TableHead>
              <TableHead className="whitespace-nowrap">サイズ</TableHead>
              <TableHead className="whitespace-nowrap text-right">上代(税込)</TableHead>
              <TableHead className="whitespace-nowrap text-right">上代(税抜)</TableHead>
              <TableHead className="whitespace-nowrap text-right">下代(税込)</TableHead>
              <TableHead className="whitespace-nowrap text-right">下代(税抜)</TableHead>
              <TableHead className="whitespace-nowrap text-center w-20">数量</TableHead>
              <TableHead className="whitespace-nowrap text-right">小計(税込)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.product.id}>
                <TableCell className="whitespace-nowrap font-mono">{item.product.model_number || "—"}</TableCell>
                <TableCell className="whitespace-nowrap">{item.product.name}</TableCell>
                <TableCell className="whitespace-nowrap">{item.product.color || "—"}</TableCell>
                <TableCell className="whitespace-nowrap">{item.product.size || "—"}</TableCell>
                <TableCell className="text-right">¥{item.priceWithTax.toLocaleString()}</TableCell>
                <TableCell className="text-right">¥{item.priceWithoutTax.toLocaleString()}</TableCell>
                <TableCell className="text-right">¥{item.discountedWithTax.toLocaleString()}</TableCell>
                <TableCell className="text-right">¥{item.discountedWithoutTax.toLocaleString()}</TableCell>
                <TableCell className="text-center">
                  <Input
                    type="number"
                    min={0}
                    value={quantities[item.product.id] || 0}
                    onChange={(e) =>
                      setQuantities((q) => ({ ...q, [item.product.id]: parseInt(e.target.value) || 0 }))
                    }
                    className="h-7 w-16 text-center text-xs mx-auto"
                  />
                </TableCell>
                <TableCell className="text-right font-medium">¥{item.subtotal.toLocaleString()}</TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/50">
              <TableCell colSpan={9} className="text-right font-medium">送料(税込)</TableCell>
              <TableCell className="text-right font-medium">¥{shipping.toLocaleString()}</TableCell>
            </TableRow>
            <TableRow className="bg-muted font-bold">
              <TableCell colSpan={9} className="text-right text-sm">総計(税込)</TableCell>
              <TableCell className="text-right text-sm">¥{grandTotal.toLocaleString()}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="min-w-[120px]">
          {saving ? "保存中..." : `${docType}を保存`}
        </Button>
      </div>
    </div>
  );
}
