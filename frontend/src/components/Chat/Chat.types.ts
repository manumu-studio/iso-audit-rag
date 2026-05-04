// Props and domain types for the chat shell (messages, sending state).
import type { Citation, MetaInfo } from "@/lib/api";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  meta?: MetaInfo;
  /** True while SSE tokens are still arriving for this assistant turn. */
  streaming?: boolean;
  timestamp: Date;
}

export type ChatState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "streaming" }
  | { status: "error"; error: string };
