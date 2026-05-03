// Hook managing a short-lived toast queue with timed eviction.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ToastItem, ToastVariant } from "./Toast.types";

export function useToast(): {
  toasts: ToastItem[];
  showToast: (message: string, variant: ToastVariant) => void;
  dismissToast: (id: string) => void;
} {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timerId = timersRef.current.get(id);
    if (timerId !== undefined) {
      window.clearTimeout(timerId);
      timersRef.current.delete(id);
    }
  }, []);

  useEffect(() => {
    return () => {
      // Mutable registry of timeouts cleared synchronously on unmount.
      // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup snapshots timersRef map intentionally on teardown only.
      const mapSnapshot = timersRef.current;
      for (const timerId of [...mapSnapshot.values()]) {
        window.clearTimeout(timerId);
      }
      mapSnapshot.clear();
    };
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant) => {
      const id = crypto.randomUUID();
      const toast: ToastItem = { id, message, variant };
      setToasts((prev) => [...prev, toast]);

      const timerId = window.setTimeout(() => {
        dismissToast(id);
      }, 5000);
      timersRef.current.set(id, timerId);
    },
    [dismissToast],
  );

  return { toasts, showToast, dismissToast };
}
