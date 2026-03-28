import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Order {
  id: string;
  company_name: string;
  order_date: string;
  discount_rate: number;
  shipping_cost: number;
  total_amount: number;
  status: string;
  doc_type: string;
}

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  model_number: string;
  product_name: string;
  color: string;
  size: string;
  price_with_tax: number;
  price_without_tax: number;
  discounted_price_with_tax: number;
  discounted_price_without_tax: number;
  quantity: number;
  subtotal: number;
}

function formatRate(rate: number): string {
  const display = rate * 10;
  return `${display % 1 === 0 ? display.toFixed(0) : display}掛け`;
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [companyName, setCompanyName] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [discountRate, setDiscountRate] = useState("");
  const [shippingCost, setShippingCost] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: orderData }, { data: itemsData }] = await Promise.all([
        supabase.from("orders").select("*").eq("id", id).single(),
        supabase.from("order_items").select("*").eq("order_id", id).order("created_at"),
      ]);
      if (orderData) {
        const o = orderData as Order;
        setOrder(o);
        setCompanyName(o.company_name);
        setOrderDate(o.order_date);
        setDiscountRate(String(o.discount_rate));
        setShippingCost(String(o.shipping_cost));
      }
      if (itemsData) {
        setItems(itemsData as OrderItem[]);
        setQuantities(Object.fromEntries((itemsData as OrderItem[]).map((i) => [i.id, i.quantity])));
      }
      setLoading(false);
    })();
  }, [id]);

  const docType = order?.doc_type || "発注書";
  const rate = parseFloat(discountRate) || 0;
  const shipping = parseInt(shippingCost) || 0;

  const computedItems = useMemo(() => {
    return items.map((item) => {
      const discWithTax = Math.round(item.price_with_tax * rate);
      const discWithoutTax = Math.round(item.price_without_tax * rate);
      const qty = quantities[item.id] || 0;
      const subtotal = discWithTax * qty;
      return { ...item, discounted_price_with_tax: discWithTax, discounted_price_without_tax: discWithoutTax, quantity: qty, subtotal };
    });
  }, [items, rate, quantities]);

  const subtotalSum = computedItems.reduce((s, i) => s + i.subtotal, 0);
  const grandTotal = subtotalSum + shipping;

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const { error: orderErr } = await supabase
        .from("orders")
        .update({
          company_name: companyName,
          order_date: orderDate,
          discount_rate: parseFloat(discountRate),
          shipping_cost: shipping,
          total_amount: grandTotal,
        })
        .eq("id", id);
      if (orderErr) throw orderErr;

      for (const ci of computedItems) {
        await supabase
          .from("order_items")
          .update({
            discounted_price_with_tax: ci.discounted_price_with_tax,
            discounted_price_without_tax: ci.discounted_price_without_tax,
            quantity: ci.quantity,
            subtotal: ci.subtotal,
          })
          .eq("id", ci.id);
      }

      toast.success("保存しました");
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">書類が見つかりません</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/orders")}>戻る</Button>
      </div>
    );
  }

  return (
    <>
      {/* Screen controls (hidden on print) */}
      <div className="flex flex-col gap-4 p-4 pb-24 print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/orders")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground flex-1">{docType}詳細</h1>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" />
            印刷
          </Button>
        </div>

        {/* Editable info */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">会社名</label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
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

        {/* Table (editable) */}
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
              {computedItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-nowrap font-mono">{item.model_number || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">{item.product_name}</TableCell>
                  <TableCell className="whitespace-nowrap">{item.color || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">{item.size || "—"}</TableCell>
                  <TableCell className="text-right">¥{item.price_with_tax.toLocaleString()}</TableCell>
                  <TableCell className="text-right">¥{item.price_without_tax.toLocaleString()}</TableCell>
                  <TableCell className="text-right">¥{item.discounted_price_with_tax.toLocaleString()}</TableCell>
                  <TableCell className="text-right">¥{item.discounted_price_without_tax.toLocaleString()}</TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="number"
                      min={0}
                      value={quantities[item.id] || 0}
                      onChange={(e) => setQuantities((q) => ({ ...q, [item.id]: parseInt(e.target.value) || 0 }))}
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
            {saving ? "保存中..." : "変更を保存"}
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
              {computedItems.map((item) => (
                <tr key={item.id} className="border-b border-gray-300">
                  <td className="py-1 px-1">{item.model_number || "—"}</td>
                  <td className="py-1 px-1">{item.product_name}</td>
                  <td className="py-1 px-1">{item.color || "—"}</td>
                  <td className="py-1 px-1">{item.size || "—"}</td>
                  <td className="text-right py-1 px-1">¥{item.price_with_tax.toLocaleString()}</td>
                  <td className="text-right py-1 px-1">¥{item.price_without_tax.toLocaleString()}</td>
                  <td className="text-right py-1 px-1">¥{item.discounted_price_with_tax.toLocaleString()}</td>
                  <td className="text-right py-1 px-1">¥{item.discounted_price_without_tax.toLocaleString()}</td>
                  <td className="text-center py-1 px-1">{item.quantity}</td>
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
