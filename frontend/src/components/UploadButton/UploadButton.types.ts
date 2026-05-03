// Props and state types for the PDF upload button and its hook.
import type { ChatState } from "@/components/Chat/Chat.types";
import type { ToastVariant } from "@/components/Toast/Toast.types";

export type UploadState =
  | { status: "idle" }
  | { status: "uploading"; filename: string; progress: number }
  | { status: "success"; filename: string; chunksCreated: number }
  | { status: "error"; error: string };

export interface UploadButtonProps {
  chatState: ChatState;
  showToast: (message: string, variant: ToastVariant) => void;
  onUploadProcessed: (filename: string, chunksCreated: number) => void;
}
