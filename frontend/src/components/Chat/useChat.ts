// Chat orchestration hook: messages list, loading/errors, and ask round-trip.
import { useCallback, useState } from "react";
import { ApiClientError, askQuestion } from "@/lib/api";
import type { ChatState, Message } from "./Chat.types";

function friendlyAskError(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.detail || error.message;
  }
  if (error instanceof TypeError) {
    return "Couldn't reach the API — check your connection.";
  }
  return "Something went wrong while fetching an answer.";
}

export function useChat(): {
  messages: Message[];
  chatState: ChatState;
  sendMessage: (question: string) => Promise<void>;
  clearMessages: () => void;
  appendUploadConfirmation: (filename: string, chunksCreated: number) => void;
} {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatState, setChatState] = useState<ChatState>({ status: "idle" });

  const clearMessages = useCallback(() => {
    setMessages([]);
    setChatState({ status: "idle" });
  }, []);

  const appendUploadConfirmation = useCallback((filename: string, chunksCreated: number) => {
    const content = `I've processed **${filename}** (${String(chunksCreated)} chunks created). You can now ask questions about this document.`;
    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, assistantMessage]);
  }, []);

  const sendMessage = useCallback(async (question: string) => {
    const trimmed = question.trim();
    if (trimmed === "") {
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setChatState({ status: "loading" });

    try {
      const response = await askQuestion(trimmed);
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.answer,
        citations: response.citations,
        meta: response.meta,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setChatState({ status: "idle" });
    } catch (error: unknown) {
      setChatState({
        status: "error",
        error: friendlyAskError(error),
      });
    }
  }, []);

  return {
    messages,
    chatState,
    sendMessage,
    clearMessages,
    appendUploadConfirmation,
  };
}
