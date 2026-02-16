import { useRef, useCallback, type ReactNode } from "react";

interface ScrollSyncedTableProps {
  children: ReactNode;
  minWidth: number;
  maxHeight: string;
}

export default function ScrollSyncedTable({ children, minWidth, maxHeight }: ScrollSyncedTableProps) {
  const topBarRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  const handleTopScroll = useCallback(() => {
    if (syncing.current) return;
    syncing.current = true;
    if (bodyRef.current && topBarRef.current) {
      bodyRef.current.scrollLeft = topBarRef.current.scrollLeft;
    }
    syncing.current = false;
  }, []);

  const handleBodyScroll = useCallback(() => {
    if (syncing.current) return;
    syncing.current = true;
    if (topBarRef.current && bodyRef.current) {
      topBarRef.current.scrollLeft = bodyRef.current.scrollLeft;
    }
    syncing.current = false;
  }, []);

  const scrollbarClasses =
    "[&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-muted/30";

  return (
    <div className="rounded-lg border border-border flex flex-col" style={{ maxHeight }}>
      {/* Top scrollbar */}
      <div
        ref={topBarRef}
        className={`shrink-0 ${scrollbarClasses}`}
        style={{ overflowX: "scroll", overflowY: "hidden" }}
        onScroll={handleTopScroll}
      >
        <div style={{ height: 1, minWidth }} />
      </div>
      {/* Table body */}
      <div
        ref={bodyRef}
        className={`overflow-auto flex-1 ${scrollbarClasses}`}
        style={{ overflowX: "scroll" }}
        onScroll={handleBodyScroll}
      >
        {children}
      </div>
    </div>
  );
}
