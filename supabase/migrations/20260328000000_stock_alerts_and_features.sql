-- 在庫アラート設定テーブル
CREATE TABLE IF NOT EXISTS stock_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  alert_threshold INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id)
);

-- 在庫アラート通知テーブル
CREATE TABLE IF NOT EXISTS stock_alert_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock')),
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 注文ステータス更新
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT '発注済' 
CHECK (status IN ('発注済', '納品済', 'キャンセル', '処理中'));

-- 注文テンプレートテーブル
CREATE TABLE IF NOT EXISTS order_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 注文テンプレート商品テーブル
CREATE TABLE IF NOT EXISTS order_template_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES order_templates(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(template_id, product_id)
);

-- 顧客情報テーブル
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  discount_rate NUMERIC(5,4) DEFAULT 0.6,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 操作ログテーブル
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 在庫分析レポート用ビュー
CREATE OR REPLACE VIEW inventory_analysis AS
SELECT 
  p.id,
  p.name,
  p.product_number,
  p.stock,
  p.price_with_tax,
  p.price_without_tax,
  COALESCE(SUM(oi.quantity), 0) as total_sold,
  COALESCE(SUM(oi.subtotal), 0) as total_revenue,
  COUNT(DISTINCT o.id) as order_count,
  MAX(o.created_at) as last_order_date
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'キャンセル'
GROUP BY p.id, p.name, p.product_number, p.stock, p.price_with_tax, p.price_without_tax;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_stock_alerts_user_product ON stock_alerts(user_id, product_id);
CREATE INDEX IF NOT EXISTS idx_stock_alert_notifications_user_unread ON stock_alert_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created ON activity_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_customers_user_name ON customers(user_id, name);

-- RLSポリシー
ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_alert_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- 在庫アラートポリシー
CREATE POLICY "Users can view their own stock alerts" ON stock_alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own stock alerts" ON stock_alerts
  FOR ALL USING (auth.uid() = user_id);

-- 在庫アラート通知ポリシー
CREATE POLICY "Users can view their own alert notifications" ON stock_alert_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own alert notifications" ON stock_alert_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- 注文テンプレートポリシー
CREATE POLICY "Users can view their own order templates" ON order_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own order templates" ON order_templates
  FOR ALL USING (auth.uid() = user_id);

-- 注文テンプレート商品ポリシー
CREATE POLICY "Users can view items from their templates" ON order_template_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM order_templates 
      WHERE order_templates.id = template_id 
      AND order_templates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage items from their templates" ON order_template_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM order_templates 
      WHERE order_templates.id = template_id 
      AND order_templates.user_id = auth.uid()
    )
  );

-- 顧客情報ポリシー
CREATE POLICY "Users can view their own customers" ON customers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own customers" ON customers
  FOR ALL USING (auth.uid() = user_id);

-- 操作ログポリシー
CREATE POLICY "Users can view their own activity logs" ON activity_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own activity logs" ON activity_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- トリガー：updated_atの自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stock_alerts_updated_at 
  BEFORE UPDATE ON stock_alerts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_templates_updated_at 
  BEFORE UPDATE ON order_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at 
  BEFORE UPDATE ON customers 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
