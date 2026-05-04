// Rich assistant rendering with markdown segments, sources, copy toolbar, ChatGPT surfaces.
"use client";

import React, { type ReactNode, useCallback, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";

import { CitationPill } from "@/components/CitationPill";
import { CitationPanel } from "@/components/CitationPanel";
import { MetaFooter } from "@/components/MetaFooter";
import type {
  AssistantBodyProps,
  MarkdownChunkProps,
  MessageBubbleProps,
  Segment,
} from "./MessageBubble.types";

function splitCitationSegments(markdown: string): Segment[] {
  const pattern = /\[([A-Z]{2}-\d+(?:\(\d+\))?)\]/g;
  const segments: Segment[] = [];
  let lastIndex = 0;
  let match = pattern.exec(markdown);
  while (match !== null) {
    const start = match.index;
    if (start > lastIndex) {
      segments.push({ kind: "text", value: markdown.slice(lastIndex, start) });
    }
    const controlId = match[1];
    if (controlId !== undefined && controlId !== "") {
      segments.push({ kind: "cite", controlId });
    }
    lastIndex = start + match[0].length;
    match = pattern.exec(markdown);
  }
  if (lastIndex < markdown.length) {
    segments.push({ kind: "text", value: markdown.slice(lastIndex) });
  }
  return segments;
}

function textFromNodes(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(textFromNodes).join("");
  }
  if (React.isValidElement(node) && node.props !== null && typeof node.props === "object") {
    const props = node.props as { children?: ReactNode };
    return textFromNodes(props.children);
  }
  return "";
}

function MarkdownCodeBlock({ children }: { children?: ReactNode }) {
  const [copied, setCopied] = useState(false);

  let language = "text";
  let codeChild: React.ReactElement<{ className?: string; children?: ReactNode }> | null = null;

  try {
    const only = React.Children.only(children);
    if (React.isValidElement(only) && only.type === "code") {
      codeChild = only as React.ReactElement<{ className?: string; children?: ReactNode }>;
    }
  } catch {
    codeChild = null;
  }

  if (codeChild === null) {
    return <pre className="my-4 overflow-x-auto font-chatMono text-[14px] text-chatFg">{children}</pre>;
  }

  const cls = codeChild.props.className ?? "";
  const langMatch = /language-([\w-]+)/.exec(cls);
  if (langMatch?.[1] !== undefined && langMatch[1] !== "") {
    language = langMatch[1];
  }

  const handleCopy = async (): Promise<void> => {
    const text = textFromNodes(codeChild?.props.children);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => {
        setCopied(false);
      }, 1600);
    } catch {
      /* ignore */
    }
  };

  const mergedCode = React.cloneElement(codeChild, {
    className: `${cls} font-chatMono text-[14px] leading-6 text-chatFg`,
  });

  return (
    <div className="my-4 overflow-hidden rounded-chat-code border border-chatBorder-light bg-chat-codeBg">
      <div className="flex h-9 items-center justify-between bg-chat-codeHead px-4 text-xs text-chatFg-tertiary">
        <span className="inline-flex items-center gap-2 font-medium capitalize">{language}</span>
        <button
          type="button"
          onClick={() => {
            void handleCopy();
          }}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-chatFg-tertiary transition hover:bg-accent/[0.08] hover:text-chatFg-secondary"
        >
          <svg aria-hidden className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v12a2 2 0 01-2 2h-6"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3">{mergedCode}</pre>
    </div>
  );
}

