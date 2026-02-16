import { type ReactNode } from "react";

interface ScrollSyncedTableProps {
  children: ReactNode;
  maxHeight: string;
}

export default function ScrollSyncedTable({ children, maxHeight }: ScrollSyncedTableProps) {
  return (
    <div className="rounded-lg border border-border" style={{ maxHeight }}>
      <div
        className="overflow-auto h-full [&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-muted/30 [&::-webkit-scrollbar-corner]:bg-transparent"
      >
        {children}
      </div>
    </div>
  );
}
