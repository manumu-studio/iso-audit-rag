// Inline control-reference pill that jumps to the matching Sources row.
"use client";

import type { CitationPillProps } from "./CitationPill.types";
import { citationAnchorId } from "@/lib/citation-anchor";

export function CitationPill({ controlId }: CitationPillProps) {
  return (
    <button
      type="button"
      onClick={() => {
        const targetId = citationAnchorId(controlId);
        const node = document.getElementById(targetId);
        node?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        node?.classList.add("ring-2", "ring-primary/70");
        window.setTimeout(() => {
          node?.classList.remove("ring-2", "ring-primary/70");
        }, 1200);
      }}
      className="mx-0.5 inline-flex items-center rounded-full bg-primary/20 px-2 py-0.5 align-baseline font-mono text-[11px] font-semibold text-primary transition hover:bg-primary/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {controlId}
    </button>
  );
}
