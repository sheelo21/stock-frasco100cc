-- ユーザー情報を完全にリセットするSQL
-- 商品と在庫情報は保持

-- 1. プロフィールをすべて削除
DELETE FROM profiles;

-- 2. ユーザーロールをすべて削除
DELETE FROM user_roles;

-- 3. 認証ユーザーをすべて削除（管理者権限が必要）
-- 注意：この操作は元に戻せません
DELETE FROM auth.users WHERE email != 'komatsu_t@frasco100.cc';

-- 4. 確認用：残ったユーザーを確認
SELECT 
  u.id,
  u.email,
  u.created_at,
  u.email_confirmed_at
FROM auth.users u
ORDER BY u.created_at DESC;

-- 5. 商品と在庫情報が保持されていることを確認
SELECT 
  'products' as table_name,
  COUNT(*) as record_count
FROM products
UNION ALL
SELECT 
  'inventory' as table_name,
  COUNT(*) as record_count
FROM inventory
ORDER BY table_name;
