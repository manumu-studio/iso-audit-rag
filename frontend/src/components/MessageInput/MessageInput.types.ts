// Props for the multiline composer with Enter-to-send semantics.
import type { ChatState } from "@/components/Chat/Chat.types";

export interface MessageInputProps {
  chatState: ChatState;
  onSend: (question: string) => void;
}
