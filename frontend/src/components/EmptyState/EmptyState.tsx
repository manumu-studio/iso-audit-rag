// Empty chat — ChatGPT-style greeting + rounded suggestion chips.
import type { EmptyStateProps } from "./EmptyState.types";

const EXAMPLES = [
  "What is AC-2 (Account Management)?",
  "Which controls address password policies?",
  "How should audit logs be protected?",
  "What are the requirements for incident response?",
] satisfies readonly string[];

export function EmptyState({ onExampleSelect }: EmptyStateProps) {
  return (
    <div className="flex min-h-[min(520px,calc(100dvh-280px))] w-full flex-col items-center justify-center gap-8 px-2 py-12">
      <div className="flex max-w-thread flex-col items-center gap-2 text-center">
        <h1 className="text-base font-normal leading-6 text-chatFg">What are you working on?</h1>
        <p className="max-w-md text-sm leading-5 text-chatFg-tertiary">
          Ask about NIST SP 800-53 controls. Answers include clause citations when available.
        </p>
      </div>

      <div className="flex w-full max-w-thread flex-wrap items-center justify-center gap-2">
        {EXAMPLES.map((question) => (
          <button
            key={question}
            type="button"
            onClick={() => {
              onExampleSelect(question);
            }}
            className="inline-flex max-w-full items-center rounded-full border border-chatBorder-medium bg-transparent px-3.5 py-2 text-left text-sm leading-snug text-chatFg-secondary transition-colors hover:bg-accent/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/35"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
