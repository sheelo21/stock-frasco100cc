import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Download, FileText, Table, Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function DataExportPage() {
  const [exportType, setExportType] = useState<"csv" | "pdf" | "excel">("csv");
  const [dataType, setDataType] = useState<"products" | "orders" | "customers" | "inventory">("products");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const fieldOptions = {
    products: ["name", "product_number", "stock", "price_with_tax", "price_without_tax", "color", "size", "created_at"],
    orders: ["company_name", "order_date", "total_amount", "status", "discount_rate", "shipping_cost", "created_at"],
    customers: ["name", "company_name", "email", "phone", "address", "discount_rate", "created_at"],
    inventory: ["name", "product_number", "stock", "total_sold", "total_revenue", "last_order_date"]
  };

  const handleFieldToggle = (field: string) => {
    setSelectedFields(prev => 
      prev.includes(field) 
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  const exportData = async () => {
    if (selectedFields.length === 0) {
      toast.error("少なくとも1つのフィールドを選択してください");
      return;
    }

    setIsExporting(true);
    setProgress(0);

    try {
      let query = supabase.from(dataType).select(selectedFields.join(","));

      // 日付範囲フィルター
      if (dateRange && (dataType === "orders" || dataType === "customers")) {
        query = query
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString());
      }

      setProgress(25);

      const { data, error } = await query;

      if (error) throw error;

      setProgress(50);

      if (!data || data.length === 0) {
        toast.error("エクスポートするデータがありません");
        return;
      }

      setProgress(75);

      // CSV形式に変換
      const csv = convertToCSV(data, selectedFields);
      downloadFile(csv, `${dataType}_${new Date().toISOString().split('T')[0]}.${exportType}`);

      setProgress(100);
      toast.success("データのエクスポートが完了しました");
    } catch (error) {
      console.error('Export error:', error);
      toast.error("エクスポートに失敗しました");
    } finally {
      setIsExporting(false);
      setTimeout(() => setProgress(0), 2000);
    }
  };

  const convertToCSV = (data: any[], fields: string[]): string => {
    const headers = fields.map(field => {
      const fieldNames: Record<string, string> = {
        name: "商品名",
        product_number: "商品番号",
        stock: "在庫数",
        price_with_tax: "税込価格",
        price_without_tax: "税抜価格",
        color: "カラー",
        size: "サイズ",
        created_at: "作成日",
        company_name: "会社名",
        order_date: "注文日",
        total_amount: "合計金額",
        status: "ステータス",
        discount_rate: "掛率",
        shipping_cost: "送料",
        email: "メール",
        phone: "電話番号",
        address: "住所",
        total_sold: "総売上数",
        total_revenue: "総売上高",
        last_order_date: "最終注文日"
      };
      return fieldNames[field] || field;
    });

    const csvContent = [
      headers.join(","),
      ...data.map(row => 
        fields.map(field => {
          const value = row[field];
          if (value === null || value === undefined) return "";
          if (typeof value === 'string' && value.includes(",")) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(",")
      )
    ].join("\n");

    return csvContent;
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">データエクスポート</h1>
        <p className="text-muted-foreground">データをCSV、PDF、Excel形式でエクスポートできます</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* エクスポート設定 */}
        <Card>
          <CardHeader>
            <CardTitle>エクスポート設定</CardTitle>
            <CardDescription>エクスポートするデータと形式を選択</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>データタイプ</Label>
              <Select value={dataType} onValueChange={(value: any) => setDataType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="products">商品データ</SelectItem>
                  <SelectItem value="orders">注文データ</SelectItem>
                  <SelectItem value="customers">顧客データ</SelectItem>
                  <SelectItem value="inventory">在庫分析データ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>エクスポート形式</Label>
              <Select value={exportType} onValueChange={(value: any) => setExportType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(dataType === "orders" || dataType === "customers") && (
              <div className="space-y-2">
                <Label>日付範囲（オプション）</Label>
                <DatePickerWithRange />
              </div>
            )}
          </CardContent>
        </Card>

        {/* フィールド選択 */}
        <Card>
          <CardHeader>
            <CardTitle>エクスポートフィールド</CardTitle>
            <CardDescription>エクスポートするフィールドを選択</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {fieldOptions[dataType].map(field => (
                <div key={field} className="flex items-center space-x-2">
                  <Checkbox
                    id={field}
                    checked={selectedFields.includes(field)}
                    onCheckedChange={() => handleFieldToggle(field)}
                  />
                  <Label htmlFor={field} className="text-sm">
                    {field}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* エクスポート実行 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            エクスポート実行
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isExporting && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>エクスポート中...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
          
          <Button 
            onClick={exportData} 
            disabled={isExporting || selectedFields.length === 0}
            className="w-full"
          >
            {isExporting ? "エクスポート中..." : "データをエクスポート"}
          </Button>
        </CardContent>
      </Card>

      {/* エクスポート履歴 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            エクスポートのヒント
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• CSV形式はExcelで開くことができます</p>
            <p>• 大量のデータをエクスポートする場合は時間がかかる場合があります</p>
            <p>• 日付範囲を指定することで、特定の期間のデータのみをエクスポートできます</p>
            <p>• 必要なフィールドのみを選択することで、エクスポート時間を短縮できます</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
