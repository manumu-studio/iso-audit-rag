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
  /** Desktop: icon-only rail. Mobile drawer stays full width with labels. */
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
          id="chat-sidebar"
          aria-label="Chat navigation"
          className={`fixed inset-y-0 left-0 z-40 flex w-[260px] shrink-0 flex-col border-r border-chatBorder-light bg-chat-sidebar px-3 py-4 transition-transform duration-200 md:relative md:z-0 md:translate-x-0 md:transition-[width,padding] md:duration-200 md:ease-out ${
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          } ${sidebarCollapsed ? "md:w-14 md:min-w-14 md:max-w-14 md:px-1.5" : "md:w-[260px]"}`}
        >
          <Link
            href="/"
            className={`flex items-center pb-4 transition-opacity hover:opacity-70 ${
              sidebarCollapsed ? "gap-2 px-2 md:justify-center md:gap-0 md:px-0" : "gap-2 px-2"
            }`}
          >
            <Image
              src="/assets/logo-white.webp"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 shrink-0 opacity-90"
              priority
            />
            <div className={`min-w-0 ${sidebarCollapsed ? "md:hidden" : ""}`}>
              <p className="text-sm font-semibold text-chatFg">ISO Audit</p>
              <p className="mt-0.5 text-xs text-chatFg-tertiary">Compliance AI</p>
            </div>
          </Link>

          <nav className="flex flex-col gap-1 px-1">
            <Link
              href="/chat"
              aria-current="page"
              aria-label="Chat"
              title="Chat"
              className={`flex h-9 items-center gap-2 rounded-lg bg-accent/[0.12] text-sm text-chatFg-secondary ${
                sidebarCollapsed ? "justify-start px-2 md:justify-center md:px-0" : "px-2"
              }`}
              onClick={() => {
                setMobileSidebarOpen(false);
              }}
            >
              <svg
                aria-hidden
                className="h-4 w-4 shrink-0 opacity-90"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <span className={sidebarCollapsed ? "md:hidden" : ""}>Chat</span>
            </Link>
          </nav>

          <div className={`mt-auto flex flex-col gap-1 px-2 ${sidebarCollapsed ? "pt-4 md:pt-2" : "pt-6"}`}>
            <p
              className={`text-[11px] font-semibold uppercase tracking-wide text-[var(--chat-sidebar-title-primary)] ${
                sidebarCollapsed ? "md:hidden" : ""
              }`}
            >
              Links
            </p>
            <a
              href="https://github.com/manumu-studio/iso-audit-rag"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub repository"
              title="GitHub"
              className={`flex h-9 items-center gap-2 rounded-lg text-sm text-[var(--chat-sidebar-body-primary)] hover:bg-accent/[0.08] ${
                sidebarCollapsed
                  ? "mt-2 justify-start px-2 md:mt-0 md:justify-center md:px-0"
                  : "mt-2 px-2"
              }`}
            >
              <svg
                aria-hidden
                className="h-4 w-4 shrink-0 opacity-90"
                viewBox="0 0 98 96"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fill="currentColor"
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
                />
              </svg>
              <span className={sidebarCollapsed ? "md:hidden" : ""}>GitHub</span>
            </a>

            <button
              type="button"
              aria-expanded={!sidebarCollapsed}
              aria-controls="chat-sidebar"
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="mt-1 hidden h-9 w-9 shrink-0 items-center justify-center self-center rounded-lg text-chatFg-tertiary hover:bg-accent/[0.08] md:flex"
              onClick={() => {
                setSidebarCollapsed((value) => !value);
              }}
            >
              {sidebarCollapsed ? (
                <svg aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                </svg>
              ) : (
                <svg aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                </svg>
              )}
            </button>
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
