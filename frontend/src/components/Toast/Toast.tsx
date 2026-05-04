// Floating toast stack — ChatGPT-adjacent dark surfaces when shown over `/chat`.
"use client";

import type { ToastProps } from "./Toast.types";

export function Toast({ toasts, onDismiss }: ToastProps) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto animate-toast-in rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur-sm ${
            toast.variant === "success"
              ? "border-emerald-400/25 bg-emerald-950/85 text-emerald-50"
              : "border-red-400/35 bg-chat-sidebar2/95 text-red-50 backdrop-blur-sm"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">{toast.message}</div>
            <button
              type="button"
              onClick={() => {
                onDismiss(toast.id);
              }}
              className="rounded-md px-2 py-1 text-xs text-chatFg-quaternary transition hover:bg-accent/[0.12] hover:text-chatFg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/35"
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
