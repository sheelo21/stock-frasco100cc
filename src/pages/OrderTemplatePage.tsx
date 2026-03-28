import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Copy, Package, ShoppingCart, Template } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OrderTemplate {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  items: TemplateItem[];
  usage_count?: number;
}

interface TemplateItem {
  id: string;
  template_id: string;
  product_id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    product_number: string;
    price_with_tax: number;
    stock: number;
  };
}

export default function OrderTemplatePage() {
  const [templates, setTemplates] = useState<OrderTemplate[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<OrderTemplate | null>(null);
  const [selectedItems, setSelectedItems] = useState<Array<{ product_id: string; quantity: number }>>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: ""
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchTemplates();
    fetchProducts();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('order_templates')
        .select(`
          *,
          items:order_template_items(
            *,
            product:products(id, name, product_number, price_with_tax, stock)
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error("テンプレートの読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, product_number, price_with_tax, stock')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", description: "" });
    setSelectedItems([]);
    setEditingTemplate(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("テンプレート名を入力してください");
      return;
    }

    if (selectedItems.length === 0) {
      toast.error("少なくとも1つの商品を追加してください");
      return;
    }

    try {
      if (editingTemplate) {
        // 既存のテンプレートを更新
        const { error: templateError } = await supabase
          .from('order_templates')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null
          })
          .eq('id', editingTemplate.id);

        if (templateError) throw templateError;

        // 既存アイテムを削除
        const { error: deleteError } = await supabase
          .from('order_template_items')
          .delete()
          .eq('template_id', editingTemplate.id);

        if (deleteError) throw deleteError;

        // 新しいアイテムを追加
        const templateItems = selectedItems.map(item => ({
          template_id: editingTemplate.id,
          product_id: item.product_id,
          quantity: item.quantity
        }));

        const { error: insertError } = await supabase
          .from('order_template_items')
          .insert(templateItems);

        if (insertError) throw insertError;

        toast.success("テンプレートを更新しました");
      } else {
        // 新規テンプレートを作成
        const { data: templateData, error: templateError } = await supabase
          .from('order_templates')
          .insert({
            name: formData.name.trim(),
            description: formData.description.trim() || null
          })
          .select()
          .single();

        if (templateError) throw templateError;

        // アイテムを追加
        const templateItems = selectedItems.map(item => ({
          template_id: templateData.id,
          product_id: item.product_id,
          quantity: item.quantity
        }));

        const { error: insertError } = await supabase
          .from('order_template_items')
          .insert(templateItems);

        if (insertError) throw insertError;

        toast.success("テンプレートを作成しました");
      }

      fetchTemplates();
      setShowDialog(false);
      resetForm();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error("保存に失敗しました");
    }
  };

  const handleEdit = (template: OrderTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || ""
    });
    setSelectedItems(
      template.items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity
      }))
    );
    setShowDialog(true);
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm("本当にこのテンプレートを削除しますか？")) return;

    try {
      const { error } = await supabase
        .from('order_templates')
        .update({ is_active: false })
        .eq('id', templateId);

      if (error) throw error;
      toast.success("テンプレートを削除しました");
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error("削除に失敗しました");
    }
  };

  const useTemplate = async (template: OrderTemplate) => {
    try {
      // テンプレート商品情報を取得
      const templateProducts = template.items.map(item => ({
        ...item.product,
        quantity: item.quantity
      }));

      // 注文作成ページへ遷移
      navigate('/orders/create', { state: { products: templateProducts } });
    } catch (error) {
      toast.error("テンプレートの使用に失敗しました");
    }
  };

  const addItem = (productId: string) => {
    if (selectedItems.find(item => item.product_id === productId)) {
      toast.error("この商品は既に追加されています");
      return;
    }

    setSelectedItems(prev => [...prev, { product_id: productId, quantity: 1 }]);
  };

  const updateItemQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    
    setSelectedItems(prev => 
      prev.map(item => 
        item.product_id === productId ? { ...item, quantity } : item
      )
    );
  };

  const removeItem = (productId: string) => {
    setSelectedItems(prev => prev.filter(item => item.product_id !== productId));
  };

  const getTemplateTotal = (template: OrderTemplate) => {
    return template.items.reduce((sum, item) => 
      sum + (item.product.price_with_tax * item.quantity), 0
    );
  };

  if (loading) {
    return <div className="flex justify-center p-8">読み込み中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">注文テンプレート</h1>
          <p className="text-muted-foreground">よく使う商品組み合わせをテンプレート化できます</p>
        </div>
        <Dialog open={showDialog} onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              テンプレート作成
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "テンプレート編集" : "新規テンプレート作成"}
              </DialogTitle>
              <DialogDescription>
                よく使う商品組み合わせをテンプレートとして保存できます
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">テンプレート名 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="例：定番商品セット"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">説明</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="テンプレートの説明"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>商品選択</Label>
                  <Select onValueChange={addItem}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="商品を追加" />
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

                {selectedItems.length > 0 && (
                  <div className="border rounded-lg p-4 space-y-2">
                    <h4 className="font-medium">選択中の商品</h4>
                    {selectedItems.map((item) => {
                      const product = products.find(p => p.id === item.product_id);
                      if (!product) return null;
                      
                      return (
                        <div key={item.product_id} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex-1">
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-muted-foreground">{product.product_number}</p>
                            <p className="text-sm">¥{product.price_with_tax.toLocaleString()}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(item.product_id, parseInt(e.target.value))}
                              className="w-20"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeItem(item.product_id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                  キャンセル
                </Button>
                <Button type="submit">
                  {editingTemplate ? "更新" : "作成"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* テンプレート一覧 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Template className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>テンプレートが登録されていません</p>
            <p className="text-sm">「テンプレート作成」ボタンから最初のテンプレートを作成してください</p>
          </div>
        ) : (
          templates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    {template.description && (
                      <CardDescription>{template.description}</CardDescription>
                    )}
                  </div>
                  <Badge variant="secondary">
                    {template.items.length}商品
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {template.items.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="truncate">{item.product.name}</span>
                        <span className="text-muted-foreground">×{item.quantity}</span>
                      </div>
                    ))}
                    {template.items.length > 3 && (
                      <p className="text-sm text-muted-foreground">
                        他{template.items.length - 3}商品...
                      </p>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 border-t">
                    <div>
                      <p className="font-bold">¥{getTemplateTotal(template).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(template.created_at).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        onClick={() => useTemplate(template)}
                      >
                        <ShoppingCart className="h-4 w-4 mr-1" />
                        使用
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
