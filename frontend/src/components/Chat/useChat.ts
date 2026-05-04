// Chat orchestration hook: messages list, loading/errors, and ask round-trip.
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiClientError, askQuestion, askQuestionStream } from "@/lib/api";
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

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
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
  const streamAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort();
    };
  }, []);

  const clearMessages = useCallback(() => {
    streamAbortRef.current?.abort();
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

    streamAbortRef.current?.abort();
    const controller = new AbortController();
    streamAbortRef.current = controller;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    const assistantId = crypto.randomUUID();
    const assistantPlaceholder: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      streaming: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setChatState({ status: "loading" });

    const removeAssistantPlaceholder = (): void => {
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    };

    const applyBlockingAnswer = async (): Promise<void> => {
      const response = await askQuestion(trimmed);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: response.answer,
                citations: response.citations,
                meta: response.meta,
                streaming: false,
              }
            : m,
        ),
      );
      setChatState({ status: "idle" });
    };

    try {
      await askQuestionStream(
        trimmed,
        {
          onToken: (text) => {
            setChatState({ status: "streaming" });
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + text } : m)),
            );
          },
          onDone: (citations, meta) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, citations, meta, streaming: false } : m,
              ),
            );
            setChatState({ status: "idle" });
          },
          onError: () => {
            /* Failures are signaled by rejected promise from askQuestionStream */
          },
        },
        controller.signal,
      );
    } catch (error: unknown) {
      if (isAbortError(error)) {
        removeAssistantPlaceholder();
        setChatState({ status: "idle" });
        return;
      }
      try {
        await applyBlockingAnswer();
      } catch (fallbackError: unknown) {
        removeAssistantPlaceholder();
        setChatState({
          status: "error",
          error: friendlyAskError(fallbackError),
        });
      }
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
