import { useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Package, LogIn, UserPlus } from "lucide-react";

export default function AuthPage() {
  const { user, loading: authLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 基本的な入力検証
    if (!email || !password) {
      toast.error("メールアドレスとパスワードを入力してください");
      return;
    }
    
    if (password.length < 6) {
      toast.error("パスワードは6文字以上必要です");
      return;
    }
    
    if (!email.includes('@') || !email.includes('.')) {
      toast.error("有効なメールアドレスを入力してください");
      return;
    }
    
    setSubmitting(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("ログインしました");
      } else {
        if (!displayName) {
          toast.error("表示名を入力してください");
          setSubmitting(false);
          return;
        }
        
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName || email },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("確認メールを送信しました。メールをご確認ください。");
      }
    } catch (error: any) {
      console.error("Authentication error:", error);
      toast.error(error.message || "認証に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <Package className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">在庫管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLogin ? "ログインしてください" : "アカウントを作成"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                表示名
              </label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="田中 太郎"
                className="h-12"
              />
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              メールアドレス
            </label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-12"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              パスワード
            </label>
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6文字以上"
              minLength={6}
              className="h-12"
            />
          </div>
          <Button
            type="submit"
            className="h-14 w-full text-base font-bold"
            disabled={submitting}
          >
            {isLogin ? (
              <>
                <LogIn className="mr-2 h-5 w-5" />
                ログイン
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-5 w-5" />
                アカウント作成
              </>
            )}
          </Button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-primary hover:underline"
          >
            {isLogin
              ? "アカウントをお持ちでない方はこちら"
              : "すでにアカウントをお持ちの方はこちら"}
          </button>
        </div>
      </div>
    </div>
  );
}
