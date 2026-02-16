import { useState, useRef } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { importProductsFromCSV, type ImportResult } from "@/lib/csv-utils";

interface CsvImportDialogProps {
  onComplete: () => void;
}

export default function CsvImportDialog({ onComplete }: CsvImportDialogProps) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      const text = await file.text();
      const res = await importProductsFromCSV(text);
      setResult(res);

      if (res.success > 0) {
        toast({
          title: "インポート完了",
          description: `${res.success}件の商品を登録/更新しました`,
        });
        onComplete();
      }

      if (res.errors.length > 0 && res.success === 0) {
        toast({
          title: "インポートエラー",
          description: `${res.errors.length}件のエラーがあります`,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "読み込みエラー",
        description: "CSVファイルを読み込めませんでした",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setResult(null); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-1" />
          CSV取込
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>CSVインポート</DialogTitle>
          <DialogDescription>
            CSVファイルから商品データを一括登録・更新します。JANコードが一致する場合は上書きされます。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">CSVヘッダー（必須列: 商品名, JANコード）</p>
            <p>商品番号, 商品名, カタログページ, 親カテゴリ, 子カテゴリ, カラー, JANコード, 上代(税込), サイズ, 新商品(0/1), 在庫数</p>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFile}
          />

          <Button
            className="w-full"
            disabled={importing}
            onClick={() => fileRef.current?.click()}
          >
            {importing ? "インポート中..." : "CSVファイルを選択"}
          </Button>

          {importing && <Progress value={undefined} className="h-2" />}

          {result && (
            <div className="space-y-2 text-sm">
              <p className="text-foreground">
                ✅ 成功: {result.success}件
              </p>
              {result.errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto rounded border border-destructive/30 bg-destructive/5 p-2 text-xs space-y-1">
                  {result.errors.slice(0, 20).map((err, i) => (
                    <p key={i} className="text-destructive">
                      行{err.row}: {err.message}
                    </p>
                  ))}
                  {result.errors.length > 20 && (
                    <p className="text-muted-foreground">
                      ...他 {result.errors.length - 20}件のエラー
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
