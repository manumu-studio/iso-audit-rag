// ChatGPT-style shell: sidebar + thread column + composer (logic unchanged).
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { MessageInput } from "@/components/MessageInput";
import { MessageList } from "@/components/MessageList";
import { Toast, useToast } from "@/components/Toast";
import { UploadButton } from "@/components/UploadButton";
import { useChat } from "./useChat";

export function Chat() {
  const { messages, chatState, sendMessage, appendUploadConfirmation } = useChat();
  const { toasts, showToast, dismissToast } = useToast();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <>
      <Toast onDismiss={dismissToast} toasts={toasts} />

      <div className="relative flex min-h-0 flex-1 flex-row">
        {mobileSidebarOpen ? (
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
            onClick={() => {
              setMobileSidebarOpen(false);
            }}
          />
        ) : null}

        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-[260px] shrink-0 flex-col border-r border-chatBorder-light bg-chat-sidebar px-3 py-4 transition-transform duration-200 md:relative md:z-0 md:translate-x-0 ${
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          <Link href="/" className="flex items-center gap-2 px-2 pb-4 transition-opacity hover:opacity-70">
            <Image
              src="/assets/logo-white.webp"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 shrink-0 opacity-90"
              priority
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-chatFg">ISO Audit</p>
              <p className="mt-0.5 text-xs text-chatFg-tertiary">Compliance AI</p>
            </div>
          </Link>

          <nav className="flex flex-col gap-1 px-1">
            <Link
              href="/chat"
              aria-current="page"
              className="flex h-9 items-center rounded-lg bg-accent/[0.12] px-2 text-sm text-chatFg-secondary"
              onClick={() => {
                setMobileSidebarOpen(false);
              }}
            >
              Chat
            </Link>
            <Link
              href="/"
              className="flex h-9 items-center rounded-lg px-2 text-sm text-chatFg-secondary transition-colors hover:bg-accent/[0.08]"
              onClick={() => {
                setMobileSidebarOpen(false);
              }}
            >
              Landing
            </Link>
          </nav>

          <div className="mt-auto px-2 pt-6">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--chat-sidebar-title-primary)]">
              Links
            </p>
            <a
              href="https://github.com/manumu-studio/iso-audit-rag"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex h-9 items-center rounded-lg px-2 text-sm text-[var(--chat-sidebar-body-primary)] hover:bg-accent/[0.08]"
            >
              GitHub
            </a>
          </div>
        </aside>

        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-chat-page">
          <div className="flex h-12 shrink-0 items-center gap-2 border-b border-chatBorder-light px-3 md:hidden">
            <button
              type="button"
              aria-label="Open sidebar"
              className="grid h-9 w-9 place-items-center rounded-lg text-chatFg-secondary hover:bg-accent/[0.08]"
              onClick={() => {
                setMobileSidebarOpen(true);
              }}
            >
              <svg aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeWidth={2} />
              </svg>
            </button>
            <span className="text-sm font-medium text-chatFg">Chat</span>
          </div>

          {chatState.status === "error" ? (
            <div className="shrink-0 border-b border-[var(--chat-border-medium)] bg-[var(--chat-bg-elevated-secondary)] px-4 py-2 text-sm text-red-300">
              {chatState.error}
            </div>
          ) : null}

          <div className="@container/main flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-thread px-4 pb-4 pt-3">
                {messages.length === 0 ? (
                  <EmptyState onExampleSelect={sendMessage} />
                ) : (
                  <MessageList chatState={chatState} messages={messages} />
                )}
              </div>
            </div>

            <MessageInput
              chatState={chatState}
              composerStart={
                <UploadButton
                  variant="composer"
                  chatState={chatState}
                  onUploadProcessed={appendUploadConfirmation}
                  showToast={showToast}
                />
              }
              onSend={sendMessage}
            />
          </div>
        </main>
      </div>
    </>
  );
}
