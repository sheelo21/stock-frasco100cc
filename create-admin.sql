-- komatsu_t@frasco100.ccを管理者として作成するSQL

-- 1. 管理者ユーザーを作成
INSERT INTO auth.users (
  id,
  email,
  email_confirmed_at,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  last_sign_in_at,
  raw_user_meta_data,
  is_super_admin,
  banned_until,
  reauthentication_token,
  email_change_token_current,
  email_change_token_new,
  recovery_token
) VALUES (
  gen_random_uuid(),
  'komatsu_t@frasco100.cc',
  NOW(),
  NOW(),
  NOW(),
  NULL,
  NULL,
  NULL,
  '{"display_name":"小松 剛"}',
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL
);

-- 2. プロフィールを作成
INSERT INTO profiles (
  user_id,
  display_name,
  discount_rate,
  memo,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'komatsu_t@frasco100.cc'),
  '小松 剛',
  NULL,
  'システム管理者',
  NOW(),
  NOW()
);

-- 3. 管理者権限を設定
INSERT INTO user_roles (
  user_id,
  role,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'komatsu_t@frasco100.cc'),
  'admin',
  NOW(),
  NOW()
);

-- 4. 確認
SELECT 
  u.id,
  u.email,
  u.created_at,
  p.display_name,
  p.discount_rate,
  p.memo,
  r.role,
  r.created_at as role_created_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.user_id
LEFT JOIN user_roles r ON u.id = r.user_id
WHERE u.email = 'komatsu_t@frasco100.cc';
