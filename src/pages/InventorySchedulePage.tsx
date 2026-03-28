import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Edit, Trash2, CalendarIcon, TrendingUp, TrendingDown, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface InventorySchedule {
  id: string;
  product_id: string;
  schedule_type: "入庫" | "出庫";
  quantity: number;
  scheduled_date: string;
  status: "予定" | "完了" | "キャンセル";
  notes?: string;
  created_at: string;
  product: {
    id: string;
    name: string;
    product_number: string;
    stock: number;
  };
}

export default function InventorySchedulePage() {
  const [schedules, setSchedules] = useState<InventorySchedule[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<InventorySchedule | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [formData, setFormData] = useState({
    product_id: "",
    schedule_type: "入庫" as "入庫" | "出庫",
    quantity: "",
    scheduled_date: "",
    notes: ""
  });

  useEffect(() => {
    fetchSchedules();
    fetchProducts();
  }, []);

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_schedules')
        .select(`
          *,
          product:products(id, name, product_number, stock)
        `)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast.error("予定データの読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, product_number, stock')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      product_id: "",
      schedule_type: "入庫",
      quantity: "",
      scheduled_date: "",
      notes: ""
    });
    setSelectedDate(null);
    setEditingSchedule(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.product_id || !formData.quantity || !formData.scheduled_date) {
      toast.error("必須項目を入力してください");
      return;
    }

    try {
      const scheduleData = {
        product_id: formData.product_id,
        schedule_type: formData.schedule_type,
        quantity: parseInt(formData.quantity),
        scheduled_date: formData.scheduled_date,
        notes: formData.notes.trim() || null
      };

      if (editingSchedule) {
        const { error } = await supabase
          .from('inventory_schedules')
          .update(scheduleData)
          .eq('id', editingSchedule.id);

        if (error) throw error;
        toast.success("予定を更新しました");
      } else {
        const { error } = await supabase
          .from('inventory_schedules')
          .insert(scheduleData);

        if (error) throw error;
        toast.success("予定を追加しました");
      }

      fetchSchedules();
      setShowDialog(false);
      resetForm();
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error("保存に失敗しました");
    }
  };

  const handleEdit = (schedule: InventorySchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      product_id: schedule.product_id,
      schedule_type: schedule.schedule_type,
      quantity: schedule.quantity.toString(),
      scheduled_date: schedule.scheduled_date,
      notes: schedule.notes || ""
    });
    setSelectedDate(new Date(schedule.scheduled_date));
    setShowDialog(true);
  };

  const handleDelete = async (scheduleId: string) => {
    if (!confirm("本当にこの予定を削除しますか？")) return;

    try {
      const { error } = await supabase
        .from('inventory_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;
      toast.success("予定を削除しました");
      fetchSchedules();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error("削除に失敗しました");
    }
  };

  const updateScheduleStatus = async (scheduleId: string, status: "予定" | "完了" | "キャンセル") => {
    try {
      const { error } = await supabase
        .from('inventory_schedules')
        .update({ status })
        .eq('id', scheduleId);

      if (error) throw error;
      
      toast.success("ステータスを更新しました");
      setSchedules(prev => prev.map(schedule => 
        schedule.id === scheduleId ? { ...schedule, status } : schedule
      ));
    } catch (error) {
      toast.error("ステータスの更新に失敗しました");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      "予定": { variant: "default" as const, icon: CalendarIcon, label: "予定" },
      "完了": { variant: "default" as const, icon: CheckCircle, label: "完了" },
      "キャンセル": { variant: "destructive" as const, icon: XCircle, label: "キャンセル" },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig["予定"];
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getTypeIcon = (type: "入庫" | "出庫") => {
    return type === "入庫" ? 
      <TrendingUp className="h-4 w-4 text-green-600" /> : 
      <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  const upcomingSchedules = schedules.filter(s => 
    s.status === "予定" && new Date(s.scheduled_date) >= new Date()
  );

  const todaySchedules = schedules.filter(s => 
    s.scheduled_date === new Date().toISOString().split('T')[0]
  );

  if (loading) {
    return <div className="flex justify-center p-8">読み込み中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">入出庫予定管理</h1>
          <p className="text-muted-foreground">入出庫の予定を計画・管理できます</p>
        </div>
        <Dialog open={showDialog} onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              予定を追加
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingSchedule ? "予定を編集" : "新規予定を追加"}
              </DialogTitle>
              <DialogDescription>
                入出庫予定の詳細を入力してください
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="product">商品</Label>
                  <Select value={formData.product_id} onValueChange={(value) => setFormData(prev => ({ ...prev, product_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="商品を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.product_number})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schedule_type">種別</Label>
                  <Select value={formData.schedule_type} onValueChange={(value: "入庫" | "出庫") => setFormData(prev => ({ ...prev, schedule_type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="入庫">入庫</SelectItem>
                      <SelectItem value="出庫">出庫</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">数量</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                    placeholder="10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>予定日</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "yyyy/MM/dd", { locale: ja }) : "日付を選択"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          setSelectedDate(date);
                          setFormData(prev => ({ 
                            ...prev, 
                            scheduled_date: date ? date.toISOString().split('T')[0] : "" 
                          }));
                        }}
                        locale={ja}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">メモ</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="備考や特記事項..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                  キャンセル
                </Button>
                <Button type="submit">
                  {editingSchedule ? "更新" : "追加"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 概要カード */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日の予定</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todaySchedules.length}</div>
            <p className="text-xs text-muted-foreground">
              本日予定されている入出庫
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今後の予定</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingSchedules.length}</div>
            <p className="text-xs text-muted-foreground">
              予定されている入出庫
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総予定数</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schedules.length}</div>
            <p className="text-xs text-muted-foreground">
              登録されているすべての予定
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 予定一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>予定一覧</CardTitle>
          <CardDescription>すべての入出庫予定</CardDescription>
        </CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>予定が登録されていません</p>
              <p className="text-sm">「予定を追加」ボタンから最初の予定を登録してください</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>予定日</TableHead>
                  <TableHead>商品</TableHead>
                  <TableHead>種別</TableHead>
                  <TableHead>数量</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>メモ</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell>{schedule.scheduled_date}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{schedule.product.name}</p>
                        <p className="text-sm text-muted-foreground">{schedule.product.product_number}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(schedule.schedule_type)}
                        <span>{schedule.schedule_type}</span>
                      </div>
                    </TableCell>
                    <TableCell>{schedule.quantity}個</TableCell>
                    <TableCell>{getStatusBadge(schedule.status)}</TableCell>
                    <TableCell className="max-w-xs truncate">{schedule.notes || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {schedule.status === "予定" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateScheduleStatus(schedule.id, "完了")}
                            >
                              完了
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateScheduleStatus(schedule.id, "キャンセル")}
                            >
                              キャンセル
                            </Button>
                          </>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(schedule)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(schedule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
