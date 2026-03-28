import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bell, BellOff, Settings, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StockAlert {
  id: string;
  product_id: string;
  alert_threshold: number;
  is_active: boolean;
  product: {
    id: string;
    name: string;
    product_number: string;
    stock: number;
  };
}

interface StockAlertNotification {
  id: string;
  product_id: string;
  alert_type: 'low_stock' | 'out_of_stock';
  message: string;
  is_read: boolean;
  created_at: string;
  product: {
    name: string;
    product_number: string;
    stock: number;
  };
}

export default function StockAlertManager() {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [notifications, setNotifications] = useState<StockAlertNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [threshold, setThreshold] = useState("10");

  useEffect(() => {
    fetchAlerts();
    fetchNotifications();
  }, []);

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_alerts')
        .select(`
          *,
          product:products(id, name, product_number, stock)
        `)
        .eq('is_active', true);

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_alert_notifications')
        .select(`
          *,
          product:products(name, product_number, stock)
        `)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const createAlert = async () => {
    if (!selectedProduct || !threshold) {
      toast.error("商品としきい値を選択してください");
      return;
    }

    try {
      const { error } = await supabase
        .from('stock_alerts')
        .upsert({
          product_id: selectedProduct,
          alert_threshold: parseInt(threshold),
          is_active: true,
        });

      if (error) throw error;
      
      toast.success("在庫アラートを設定しました");
      fetchAlerts();
      setSelectedProduct("");
      setThreshold("10");
    } catch (error) {
      toast.error("アラート設定に失敗しました");
    }
  };

  const toggleAlert = async (alertId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('stock_alerts')
        .update({ is_active: isActive })
        .eq('id', alertId);

      if (error) throw error;
      fetchAlerts();
    } catch (error) {
      toast.error("アラート更新に失敗しました");
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('stock_alert_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
      fetchNotifications();
    } catch (error) {
      toast.error("通知の更新に失敗しました");
    }
  };

  const unreadCount = notifications.length;

  if (loading) {
    return <div className="p-4">読み込み中...</div>;
  }

  return (
    <div className="space-y-4">
      {/* アラート通知 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <span className="font-medium">在庫アラート</span>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount}
            </Badge>
          )}
        </div>
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              設定
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>在庫アラート設定</DialogTitle>
              <DialogDescription>
                在庫がしきい値以下になった場合に通知を受け取ります
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="product">商品選択</Label>
                <Input
                  id="product"
                  placeholder="商品IDまたは商品番号を入力"
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="threshold">しきい値</Label>
                <Input
                  id="threshold"
                  type="number"
                  min="1"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                />
              </div>
              <Button onClick={createAlert} className="w-full">
                アラートを追加
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 通知リスト */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <Alert key={notification.id} className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{notification.product.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {notification.message}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    現在在庫: {notification.product.stock}個
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markNotificationAsRead(notification.id)}
                >
                  確認
                </Button>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* アラート設定リスト */}
      <div className="space-y-2">
        {alerts.map((alert) => (
          <Card key={alert.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{alert.product.name}</div>
                <div className="text-sm text-muted-foreground">
                  商品番号: {alert.product.product_number}
                </div>
                <div className="text-sm text-muted-foreground">
                  しきい値: {alert.alert_threshold}個 | 現在在庫: {alert.product.stock}個
                </div>
              </div>
              <Switch
                checked={alert.is_active}
                onCheckedChange={(checked) => toggleAlert(alert.id, checked)}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {alerts.length === 0 && notifications.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <BellOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>在庫アラートは設定されていません</p>
          <p className="text-sm">「設定」ボタンからアラートを追加してください</p>
        </div>
      )}
    </div>
  );
}
