import { useRef } from 'react';

/**
 * Pointer-based swipe + tap + double-tap.
 * Works identically with mouse and touch.
 */
export function useSwipe({
  onSwipeLeft, onSwipeRight, onTap, onDoubleTap,
  threshold = 60, tapMaxMs = 260, tapMaxDist = 10, doubleTapMs = 300,
}) {
  const start = useRef(null);
  const moved = useRef(false);
  const lastTapAt = useRef(0);
  const singleTimer = useRef(null);

  return {
    onPointerDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      start.current = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
      moved.current = false;
    },
    onPointerMove(e) {
      const s = start.current;
      if (!s || e.pointerId !== s.id) return;
      if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > tapMaxDist) moved.current = true;
    },
    onPointerUp(e) {
      const s = start.current;
      start.current = null;
      if (!s || e.pointerId !== s.id) return;

      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      const dt = performance.now() - s.t;

      if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy) * 1.3) {
        dx < 0 ? onSwipeLeft?.() : onSwipeRight?.();
        return;
      }
      if (moved.current || dt > tapMaxMs || Math.hypot(dx, dy) > tapMaxDist) return;

      const now = performance.now();
      if (now - lastTapAt.current < doubleTapMs) {
        clearTimeout(singleTimer.current);
        lastTapAt.current = 0;
        onDoubleTap?.(e);
      } else {
        lastTapAt.current = now;
        singleTimer.current = setTimeout(() => {
          lastTapAt.current = 0;
          onTap?.(e);
        }, doubleTapMs);
      }
    },
    onPointerCancel() { start.current = null; },
  };
}
