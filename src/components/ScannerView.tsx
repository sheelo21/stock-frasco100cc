import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface ScannerViewProps {
  onScan: (barcode: string) => void;
  active: boolean;
}

export default function ScannerView({ onScan, active }: ScannerViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const scannerId = "scanner-region";
    const scanner = new Html5Qrcode(scannerId);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 280, height: 150 },
        },
        (decodedText) => {
          // Vibrate on success
          if (navigator.vibrate) {
            navigator.vibrate(200);
          }
          onScan(decodedText);
        },
        () => {
          // ignore scan failures
        }
      )
      .catch((err) => {
        console.error("Scanner error:", err);
        setError("カメラへのアクセスが許可されていません");
      });

    return () => {
      scanner
        .stop()
        .catch(() => {})
        .finally(() => {
          scanner.clear();
        });
    };
  }, [active, onScan]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-muted p-8 text-center">
        <p className="text-sm text-destructive font-medium">{error}</p>
        <p className="text-xs text-muted-foreground">
          カメラの権限を確認してください
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div id="scanner-region" ref={containerRef} className="w-full" />
    </div>
  );
}
