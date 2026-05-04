// Scrollable transcript list with ChatGPT-style spacing and loading dots.
"use client";

import { useEffect, useRef } from "react";

import { MessageBubble } from "@/components/MessageBubble";
import type { MessageListProps } from "./MessageList.types";

export function MessageList({ messages, chatState }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, chatState]);

  return (
    <div className="flex w-full flex-col gap-4 pt-2">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {chatState.status === "loading" ? (
        <div className="flex min-h-8 items-center gap-3 text-base text-chatFg-tertiary">
          <span className="inline-flex gap-1" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span
                key={String(i)}
                className="h-1.5 w-1.5 rounded-full bg-chatFg-tertiary animate-chat-dot"
                style={{ animationDelay: `${String(i * 120)}ms` }}
              />
            ))}
          </span>
          <span>Searching compliance controls...</span>
        </div>
      ) : null}

      <div ref={bottomRef} />
    </div>
  );
}
