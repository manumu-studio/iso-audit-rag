// Calibre-aligned composer (inherits landing palette inside `.chat-shell`).
"use client";

import { useEffect, useRef, useState } from "react";

import type { MessageInputProps } from "./MessageInput.types";

const MAX_TEXTAREA_PX = 208; /* ~max-h-52 */

export function MessageInput({ chatState, onSend, composerStart }: MessageInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) {
      return;
    }
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, MAX_TEXTAREA_PX)}px`;
  }, [value]);

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
    <form
      className="sticky bottom-0 z-10 shrink-0 bg-chat-page px-4 pb-3 pt-2"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="mx-auto w-full max-w-thread rounded-chat-composer bg-chat-composer p-2.5 shadow-chat-composer transition-colors focus-within:ring-1 focus-within:ring-accent/35">
        <textarea
          ref={textareaRef}
          value={value}
          disabled={isBusy}
          placeholder="Ask about compliance controls..."
          rows={1}
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
          className="block max-h-52 min-h-[44px] w-full resize-none bg-transparent px-3 py-2 text-base leading-6 text-chatFg outline-none placeholder:text-chatFg-placeholder disabled:cursor-not-allowed disabled:opacity-50"
        />

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex min-w-0 flex-1 items-center gap-1">{composerStart}</div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="submit"
              aria-label="Send"
              disabled={isBusy || value.trim() === ""}
              className="grid h-9 w-9 place-items-center rounded-full bg-accent text-primary shadow-cal-cta transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg
                aria-hidden
                className="h-4 w-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.25}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-2 flex max-w-thread flex-col gap-1 px-1">
        <p className="text-center text-xs text-chatFg-quaternary">
          Answers cite retrieved controls — verify for audits and regulated use.
        </p>
        <span className="text-right text-[11px] tabular-nums text-chatFg-quaternary">
          {value.length}/4000
        </span>
      </div>
    </form>
  );
}
