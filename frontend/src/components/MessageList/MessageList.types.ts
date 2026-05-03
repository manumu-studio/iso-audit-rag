// Props for the scrolling transcript between user and assistant turns.
import type { ChatState, Message } from "@/components/Chat/Chat.types";

export interface MessageListProps {
  messages: Message[];
  chatState: ChatState;
}
