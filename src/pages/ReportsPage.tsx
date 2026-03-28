import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Package, 
  DollarSign,
  BarChart3,
  PieChart,
  Calendar
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ja } from "date-fns/locale";

interface SalesReport {
  month: string;
  order_count: number;
  customer_count: number;
  total_revenue: number;
  total_items_sold: number;
  avg_order_value: number;
}

interface CustomerSalesReport {
  customer_id: string;
  customer_name: string;
  company_name?: string;
  order_count: number;
  total_revenue: number;
  avg_order_value: number;
  last_order_date?: string;
  total_items_purchased: number;
}

interface ProductProfitAnalysis {
  id: string;
  name: string;
  product_number: string;
  selling_price: number;
  estimated_cost: number;
  estimated_profit: number;
  profit_margin_percentage: number;
  total_sold: number;
  total_revenue: number;
  total_profit: number;
}

export default function ReportsPage() {
  const [salesReports, setSalesReports] = useState<SalesReport[]>([]);
  const [customerReports, setCustomerReports] = useState<CustomerSalesReport[]>([]);
  const [productAnalysis, setProductAnalysis] = useState<ProductProfitAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: startOfMonth(subMonths(new Date(), 6)),
    to: endOfMonth(new Date())
  });

  useEffect(() => {
    fetchReports();
  }, [dateRange]);

  const fetchReports = async () => {
    try {
      // 売上レポート
      const { data: salesData, error: salesError } = await supabase
        .from('sales_reports')
        .select('*')
        .gte('month', dateRange.from.toISOString())
        .lte('month', dateRange.to.toISOString())
        .order('month', { ascending: false });

      if (salesError) throw salesError;
      setSalesReports(salesData || []);

      // 顧客別売上レポート
      const { data: customerData, error: customerError } = await supabase
        .from('customer_sales_reports')
        .select('*')
        .order('total_revenue', { ascending: false })
        .limit(20);

      if (customerError) throw customerError;
      setCustomerReports(customerData || []);

      // 商品別利益率分析
      const { data: productData, error: productError } = await supabase
        .from('product_profit_analysis')
        .select('*')
        .order('total_profit', { ascending: false })
        .limit(20);

      if (productError) throw productError;
      setProductAnalysis(productData || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getTotalRevenue = () => {
    return salesReports.reduce((sum, report) => sum + report.total_revenue, 0);
  };

  const getTotalOrders = () => {
    return salesReports.reduce((sum, report) => sum + report.order_count, 0);
  };

  const getAvgOrderValue = () => {
    const totalOrders = getTotalOrders();
    return totalOrders > 0 ? getTotalRevenue() / totalOrders : 0;
  };

  const getTopCustomer = () => {
    return customerReports[0];
  };

  const getTopProduct = () => {
    return productAnalysis[0];
  };

  if (loading) {
    return <div className="flex justify-center p-8">読み込み中...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">レポート</h1>
        <p className="text-muted-foreground">売上・顧客・商品の分析レポート</p>
      </div>

      {/* 期間選択 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            分析期間
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DatePickerWithRange 
            value={dateRange}
            onChange={(range) => {
              if (range) {
                setDateRange(range);
              }
            }}
          />
        </CardContent>
      </Card>

      {/* 概要カード */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総売上高</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(getTotalRevenue())}</div>
            <p className="text-xs text-muted-foreground">
              選択期間の合計売上
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総注文数</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTotalOrders().toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              平均注文額: {formatCurrency(getAvgOrderValue())}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">トップ顧客</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">
              {getTopCustomer()?.customer_name || "—"}
            </div>
            <p className="text-xs text-muted-foreground">
              {getTopCustomer() ? formatCurrency(getTopCustomer().total_revenue) : "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">トップ商品</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">
              {getTopProduct()?.name || "—"}
            </div>
            <p className="text-xs text-muted-foreground">
              {getTopProduct() ? formatCurrency(getTopProduct().total_profit) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 詳細レポート */}
      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">月次売上</TabsTrigger>
          <TabsTrigger value="customers">顧客別</TabsTrigger>
          <TabsTrigger value="products">商品別</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                月次売上レポート
              </CardTitle>
              <CardDescription>
                月別の売上推移と注文状況
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>月</TableHead>
                    <TableHead>注文数</TableHead>
                    <TableHead>顧客数</TableHead>
                    <TableHead>売上高</TableHead>
                    <TableHead>商品数</TableHead>
                    <TableHead>平均注文額</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesReports.map((report) => (
                    <TableRow key={report.month}>
                      <TableCell>
                        {format(new Date(report.month), 'yyyy年MM月', { locale: ja })}
                      </TableCell>
                      <TableCell>{report.order_count.toLocaleString()}</TableCell>
                      <TableCell>{report.customer_count.toLocaleString()}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(report.total_revenue)}
                      </TableCell>
                      <TableCell>{report.total_items_sold.toLocaleString()}</TableCell>
                      <TableCell>{formatCurrency(report.avg_order_value)}</TableCell>
                    </TableRow>
                  ))}
                  {salesReports.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        データがありません
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                顧客別売上レポート
              </CardTitle>
              <CardDescription>
                顧客ごとの売上ランキング
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>顧客名</TableHead>
                    <TableHead>会社名</TableHead>
                    <TableHead>注文数</TableHead>
                    <TableHead>総売上</TableHead>
                    <TableHead>平均注文額</TableHead>
                    <TableHead>最終注文</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerReports.map((customer) => (
                    <TableRow key={customer.customer_id}>
                      <TableCell className="font-medium">{customer.customer_name}</TableCell>
                      <TableCell>{customer.company_name || "—"}</TableCell>
                      <TableCell>{customer.order_count.toLocaleString()}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(customer.total_revenue)}
                      </TableCell>
                      <TableCell>{formatCurrency(customer.avg_order_value)}</TableCell>
                      <TableCell>
                        {customer.last_order_date 
                          ? format(new Date(customer.last_order_date), 'yyyy/MM/dd', { locale: ja })
                          : "—"
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                  {customerReports.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        データがありません
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                商品別利益率分析
              </CardTitle>
              <CardDescription>
                商品ごとの利益率と売上分析
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品名</TableHead>
                    <TableHead>商品番号</TableHead>
                    <TableHead>販売価格</TableHead>
                    <TableHead>利益率</TableHead>
                    <TableHead>販売数</TableHead>
                    <TableHead>総利益</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productAnalysis.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.product_number}</TableCell>
                      <TableCell>{formatCurrency(product.selling_price)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={Math.min(100, Math.max(0, product.profit_margin_percentage))} 
                            className="w-16" 
                          />
                          <span className="text-sm">
                            {formatPercentage(product.profit_margin_percentage)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{product.total_sold.toLocaleString()}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(product.total_profit)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {productAnalysis.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        データがありません
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
