-- 管理者アカウント設定用SQL

-- 1. 既存ユーザーを確認
SELECT id, email FROM auth.users WHERE email = 'komatsu_t@frasco100.cc';

-- 2. ユーザーが存在しない場合は作成（この部分はSupabaseダッシュボードで手動実行）
-- INSERT INTO auth.users (email, email_confirmed_at, created_at)
-- VALUES ('komatsu_t@frasco100.cc', NOW(), NOW());

-- 3. プロフィールを作成または更新
INSERT INTO profiles (user_id, display_name, discount_rate, memo, created_at)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'komatsu_t@frasco100.cc'),
  '小松 剛',
  NULL,
  'システム管理者',
  NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
  display_name = '小松 剛',
  discount_rate = NULL,
  memo = 'システム管理者',
  updated_at = NOW();

-- 4. 管理者権限を設定
INSERT INTO user_roles (user_id, role, created_at)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'komatsu_t@frasco100.cc'),
  'admin',
  NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
  role = 'admin',
  updated_at = NOW();

-- 5. 確認
SELECT 
  u.id,
  u.email,
  p.display_name,
  p.discount_rate,
  p.memo,
  r.role
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.user_id
LEFT JOIN user_roles r ON u.id = r.user_id
WHERE u.email = 'komatsu_t@frasco100.cc';
