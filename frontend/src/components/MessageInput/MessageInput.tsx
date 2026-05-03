// Chat composer: textarea + send control with Shift+Enter for newlines.
"use client";

import { useEffect, useRef, useState } from "react";
import type { MessageInputProps } from "./MessageInput.types";

export function MessageInput({ chatState, onSend }: MessageInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const isBusy = chatState.status === "loading";

  const submit = (): void => {
    const trimmed = value.trim();
    if (trimmed === "" || isBusy) {
      return;
    }
    setValue("");
    onSend(trimmed);
  };

  return (
    <div className="border-t border-white/10 bg-background/90 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex max-w-3xl gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          disabled={isBusy}
          placeholder="Ask about compliance controls..."
          rows={2}
          maxLength={4000}
          onChange={(event) => {
            setValue(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          className="min-h-[52px] flex-1 resize-none rounded-xl border border-white/10 bg-surface px-3 py-2 text-sm text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary/40 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          type="button"
          disabled={isBusy || value.trim() === ""}
          onClick={() => {
            submit();
          }}
          className="inline-flex h-[52px] min-w-[96px] items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </div>
      <div className="mx-auto mt-2 flex max-w-3xl justify-between text-[11px] text-muted">
        <span>Enter to send · Shift+Enter for newline</span>
        <span>{value.length}/4000</span>
      </div>
    </div>
  );
}
