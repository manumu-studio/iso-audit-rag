// Collapsible panel listing retrieved controls with relevance scoring.
"use client";

import { useMemo, useState } from "react";
import { citationAnchorId } from "@/lib/citation-anchor";
import type { CitationPanelProps } from "./CitationPanel.types";

function relevancePercent(score: number): number {
  if (score >= 0 && score <= 1) {
    return Math.round(score * 100);
  }
  return Math.round(Math.min(100, Math.max(0, score)));
}

export function CitationPanel({ citations }: CitationPanelProps) {
  const [open, setOpen] = useState(false);

  const sorted = useMemo(() => {
    return [...citations].sort((a, b) => b.relevance_score - a.relevance_score);
  }, [citations]);

  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-black/20">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
        }}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-medium text-foreground transition hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span>Sources ({String(sorted.length)} controls)</span>
        <span className="text-muted">{open ? "▾" : "▸"}</span>
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-2 px-3 pb-3 pt-1">
            {sorted.map((citation) => {
              const percent = relevancePercent(citation.relevance_score);
              return (
                <div
                  key={citation.control_id}
                  id={citationAnchorId(citation.control_id)}
                  className="rounded-lg border border-white/10 bg-surface/60 px-3 py-2 transition"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="font-mono text-sm font-semibold text-primary">
                      {citation.control_id}
                    </div>
                    <div className="text-xs text-muted">{`${String(percent)}% match`}</div>
                  </div>
                  <div className="mt-1 text-sm font-medium text-foreground">{citation.title}</div>
                  <div className="mt-1 text-xs text-muted">{citation.family}</div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/30">
                    <div
                      className="h-full rounded-full bg-primary/70"
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
