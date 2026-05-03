// Scrollable transcript list with loading tail affordance.
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
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {chatState.status === "loading" ? (
          <div className="mr-auto flex max-w-[85%] items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-sm text-muted shadow-inner shadow-black/20">
            <span className="flex gap-1" aria-hidden="true">
              <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:-0.2s]" />
              <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:-0.1s]" />
              <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-muted" />
            </span>
            <span>Searching compliance controls...</span>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
