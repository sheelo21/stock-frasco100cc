-- 注文番号フィールドを追加
ALTER TABLE orders ADD COLUMN order_number TEXT;

-- 既存データに注文番号を付与（必要な場合）
UPDATE orders 
SET order_number = 
  CASE 
    WHEN doc_type = '発注書' THEN 'PO-' || TO_CHAR(created_at, 'YYYYMMDD') || '-' || LPAD(EXTRACT(MINUTE FROM created_at)::text, 3, '0')
    WHEN doc_type = '納品書' THEN 'DL-' || TO_CHAR(created_at, 'YYYYMMDD') || '-' || LPAD(EXTRACT(MINUTE FROM created_at)::text, 3, '0')
    ELSE 'ORD-' || TO_CHAR(created_at, 'YYYYMMDD') || '-' || LPAD(EXTRACT(MINUTE FROM created_at)::text, 3, '0')
  END
WHERE order_number IS NULL;
