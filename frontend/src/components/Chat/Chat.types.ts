// Props and domain types for the chat shell (messages, sending state).
import type { Citation, MetaInfo } from "@/lib/api";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  meta?: MetaInfo;
  timestamp: Date;
}

export type ChatState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: string };
