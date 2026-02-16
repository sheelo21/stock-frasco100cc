import { useRef, useEffect, useState, useCallback, type ReactNode } from "react";

interface ScrollSyncedTableProps {
  children: ReactNode;
  minWidth: number;
  maxHeight: string;
}

export default function ScrollSyncedTable({ children, minWidth, maxHeight }: ScrollSyncedTableProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [thumbWidth, setThumbWidth] = useState(0);
  const [thumbLeft, setThumbLeft] = useState(0);
  const [showThumb, setShowThumb] = useState(false);
  const dragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartLeft = useRef(0);

  // Calculate thumb size and position
  const updateThumb = useCallback(() => {
    const body = bodyRef.current;
    const track = trackRef.current;
    if (!body || !track) return;

    const { scrollWidth, clientWidth, scrollLeft } = body;
    if (scrollWidth <= clientWidth) {
      setShowThumb(false);
      return;
    }
    setShowThumb(true);
    const trackWidth = track.clientWidth;
    const ratio = clientWidth / scrollWidth;
    const tw = Math.max(ratio * trackWidth, 40);
    const maxLeft = trackWidth - tw;
    const scrollRatio = scrollLeft / (scrollWidth - clientWidth);
    setThumbWidth(tw);
    setThumbLeft(scrollRatio * maxLeft);
  }, []);

  // Update on scroll
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const onScroll = () => updateThumb();
    body.addEventListener("scroll", onScroll, { passive: true });
    return () => body.removeEventListener("scroll", onScroll);
  }, [updateThumb]);

  // Update on resize
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    updateThumb();
    const ro = new ResizeObserver(() => updateThumb());
    ro.observe(body);
    if (body.firstElementChild) ro.observe(body.firstElementChild);
    return () => ro.disconnect();
  }, [updateThumb, children]);

  // Drag handling
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = true;
    dragStartX.current = e.clientX;
    dragStartLeft.current = thumbLeft;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [thumbLeft]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const body = bodyRef.current;
    const track = trackRef.current;
    if (!body || !track) return;

    const dx = e.clientX - dragStartX.current;
    const trackWidth = track.clientWidth;
    const maxLeft = trackWidth - thumbWidth;
    const newLeft = Math.max(0, Math.min(maxLeft, dragStartLeft.current + dx));
    const scrollRatio = newLeft / maxLeft;
    body.scrollLeft = scrollRatio * (body.scrollWidth - body.clientWidth);
  }, [thumbWidth]);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  // Click on track to jump
  const onTrackClick = useCallback((e: React.MouseEvent) => {
    const body = bodyRef.current;
    const track = trackRef.current;
    if (!body || !track) return;
    const rect = track.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const trackWidth = track.clientWidth;
    const scrollRatio = clickX / trackWidth;
    body.scrollLeft = scrollRatio * (body.scrollWidth - body.clientWidth) - (body.clientWidth / 2);
  }, []);

  return (
    <div className="rounded-lg border border-border flex flex-col" style={{ maxHeight }}>
      {/* Custom top scrollbar track */}
      {showThumb && (
        <div
          ref={trackRef}
          className="shrink-0 relative bg-muted/30 border-b border-border cursor-pointer select-none"
          style={{ height: 14 }}
          onClick={onTrackClick}
        >
          <div
            ref={thumbRef}
            className="absolute top-1 h-[6px] rounded-full bg-border hover:bg-muted-foreground/40 active:bg-muted-foreground/50 cursor-grab active:cursor-grabbing transition-colors"
            style={{ width: thumbWidth, left: thumbLeft }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      {/* Table body */}
      <div
        ref={bodyRef}
        className="overflow-auto flex-1 [&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-muted/30"
      >
        {children}
      </div>
    </div>
  );
}
