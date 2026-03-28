import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  FileText, 
  Bell,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface DashboardStats {
  totalProducts: number;
  lowStockProducts: number;
  totalOrders: number;
  pendingOrders: number;
  totalCustomers: number;
  totalRevenue: number;
  monthlyRevenue: number;
  topProducts: Array<{
    name: string;
    total_sold: number;
    total_revenue: number;
  }>;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // 基本統計
      const [
        productsResult,
        ordersResult,
        customersResult,
        inventoryAnalysisResult
      ] = await Promise.all([
        supabase.from('products').select('id, name, stock').eq('stock', 0),
        supabase.from('orders').select('id, status, total_amount, created_at'),
        supabase.from('customers').select('id'),
        supabase.from('inventory_analysis').select('*').order('total_sold', { ascending: false }).limit(5)
      ]);

      // 総商品数
      const { count: totalProducts } = await supabase.from('products').select('*', { count: 'exact', head: true });
      
      // 低在庫商品数
      const { count: lowStockProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .lt('stock', 10);

      // 総注文数
      const totalOrders = ordersResult.data?.length || 0;
      
      // 保留中の注文数
      const pendingOrders = ordersResult.data?.filter(order => order.status === '発注済').length || 0;

      // 総顧客数
      const totalCustomers = customersResult.data?.length || 0;

      // 総売上高
      const totalRevenue = ordersResult.data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

      // 今月の売上高
      const currentMonth = new Date().toISOString().slice(0, 7);
      const monthlyRevenue = ordersResult.data
        ?.filter(order => order.created_at?.startsWith(currentMonth))
        ?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

      // トップ商品
      const topProducts = inventoryAnalysisResult.data?.slice(0, 5).map(item => ({
        name: item.name,
        total_sold: item.total_sold,
        total_revenue: item.total_revenue
      })) || [];

      setStats({
        totalProducts: totalProducts || 0,
        lowStockProducts: lowStockProducts || 0,
        totalOrders,
        pendingOrders,
        totalCustomers,
        totalRevenue,
        monthlyRevenue,
        topProducts
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">読み込み中...</div>;
  }

  if (!stats) {
    return <div className="text-center p-8">データの読み込みに失敗しました</div>;
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-3xl font-bold">ダッシュボード</h1>
        <p className="text-muted-foreground">ビジネスの概要を確認できます</p>
      </div>

      {/* 統計カード */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総商品数</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              登録されている商品
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">低在庫アラート</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.lowStockProducts}</div>
            <p className="text-xs text-muted-foreground">
              在庫が10個以下の商品
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総注文数</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              保留中: {stats.pendingOrders}件
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総顧客数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              登録顧客数
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 売上情報 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              今月の売上
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">¥{stats.monthlyRevenue.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground mt-2">
              今月の売上高
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              総売上高
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">¥{stats.totalRevenue.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground mt-2">
              全期間の総売上高
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 詳細タブ */}
      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products">人気商品</TabsTrigger>
          <TabsTrigger value="orders">注文状況</TabsTrigger>
          <TabsTrigger value="alerts">アラート</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>人気商品トップ5</CardTitle>
              <CardDescription>売上数が多い商品</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {product.total_sold}個 sold
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">¥{product.total_revenue.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">売上</p>
                    </div>
                  </div>
                ))}
                {stats.topProducts.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    売上データがありません
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>注文状況</CardTitle>
              <CardDescription>最近の注文状況</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>保留中の注文</span>
                  <Badge variant="secondary">{stats.pendingOrders}件</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>総注文数</span>
                  <Badge>{stats.totalOrders}件</Badge>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => navigate('/orders')}
                >
                  注文管理へ
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                在庫アラート
              </CardTitle>
              <CardDescription>在庫が少ない商品</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>低在庫商品</span>
                  <Badge variant="destructive">{stats.lowStockProducts}件</Badge>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => navigate('/inventory')}
                >
                  在庫管理へ
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
