// Header upload control — `composer` variant matches ChatGPT attach slot (toolbar).
"use client";

import { useRef } from "react";
import type { UploadButtonProps } from "./UploadButton.types";
import { useUpload } from "./useUpload";

export function UploadButton({
  chatState,
  showToast,
  onUploadProcessed,
  variant = "header",
}: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploadState, startUpload } = useUpload(showToast, onUploadProcessed);

  const isQuestionLoading = chatState.status === "loading";
  const isUploadBusy = uploadState.status === "uploading";

  const isComposer = variant === "composer";

  return (
    <div className={isComposer ? "flex flex-col items-start gap-1.5" : "flex flex-col items-end gap-2"}>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file === undefined) {
            return;
          }
          void startUpload(file);
        }}
      />

      {isUploadBusy ? (
        <div className={isComposer ? "w-[min(280px,70vw)]" : "w-40"}>
          <div className="mb-1 flex justify-between text-[11px] text-chatFg-tertiary">
            <span className="truncate">{uploadState.filename}</span>
            <span>{`${String(uploadState.progress)}%`}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full rounded-full bg-chatAccent transition-[width] duration-150"
              style={{ width: `${String(uploadState.progress)}%` }}
            />
          </div>
        </div>
      ) : null}

      <button
        type="button"
        title="Upload PDF document"
        disabled={isQuestionLoading || isUploadBusy}
        onClick={() => {
          inputRef.current?.click();
        }}
        className={
          isComposer
            ? "grid h-9 w-9 shrink-0 place-items-center rounded-full text-chatFg-secondary transition-colors hover:bg-accent/[0.12] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/35 disabled:cursor-not-allowed disabled:opacity-40"
            : "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-surface text-lg text-foreground transition hover:border-accent/35 hover:bg-surface/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent/45 disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        {isUploadBusy ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-chatFg-quaternary border-t-chatFg" />
        ) : (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21.44 11.05 12.25 20.24a5.98 5.98 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-8.49 8.49a2 2 0 1 1-2.83-2.83l7.78-7.78" />
          </svg>
        )}
      </button>
    </div>
  );
}
