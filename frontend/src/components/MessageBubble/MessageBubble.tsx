// Rich assistant rendering with markdown segments, sources, and metadata.
"use client";

import ReactMarkdown from "react-markdown";
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

function MarkdownChunk({ content }: MarkdownChunkProps) {
  if (content === "") {
    return null;
  }

  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => (
          <p className="mb-3 text-pretty leading-relaxed text-foreground last:mb-0">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="mb-3 list-disc space-y-1 pl-5 text-foreground">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-3 list-decimal space-y-1 pl-5 text-foreground">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
        code: ({ className, children }) => {
          const isBlock = typeof className === "string" && className.includes("language-");
          if (isBlock) {
            return (
              <code className={`${className} font-mono text-xs text-foreground`}>{children}</code>
            );
          }
          return (
            <code className="rounded bg-black/30 px-1 py-0.5 font-mono text-[0.95em] text-foreground">
              {children}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre className="mb-3 overflow-x-auto rounded-lg bg-black/40 p-3 text-xs text-foreground">
            {children}
          </pre>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
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
      <div className="ml-auto max-w-[85%] rounded-2xl bg-primary px-4 py-3 text-sm text-white shadow-md shadow-primary/25">
        <div className="whitespace-pre-wrap break-words">{message.content}</div>
      </div>
    );
  }

  return (
    <div className="mr-auto max-w-[85%] rounded-2xl bg-surface px-4 py-3 text-sm text-foreground shadow-inner shadow-black/20">
      <AssistantBody message={message} />
    </div>
  );
}
