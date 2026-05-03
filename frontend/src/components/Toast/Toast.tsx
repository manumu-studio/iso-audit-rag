// Floating toast stack for lightweight success/error feedback.
"use client";

import type { ToastProps } from "./Toast.types";

export function Toast({ toasts, onDismiss }: ToastProps) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(420px,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto animate-toast-in rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur ${
            toast.variant === "success"
              ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-50"
              : "border-red-400/30 bg-red-500/15 text-red-50"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">{toast.message}</div>
            <button
              type="button"
              onClick={() => {
                onDismiss(toast.id);
              }}
              className="rounded-md px-2 py-1 text-xs text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
