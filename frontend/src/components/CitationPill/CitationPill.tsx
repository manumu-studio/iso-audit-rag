// Inline control-reference pill — landing accent / primary chips.
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
        node?.classList.add("ring-2", "ring-primary/50");
        window.setTimeout(() => {
          node?.classList.remove("ring-2", "ring-primary/50");
        }, 1200);
      }}
      className="mx-0.5 inline-flex cursor-pointer items-center rounded-full border border-primary/60 bg-accent px-2 py-0.5 align-baseline font-chatMono text-[11px] font-semibold leading-normal text-primary shadow-md shadow-primary/30 outline-none transition hover:brightness-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/55"
    >
      {controlId}
    </button>
  );
}
