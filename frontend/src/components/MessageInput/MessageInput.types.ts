// Props for the multiline composer with Enter-to-send semantics.
import type { ReactNode } from "react";

import type { ChatState } from "@/components/Chat/Chat.types";

export interface MessageInputProps {
  chatState: ChatState;
  onSend: (question: string) => void;
  /** ChatGPT-style leading toolbar slot (e.g. PDF attach). */
  composerStart?: ReactNode;
}
