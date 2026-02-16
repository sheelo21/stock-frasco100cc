import { useRef, useEffect, useState, type ReactNode } from "react";

interface ScrollSyncedTableProps {
  children: ReactNode;
  minWidth: number;
  maxHeight: string;
}

export default function ScrollSyncedTable({ children, minWidth, maxHeight }: ScrollSyncedTableProps) {
  const topBarRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(minWidth);

  // Observe actual scroll width of body to sync top bar width
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;

    const updateWidth = () => {
      setContentWidth(body.scrollWidth);
    };

    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(body);
    if (body.firstElementChild) {
      ro.observe(body.firstElementChild);
    }
    return () => ro.disconnect();
  }, [children]);

  // Sync scroll positions using native events
  useEffect(() => {
    const topBar = topBarRef.current;
    const body = bodyRef.current;
    if (!topBar || !body) return;

    let ignoreTop = false;
    let ignoreBody = false;

    const onTopScroll = () => {
      if (ignoreTop) {
        ignoreTop = false;
        return;
      }
      ignoreBody = true;
      body.scrollLeft = topBar.scrollLeft;
    };

    const onBodyScroll = () => {
      if (ignoreBody) {
        ignoreBody = false;
        return;
      }
      ignoreTop = true;
      topBar.scrollLeft = body.scrollLeft;
    };

    topBar.addEventListener("scroll", onTopScroll);
    body.addEventListener("scroll", onBodyScroll);
    return () => {
      topBar.removeEventListener("scroll", onTopScroll);
      body.removeEventListener("scroll", onBodyScroll);
    };
  }, []);

  return (
    <div className="rounded-lg border border-border flex flex-col" style={{ maxHeight }}>
      {/* Top scrollbar — always-visible native scrollbar */}
      <div
        ref={topBarRef}
        className="shrink-0 border-b border-border top-scrollbar-wrapper"
        style={{ overflowX: "scroll", overflowY: "hidden" }}
      >
        <div style={{ height: 1, width: contentWidth }} />
      </div>
      {/* Table body */}
      <div
        ref={bodyRef}
        className="overflow-auto flex-1 bottom-scrollbar-wrapper"
      >
        {children}
      </div>

      <style>{`
        .top-scrollbar-wrapper,
        .bottom-scrollbar-wrapper {
          scrollbar-width: thin;
          scrollbar-color: hsl(var(--border)) hsl(var(--muted) / 0.3);
        }
        .top-scrollbar-wrapper::-webkit-scrollbar,
        .bottom-scrollbar-wrapper::-webkit-scrollbar {
          height: 12px;
        }
        .top-scrollbar-wrapper::-webkit-scrollbar-thumb,
        .bottom-scrollbar-wrapper::-webkit-scrollbar-thumb {
          background-color: hsl(var(--border));
          border-radius: 9999px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
        .top-scrollbar-wrapper::-webkit-scrollbar-thumb:hover,
        .bottom-scrollbar-wrapper::-webkit-scrollbar-thumb:hover {
          background-color: hsl(var(--muted-foreground) / 0.4);
        }
        .top-scrollbar-wrapper::-webkit-scrollbar-track,
        .bottom-scrollbar-wrapper::-webkit-scrollbar-track {
          background: hsl(var(--muted) / 0.3);
        }
      `}</style>
    </div>
  );
}
