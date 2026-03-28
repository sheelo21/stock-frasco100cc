-- 入出庫予定管理テーブル
CREATE TABLE IF NOT EXISTS inventory_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('入庫', '出庫')),
  quantity INTEGER NOT NULL,
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT '予定' CHECK (status IN ('予定', '完了', 'キャンセル')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 注文テンプレート機能（既存のテーブルを拡張）
ALTER TABLE order_templates 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 注文テンプレート使用履歴テーブル
CREATE TABLE IF NOT EXISTS order_template_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES order_templates(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- バーコード履歴テーブル
CREATE TABLE IF NOT EXISTS barcode_scan_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  scan_type TEXT NOT NULL CHECK (scan_type IN ('入庫', '出庫', '確認')),
  quantity INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 売上レポート用ビュー（拡張）
CREATE OR REPLACE VIEW sales_reports AS
SELECT 
  DATE_TRUNC('month', o.created_at) as month,
  COUNT(DISTINCT o.id) as order_count,
  COUNT(DISTINCT o.company_name) as customer_count,
  SUM(o.total_amount) as total_revenue,
  SUM(oi.quantity) as total_items_sold,
  AVG(o.total_amount) as avg_order_value
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.status != 'キャンセル'
GROUP BY DATE_TRUNC('month', o.created_at)
ORDER BY month DESC;

-- 顧客別売上レポート用ビュー
CREATE OR REPLACE VIEW customer_sales_reports AS
SELECT 
  c.id as customer_id,
  c.name as customer_name,
  c.company_name,
  COUNT(DISTINCT o.id) as order_count,
  SUM(o.total_amount) as total_revenue,
  AVG(o.total_amount) as avg_order_value,
  MAX(o.created_at) as last_order_date,
  SUM(oi.quantity) as total_items_purchased
FROM customers c
LEFT JOIN orders o ON c.name = o.company_name OR c.company_name = o.company_name
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.status != 'キャンセル' OR o.status IS NULL
GROUP BY c.id, c.name, c.company_name
ORDER BY total_revenue DESC;

-- 商品別利益率分析ビュー
CREATE OR REPLACE VIEW product_profit_analysis AS
SELECT 
  p.id,
  p.name,
  p.product_number,
  p.price_with_tax as selling_price,
  p.price_without_tax as selling_price_no_tax,
  -- ここに原価を追加する場合は別途設定
  (p.price_without_tax * 0.7) as estimated_cost, -- 推定原価70%
  (p.price_without_tax - (p.price_without_tax * 0.7)) as estimated_profit,
  ((p.price_without_tax - (p.price_without_tax * 0.7)) / p.price_without_tax * 100) as profit_margin_percentage,
  COALESCE(SUM(oi.quantity), 0) as total_sold,
  COALESCE(SUM(oi.subtotal), 0) as total_revenue,
  COALESCE(SUM(oi.quantity) * (p.price_without_tax - (p.price_without_tax * 0.7)), 0) as total_profit
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'キャンセル'
GROUP BY p.id, p.name, p.product_number, p.price_with_tax, p.price_without_tax
ORDER BY total_profit DESC;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_inventory_schedules_user_date ON inventory_schedules(user_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_inventory_schedules_product_status ON inventory_schedules(product_id, status);
CREATE INDEX IF NOT EXISTS idx_order_template_usage_template ON order_template_usage(template_id, used_at);
CREATE INDEX IF NOT EXISTS idx_barcode_scan_history_product_date ON barcode_scan_history(product_id, created_at);

-- RLSポリシー
ALTER TABLE inventory_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_template_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE barcode_scan_history ENABLE ROW LEVEL SECURITY;

-- 入出庫予定ポリシー
CREATE POLICY "Users can view their own inventory schedules" ON inventory_schedules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own inventory schedules" ON inventory_schedules
  FOR ALL USING (auth.uid() = user_id);

-- 注文テンプレート使用履歴ポリシー
CREATE POLICY "Users can view their own template usage" ON order_template_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own template usage" ON order_template_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- バーコード履歴ポリシー
CREATE POLICY "Users can view their own barcode history" ON barcode_scan_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own barcode history" ON barcode_scan_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- トリガー：updated_atの自動更新
CREATE TRIGGER update_inventory_schedules_updated_at 
  BEFORE UPDATE ON inventory_schedules 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
