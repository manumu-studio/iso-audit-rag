// Empty chat state with starter prompts for common compliance questions.
import type { EmptyStateProps } from "./EmptyState.types";

const EXAMPLES = [
  "What is AC-2 (Account Management)?",
  "Which controls address password policies?",
  "How should audit logs be protected?",
  "What are the requirements for incident response?",
] satisfies readonly string[];

export function EmptyState({ onExampleSelect }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <div className="space-y-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface text-xl font-semibold text-primary shadow-lg shadow-primary/20">
          IA
        </div>
        <h2 className="text-xl font-semibold text-foreground">Ask about NIST SP 800-53 controls</h2>
        <p className="max-w-md text-sm text-muted">Get answers with exact clause citations</p>
      </div>

      <div className="grid w-full max-w-xl gap-3 sm:grid-cols-2">
        {EXAMPLES.map((question) => (
          <button
            key={question}
            type="button"
            onClick={() => {
              onExampleSelect(question);
            }}
            className="rounded-xl border border-white/10 bg-surface px-4 py-3 text-left text-sm text-foreground transition hover:border-primary/40 hover:bg-surface/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
