// Footer — same background rail as chat (`bg-background`, muted links).

import Link from "next/link";

import type { LandingFooterProps } from "./LandingFooter.types";

export function LandingFooter({ className }: LandingFooterProps) {
  return (
    <footer className={`bg-background px-4 py-14 md:px-6 ${className ?? ""}`}>
      <div className="mx-auto grid max-w-[1000px] gap-10 md:grid-cols-3 md:gap-12">
        <div>
          <p className="text-lg font-semibold text-foreground">iso-audit-rag</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            AI-powered compliance document search
          </p>
        </div>

        <div className="flex flex-col gap-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Links</p>
          <a
            href="https://github.com/manumu-studio/iso-audit-rag"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted transition-colors duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:text-foreground"
          >
            GitHub
          </a>
          <a
            href="https://github.com/manumu-studio/iso-audit-rag#readme"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted transition-colors duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:text-foreground"
          >
            Documentation
          </a>
          <Link
            href="/chat"
            className="text-muted transition-colors duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:text-foreground"
          >
            Chat Demo
          </Link>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Built by</p>
          <p className="mt-2 text-sm font-medium text-foreground">Manuel Murillo</p>
          <p className="mt-1 text-sm text-muted">Full-Stack Engineer — London</p>
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-[1000px] pt-6 text-center text-xs text-muted">
        © 2026 Manuel Murillo. Built for Calibre.
      </div>
    </footer>
  );
}
