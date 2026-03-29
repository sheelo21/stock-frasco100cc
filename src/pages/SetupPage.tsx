import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, UserPlus, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function SetupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("komatsu_t@frasco100.cc");
  const [password, setPassword] = useState("admin123456");
  const [displayName, setDisplayName] = useState("小松 剛");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: 入力, 2: 完了

  const handleSetup = async () => {
    setLoading(true);
    try {
      // 1. ユーザーを作成
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName
          }
        }
      });

      if (authError && !authError.message.includes('already registered')) {
        throw authError;
      }

      let userId;
      if (authData.user) {
        userId = authData.user.id;
        console.log("新規ユーザー作成:", userId);
      } else {
        // 既存ユーザーの場合はログインしてIDを取得
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (signInError) throw signInError;
        userId = signInData.user.id;
        console.log("既存ユーザーログイン:", userId);
      }

      // 2. プロフィールを作成
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          user_id: userId,
          display_name: displayName,
          discount_rate: null,
          memo: "システム管理者"
        });

      if (profileError) {
        console.error("プロフィールエラー:", profileError);
        throw profileError;
      }

      // 3. 管理者権限を設定
      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert({
          user_id: userId,
          role: "admin"
        });

      if (roleError) {
        console.error("権限設定エラー:", roleError);
        throw roleError;
      }

      console.log("管理者設定完了:", userId);
      toast.success("管理者アカウントを設定しました！");
      setStep(2);
      
      // 4. 3秒後にログイン画面へ
      setTimeout(() => {
        supabase.auth.signOut();
        navigate("/auth");
      }, 3000);
      
    } catch (error) {
      console.error("Setup error:", error);
      toast.error("設定に失敗しました: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 2) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-600">設定完了！</CardTitle>
            <CardDescription>
              管理者アカウントの設定が完了しました
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="font-semibold">ログイン情報</p>
              <p className="text-sm text-muted-foreground">メール: {email}</p>
              <p className="text-sm text-muted-foreground">パスワード: {password}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              3秒後にログイン画面へ移動します...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">管理者設定</CardTitle>
          <CardDescription>
            komatsu_t@frasco100.cc を管理者として設定します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">メールアドレス</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="komatsu_t@frasco100.cc"
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">パスワード</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="admin123456"
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">表示名</label>
            <Input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="小松 剛"
              disabled={loading}
            />
          </div>

          <Button 
            onClick={handleSetup} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                設定中...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                管理者として設定
              </div>
            )}
          </Button>

          <Button 
            variant="outline" 
            onClick={() => navigate("/auth")}
            className="w-full"
            disabled={loading}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            ログイン画面へ戻る
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
