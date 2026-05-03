// Compact footer summarizing model, retrieval mode, and latency.
import type { MetaFooterProps } from "./MetaFooter.types";

export function MetaFooter({ meta }: MetaFooterProps) {
  const seconds = (meta.latency_ms / 1000).toFixed(1);
  const text = `${meta.model} · ${meta.search_method} · ${seconds}s`;

  return (
    <div className="mt-2 text-xs text-muted">
      <span>{text}</span>
      <span className="mx-2 text-white/20">·</span>
      <span>{`${String(meta.controls_searched)} controls searched`}</span>
    </div>
  );
}
