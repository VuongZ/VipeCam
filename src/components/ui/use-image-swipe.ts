"use client";
import { useRef, type TouchEvent, type MouseEvent } from "react";

export function useImageSwipe(onMove: (direction: number) => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  return {
    onTouchStart(event: TouchEvent<HTMLElement>) {
      swiped.current = false;
      start.current =
        event.touches.length === 1 &&
        !(event.target as Element).closest("button")
          ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
          : null;
    },
    onTouchEnd(event: TouchEvent<HTMLElement>) {
      const origin = start.current;
      start.current = null;
      const end = event.changedTouches[0];
      if (!origin || !end) return;
      const dx = end.clientX - origin.x;
      const dy = end.clientY - origin.y;
      if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        swiped.current = true;
        onMove(dx < 0 ? 1 : -1);
      }
    },
    onTouchCancel() {
      start.current = null;
    },
    onClickCapture(event: MouseEvent<HTMLElement>) {
      if (swiped.current && !(event.target as Element).closest("button")) {
        event.preventDefault();
        event.stopPropagation();
        swiped.current = false;
      }
    },
  };
}
