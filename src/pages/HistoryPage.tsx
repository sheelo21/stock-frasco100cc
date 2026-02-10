import { useInventory } from "@/hooks/use-inventory";
import { ArrowUp, ArrowDown, Edit } from "lucide-react";

function formatTime(date: Date) {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "たった今";
  if (mins < 60) return `${mins}分前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}時間前`;
  return date.toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryPage() {
  const { logs } = useInventory();

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-foreground">変動履歴</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          在庫の入出庫ログ
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <p className="text-muted-foreground">まだ履歴がありません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                  log.type === "in"
                    ? "bg-success/10"
                    : log.type === "out"
                    ? "bg-destructive/10"
                    : "bg-primary/10"
                }`}
              >
                {log.type === "in" ? (
                  <ArrowUp className="h-5 w-5 text-success" />
                ) : log.type === "out" ? (
                  <ArrowDown className="h-5 w-5 text-destructive" />
                ) : (
                  <Edit className="h-4 w-4 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {log.productName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatTime(log.timestamp)}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`text-base font-bold ${
                    log.change > 0
                      ? "text-success"
                      : log.change < 0
                      ? "text-destructive"
                      : "text-foreground"
                  }`}
                >
                  {log.change > 0 ? `+${log.change}` : log.change}
                </p>
                <p className="text-xs text-muted-foreground">
                  残: {log.newStock}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
