const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

async function setupAdmin() {
  try {
    console.log('管理者アカウントの設定を開始します...');

    // 1. ユーザーを作成または取得
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'komatsu_t@frasco100.cc',
      password: 'admin123456',
      email_confirm: true,
      user_metadata: {
        display_name: '小松 剛'
      }
    });

    if (authError && !authError.message.includes('already registered')) {
      throw authError;
    }

    let userId;
    if (authData.user) {
      userId = authData.user.id;
      console.log('ユーザーを作成しました:', userId);
    } else {
      // 既存ユーザーを取得
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers.users.find(u => u.email === 'komatsu_t@frasco100.cc');
      if (existingUser) {
        userId = existingUser.id;
        console.log('既存ユーザーを取得しました:', userId);
      } else {
        throw new Error('ユーザーの取得に失敗しました');
      }
    }

    // 2. プロフィールを作成または更新
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        display_name: '小松 剛',
        discount_rate: null,
        memo: 'システム管理者'
      });

    if (profileError) {
      console.error('プロフィール作成エラー:', profileError);
    } else {
      console.log('プロフィールを作成しました');
    }

    // 3. 管理者権限を設定
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: 'admin'
      });

    if (roleError) {
      console.error('権限設定エラー:', roleError);
    } else {
      console.log('管理者権限を設定しました');
    }

    console.log('管理者アカウントの設定が完了しました！');
    console.log('メール: komatsu_t@frasco100.cc');
    console.log('パスワード: admin123456');

  } catch (error) {
    console.error('エラーが発生しました:', error);
  }
}

setupAdmin();
