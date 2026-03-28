import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
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
  const printRef = useRef<HTMLDivElement>(null);

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [companyName, setCompanyName] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [discountRate, setDiscountRate] = useState("0.6");
  const [shippingCost, setShippingCost] = useState("0");
  const [docType, setDocType] = useState<"発注書" | "納品書">("発注書");
  const [orderNumber, setOrderNumber] = useState("");

  // Generate order number on component mount
  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const prefix = docType === "発注書" ? "PO" : "DL";
    setOrderNumber(`${prefix}-${year}${month}${day}-${random}`);
  }, [docType]);

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

  const handlePrint = () => {
    window.print();
  };

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
          order_number: orderNumber,
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
    <>
    <div className="flex flex-col gap-4 p-4 pb-24 print:hidden">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground flex-1">{docType}作成</h1>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-1" />
          印刷
        </Button>
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

    {/* Print view */}
    <div ref={printRef} className="hidden print:block print-area">
      <div className="p-8 font-sans text-sm" style={{ fontFamily: "'Noto Sans JP', sans-serif" }}>
        {/* Company Information Header */}
        <div className="company-info mb-6">
          <div className="text-sm space-y-1">
            <p className="company-name">株式会社フラスコ100cc</p>
            <p>〒110-1105</p>
            <p>東京都台東区東上野3-3-13 プラチナ第2ビル3階</p>
            <p>03-6806-6531</p>
          </div>
        </div>

        <div className="document-header">
          <div>
            <h1>{docType}</h1>
            <p className="order-number">No. {orderNumber}</p>
            <p className="client-info">{companyName} 御中</p>
          </div>
          <div className="document-meta">
            <p>発行日: {orderDate}</p>
            <p>掛率: {rate > 0 ? formatRate(rate) : discountRate}</p>
          </div>
        </div>

        <table className="w-full border-collapse text-xs mb-4">
          <thead>
            <tr className="border-b-2 border-foreground">
              <th className="text-left py-1 px-1">商品型番</th>
              <th className="text-left py-1 px-1">商品名</th>
              <th className="text-left py-1 px-1">カラー</th>
              <th className="text-left py-1 px-1">サイズ</th>
              <th className="text-right py-1 px-1">上代(税込)</th>
              <th className="text-right py-1 px-1">上代(税抜)</th>
              <th className="text-right py-1 px-1">下代(税込)</th>
              <th className="text-right py-1 px-1">下代(税抜)</th>
              <th className="text-center py-1 px-1">数量</th>
              <th className="text-right py-1 px-1">小計(税込)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.product.id} className="border-b border-gray-300">
                <td className="py-1 px-1">{item.product.model_number || "—"}</td>
                <td className="py-1 px-1">{item.product.name}</td>
                <td className="py-1 px-1">{item.product.color || "—"}</td>
                <td className="py-1 px-1">{item.product.size || "—"}</td>
                <td className="text-right py-1 px-1">¥{item.priceWithTax.toLocaleString()}</td>
                <td className="text-right py-1 px-1">¥{item.priceWithoutTax.toLocaleString()}</td>
                <td className="text-right py-1 px-1">¥{item.discountedWithTax.toLocaleString()}</td>
                <td className="text-right py-1 px-1">¥{item.discountedWithoutTax.toLocaleString()}</td>
                <td className="text-center py-1 px-1">{item.qty}</td>
                <td className="text-right py-1 px-1">¥{item.subtotal.toLocaleString()}</td>
              </tr>
            ))}
            <tr className="total-row">
              <td colSpan={9} className="text-right py-1 px-1 font-medium">送料(税込)</td>
              <td className="text-right py-1 px-1 font-medium">¥{shipping.toLocaleString()}</td>
            </tr>
            <tr className="grand-total">
              <td colSpan={9} className="text-right py-2 px-1">総計(税込)</td>
              <td className="text-right py-2 px-1">¥{grandTotal.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </>
  );
}
