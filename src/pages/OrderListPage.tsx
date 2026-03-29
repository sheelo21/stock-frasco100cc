import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Pencil, Plus, ChevronLeft, ChevronRight, CheckCircle, Clock, XCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Order {
  id: string;
  order_id: string;
  company_name: string;
  order_date: string;
  order_number?: string;
  discount_rate: number;
  shipping_cost: number;
  total_amount: number;
  status: string;
  created_at: string;
  documents: OrderDocument[];
}

interface OrderDocument {
  id: string;
  order_id: string;
  doc_type: "発注書" | "納品書" | "見積書";
  doc_number: string;
  issue_date: string;
  status: string;
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
  const [tab, setTab] = useState<"all" | "発注書" | "納品書" | "見積書">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [newDocType, setNewDocType] = useState<"発注書" | "納品書" | "見積書">("発注書");

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
      console.error("Error updating order status:", error);
      toast.error("ステータスの更新に失敗しました");
    }
  };

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data: ordersData, error: ordersError } = await supabase
          .from("orders")
          .select(`
            *,
            order_documents(
              id,
              doc_type,
              doc_number,
              issue_date,
              status,
              created_at
            )
          `)
          .order("created_at", { ascending: false });

        if (ordersError) throw ordersError;
        
        const ordersWithDocuments = (ordersData || []).map(order => ({
          ...order,
          order_id: `ORD-${String(order.id).padStart(6, '0')}`,
          documents: order.order_documents || []
        }));
        
        setOrders(ordersWithDocuments);
      } catch (error) {
        console.error("Error fetching orders:", error);
        toast.error("注文データの読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const createDocument = async (order: Order, docType: "発注書" | "納品書" | "見積書") => {
    try {
      const docNumber = `${docType}-${Date.now()}`;
      const { error } = await supabase
        .from("order_documents")
        .insert({
          order_id: order.id,
          doc_type: docType,
          doc_number: docNumber,
          issue_date: new Date().toISOString().split('T')[0],
          status: "発行済"
        });

      if (error) throw error;
      
      toast.success(`${docType}を作成しました`);
      // データを再取得
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          *,
          order_documents(
            id,
            doc_type,
            doc_number,
            issue_date,
            status,
            created_at
          )
        `)
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;
      
      const ordersWithDocuments = (ordersData || []).map(order => ({
        ...order,
        order_id: `ORD-${String(order.id).padStart(6, '0')}`,
        documents: order.order_documents || []
      }));
      
      setOrders(ordersWithDocuments);
      setShowDocumentDialog(false);
    } catch (error) {
      console.error("Error creating document:", error);
      toast.error(`${docType}の作成に失敗しました`);
    }
  };

  const filtered = useMemo(() => {
    let filtered = orders;

    // 検索フィルター
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order => 
        order.company_name.toLowerCase().includes(query) ||
        order.order_id.toLowerCase().includes(query) ||
        (order.order_number && order.order_number.toLowerCase().includes(query))
      );
    }

    // 書類タイプフィルター
    if (tab !== "all") {
      filtered = filtered.filter(order => 
        order.documents.some(doc => doc.doc_type === tab)
      );
    }

    // ステータスフィルター
    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    return filtered;
  }, [orders, tab, statusFilter, searchQuery]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const currentPage = page;
  const paged = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleTabChange = (value: string) => {
    setTab(value as "all" | "発注書" | "納品書" | "見積書");
    setPage(1);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      "発注済": "default",
      "処理中": "secondary",
      "納品済": "default",
      "キャンセル": "destructive"
    };

    return (
      <Badge variant={variants[status] || "secondary"} className="text-xs">
        {status}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 pb-20">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">注文履歴</h1>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="注文IDや会社名で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Tabs value={tab} onValueChange={handleTabChange} className="flex-1">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">すべて</TabsTrigger>
                <TabsTrigger value="発注書">発注書</TabsTrigger>
                <TabsTrigger value="納品書">納品書</TabsTrigger>
                <TabsTrigger value="見積書">見積書</TabsTrigger>
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
                <div key={order.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-start gap-4 mb-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-foreground">{order.company_name}</p>
                        <Badge variant="outline" className="text-xs">
                          {order.order_id}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {order.order_number && <span className="text-primary font-medium">{order.order_number} · </span>}
                        {order.order_date} · {formatRate(order.discount_rate)}
                      </p>
                      <div className="mt-1">
                        {getStatusBadge(order.status)}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-foreground">¥{order.total_amount.toLocaleString()}</p>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowDocumentDialog(true);
                        }}
                        className="mt-2"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        書類作成
                      </Button>
                    </div>
                  </div>
                  
                  {/* 書類一覧 */}
                  {order.documents.length > 0 && (
                    <div className="border-t pt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">関連書類</p>
                      <div className="flex flex-wrap gap-2">
                        {order.documents.map((doc) => (
                          <Badge
                            key={doc.id}
                            variant={doc.doc_type === "納品書" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {doc.doc_type}: {doc.doc_number}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ページネーション */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
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

      {/* 書類作成ダイアログ */}
      <Dialog open={showDocumentDialog} onOpenChange={setShowDocumentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>書類作成</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                注文ID: {selectedOrder?.order_id}
              </p>
              <p className="text-sm text-muted-foreground mb-2">
                会社名: {selectedOrder?.company_name}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">書類タイプ</label>
              <Select value={newDocType} onValueChange={(v) => setNewDocType(v as "発注書" | "納品書" | "見積書")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="発注書">発注書</SelectItem>
                  <SelectItem value="納品書">納品書</SelectItem>
                  <SelectItem value="見積書">見積書</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDocumentDialog(false)}>
              キャンセル
            </Button>
            <Button onClick={() => selectedOrder && createDocument(selectedOrder, newDocType)}>
              作成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
