// Props and internal types for rendering a single transcript bubble.
import type { Message } from "@/components/Chat/Chat.types";

export type Segment = { kind: "text"; value: string } | { kind: "cite"; controlId: string };

export interface MarkdownChunkProps {
  content: string;
}

export interface AssistantBodyProps {
  message: Message;
}

export interface MessageBubbleProps {
  message: Message;
}
