import { useCallback, useEffect, useRef, useState } from "react";

interface UseHoverRevealOptions {
  disabled?: boolean;
  locked?: boolean;
  closeDelayMs?: number;
}

export function useHoverReveal({
  disabled = false,
  locked = false,
  closeDelayMs = 280,
}: UseHoverRevealOptions = {}) {
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const enter = useCallback(() => {
    if (disabled) return;
    clearTimer();
    setHovered(true);
  }, [clearTimer, disabled]);

  const leave = useCallback(() => {
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      setHovered(false);
    }, closeDelayMs);
  }, [clearTimer, closeDelayMs]);

  const close = useCallback(() => {
    clearTimer();
    setHovered(false);
    setPinned(false);
  }, [clearTimer]);

  const togglePinned = useCallback(() => {
    if (disabled) return;
    clearTimer();
    setPinned((prev) => {
      const next = !prev;
      if (!next) setHovered(false);
      return next;
    });
  }, [clearTimer, disabled]);

  const openPinned = useCallback(() => {
    if (disabled) return;
    clearTimer();
    setPinned(true);
  }, [clearTimer, disabled]);

  useEffect(() => {
    if (disabled) {
      clearTimer();
      setHovered(false);
      setPinned(false);
    }
  }, [disabled, clearTimer]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const visible = !disabled && (hovered || pinned || locked);

  return {
    visible,
    pinned,
    enter,
    leave,
    close,
    togglePinned,
    openPinned,
  };
}

export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(hover: none), (pointer: coarse)").matches;
  });

  useEffect(() => {
    const mq = window.matchMedia("(hover: none), (pointer: coarse)");
    const update = () => setIsTouch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isTouch;
}