function MarkdownChunk({ content }: MarkdownChunkProps) {
  if (content === "") {
    return null;
  }

  const markdownComponents: Components = {
    p: ({ children }) => (
      <p className="my-4 text-pretty text-base leading-[1.625rem] text-chatFg first:mt-0 last:mb-0">{children}</p>
    ),
    ul: ({ children }) => (
      <ul className="my-4 list-disc space-y-1 pl-6 text-base leading-[1.625rem] text-chatFg">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="my-4 list-decimal space-y-1 pl-6 text-base leading-[1.625rem] text-chatFg">{children}</ol>
    ),
    li: ({ children }) => <li>{children}</li>,
    strong: ({ children }) => <strong className="font-semibold text-chatFg">{children}</strong>,
    h2: ({ children }) => (
      <h2 className="mt-6 text-[1.5rem] font-semibold leading-[1.75rem] text-chatFg first:mt-0">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-5 text-[1.125rem] font-semibold leading-[1.625rem] text-chatFg first:mt-0">{children}</h3>
    ),
    a: ({ href, children }) =>
      href !== undefined && href !== "" ? (
        <a
          href={href}
          className="text-accent underline underline-offset-2 hover:text-accent hover:opacity-90"
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      ) : (
        <span>{children}</span>
      ),
    code: (props) => {
      const { className, children } = props;
      const inline = "inline" in props && props.inline === true;
      if (!inline) {
        return <code className={className}>{children}</code>;
      }
      return (
        <code className="rounded-[4px] bg-chat-tertiary px-[0.3em] py-[0.15em] font-chatMono text-[14px] text-chatFg">
          {children}
        </code>
      );
    },
    pre: ({ children }) => <MarkdownCodeBlock>{children}</MarkdownCodeBlock>,
  };

  return <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>;
}

function CopyToolbar({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => {
        setCopied(false);
      }, 1600);
    } catch {
      /* ignore */
    }
  }, [text]);

  return (
    <div className="mt-1 flex h-8 items-center gap-1 opacity-0 transition-opacity duration-150 group-hover/msg:opacity-100">
      <button
        type="button"
        aria-label={copied ? "Copied" : "Copy message"}
        title={copied ? "Copied" : "Copy"}
        onClick={() => {
          void handleCopy();
        }}
        className="grid h-7 w-7 place-items-center rounded-md text-chatFg-tertiary transition hover:bg-accent/[0.08] hover:text-chatFg-secondary"
      >
        <svg aria-hidden className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v12a2 2 0 01-2 2h-6"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        </svg>
      </button>
      {copied ? <span className="text-[11px] text-chatFg-tertiary">Copied</span> : null}
    </div>
  );
}

function AssistantBody({ message }: AssistantBodyProps) {
  const segments = splitCitationSegments(message.content);

  return (
    <div className="space-y-2">
      <div className="leading-relaxed">
        {segments.map((segment, index) =>
          segment.kind === "cite" ? (
            <CitationPill
              key={`${message.id}-cite-${String(index)}-${segment.controlId}`}
              controlId={segment.controlId}
            />
          ) : (
            <MarkdownChunk key={`${message.id}-md-${String(index)}`} content={segment.value} />
          ),
        )}
      </div>

      {message.citations !== undefined && message.citations.length > 0 ? (
        <CitationPanel citations={message.citations} />
      ) : null}

      {message.meta !== undefined ? <MetaFooter meta={message.meta} /> : null}
    </div>
  );
}

export function MessageBubble({ message }: MessageBubbleProps) {
  if (message.role === "user") {
    return (
      <div className="group/msg flex w-full animate-chat-msg-in justify-end">
        <div className="flex max-w-[70%] flex-col items-end gap-1">
          <div className="rounded-chat-bubble bg-chat-userBubble px-4 py-2.5 text-base leading-6 text-[var(--chat-user-msg-text)]">
            <div className="whitespace-pre-wrap break-words">{message.content}</div>
          </div>
          <CopyToolbar text={message.content} />
        </div>
      </div>
    );
  }

  const plainForCopy = message.content;

  return (
    <div className="group/msg w-full animate-chat-msg-in">
      <div className="min-h-8 w-full break-words text-base leading-[1.625rem] text-chatFg">
        <AssistantBody message={message} />
      </div>
      <CopyToolbar text={plainForCopy} />
    </div>
  );
}
