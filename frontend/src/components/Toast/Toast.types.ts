// Toast item model for queued ephemeral notifications.
export type ToastVariant = "success" | "error";

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

export interface ToastProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}
