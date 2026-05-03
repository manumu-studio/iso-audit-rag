// Primary chat shell: header, transcript, composer, and empty state routing.
"use client";

import { EmptyState } from "@/components/EmptyState";
import { MessageInput } from "@/components/MessageInput";
import { MessageList } from "@/components/MessageList";
import { Toast, useToast } from "@/components/Toast";
import { UploadButton } from "@/components/UploadButton";
import { useChat } from "./useChat";

export function Chat() {
  const { messages, chatState, sendMessage, appendUploadConfirmation } = useChat();
  const { toasts, showToast, dismissToast } = useToast();

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <Toast onDismiss={dismissToast} toasts={toasts} />

      <header className="border-b border-white/10 bg-background/80 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-3xl flex-col gap-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">ISO Audit RAG</h1>
              <p className="text-sm text-muted">Compliance Q&A powered by NIST SP 800-53</p>
            </div>

            <UploadButton
              chatState={chatState}
              onUploadProcessed={appendUploadConfirmation}
              showToast={showToast}
            />
          </div>

          {chatState.status === "error" ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
              {chatState.error}
            </div>
          ) : null}
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden">
        {messages.length === 0 ? (
          <div className="flex flex-1 items-stretch">
            <EmptyState onExampleSelect={sendMessage} />
          </div>
        ) : (
          <MessageList chatState={chatState} messages={messages} />
        )}

        <MessageInput chatState={chatState} onSend={sendMessage} />
      </div>
    </div>
  );
}
