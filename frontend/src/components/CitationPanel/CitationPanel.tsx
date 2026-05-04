// Collapsible sources panel — Calibre surfaces (matches landing frost panels).
"use client";

import { useMemo, useState } from "react";

import { citationAnchorId } from "@/lib/citation-anchor";
import type { CitationPanelProps } from "./CitationPanel.types";

export function CitationPanel({ citations }: CitationPanelProps) {
  const [open, setOpen] = useState(false);

  const sorted = useMemo(() => {
    return [...citations].sort((a, b) => b.relevance_score - a.relevance_score);
  }, [citations]);

  const maxScore = sorted[0]?.relevance_score ?? 0;

  return (
    <div className="mt-4 rounded-chat-code border border-chatBorder-light bg-chat-sidebar2/80">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
        }}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-medium text-chatFg transition hover:bg-accent/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/35"
      >
        <span>Sources ({String(sorted.length)} controls)</span>
        <span className="text-chatFg-tertiary">{open ? "▾" : "▸"}</span>
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-2 px-3 pb-3 pt-1">
            {sorted.map((citation) => {
              const percent =
                maxScore > 0 ? Math.round((citation.relevance_score / maxScore) * 100) : 0;
              return (
                <div
                  key={citation.control_id}
                  id={citationAnchorId(citation.control_id)}
                  className="rounded-lg border border-chatBorder-light bg-chat-mainStrip/80 px-3 py-2 transition"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="font-chatMono text-sm font-semibold text-primary">
                      {citation.control_id}
                    </div>
                    <div className="text-xs text-chatFg-tertiary">{`${String(percent)}% match`}</div>
                  </div>
                  <div className="mt-1 text-sm font-medium text-chatFg">{citation.title}</div>
                  <div className="mt-1 text-xs text-chatFg-tertiary">{citation.family}</div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-primary/25">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{
                        width: `${String(Math.min(100, Math.max(0, percent)))}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
