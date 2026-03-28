import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Pencil, ChevronLeft, ChevronRight, CheckCircle, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  created_at: string;
}

function formatRate(rate: number): string {
  const display = rate * 10;
  return `${display % 1 === 0 ? display.toFixed(0) : display}掛け`;
}

const ITEMS_PER_PAGE = 20;

export default function OrderListPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<"all" | "発注書" | "納品書">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;
      
      toast.success("ステータスを更新しました");
      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
    } catch (error) {
      toast.error("ステータスの更新に失敗しました");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      "発注済": { variant: "default" as const, icon: Clock, label: "発注済" },
      "処理中": { variant: "secondary" as const, icon: Clock, label: "処理中" },
      "納品済": { variant: "default" as const, icon: CheckCircle, label: "納品済" },
      "キャンセル": { variant: "destructive" as const, icon: XCircle, label: "キャンセル" },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig["発注済"];
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setOrders(data as Order[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    let filtered = orders;
    
    if (tab !== "all") {
      filtered = filtered.filter((o) => o.doc_type === tab);
    }
    
    if (statusFilter !== "all") {
      filtered = filtered.filter((o) => o.status === statusFilter);
    }
    
    return filtered;
  }, [orders, tab, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleTabChange = (v: string) => {
    setTab(v as any);
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">書類履歴</h1>
          <p className="text-sm text-muted-foreground">{filtered.length}件</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Tabs value={tab} onValueChange={handleTabChange} className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">すべて</TabsTrigger>
            <TabsTrigger value="発注書">発注書</TabsTrigger>
            <TabsTrigger value="納品書">納品書</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="発注済">発注済</SelectItem>
            <SelectItem value="処理中">処理中</SelectItem>
            <SelectItem value="納品済">納品済</SelectItem>
            <SelectItem value="キャンセル">キャンセル</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">履歴がありません</p>
      ) : (
        <>
          <div className="space-y-2">
            {paged.map((order) => (
              <div key={order.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{order.company_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.order_date} · {formatRate(order.discount_rate)}
                  </p>
                  <div className="mt-1">
                    {getStatusBadge(order.status)}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 space-y-1">
                  <p className="text-sm font-bold text-foreground">¥{order.total_amount.toLocaleString()}</p>
                  <Badge
                    variant={order.doc_type === "納品書" ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {order.doc_type}
                  </Badge>
                  <Select
                    value={order.status}
                    onValueChange={(value) => updateOrderStatus(order.id, value)}
                  >
                    <SelectTrigger className="w-24 h-6 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="発注済">発注済</SelectItem>
                      <SelectItem value="処理中">処理中</SelectItem>
                      <SelectItem value="納品済">納品済</SelectItem>
                      <SelectItem value="キャンセル">キャンセル</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => navigate(`/orders/${order.id}`)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">{currentPage} / {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
