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
        node?.classList.add("ring-2", "ring-[#84a9ce]/50");
        window.setTimeout(() => {
          node?.classList.remove("ring-2", "ring-[#84a9ce]/50");
        }, 1200);
      }}
      className="mx-0.5 inline-flex cursor-pointer items-center rounded-full border border-[#84a9ce]/40 bg-[#84a9ce]/10 px-2 py-0.5 align-baseline font-chatMono text-[11px] font-semibold leading-normal text-[#84a9ce] outline-none transition hover:bg-[#84a9ce]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#84a9ce]/55"
    >
      {controlId}
    </button>
  );
}
