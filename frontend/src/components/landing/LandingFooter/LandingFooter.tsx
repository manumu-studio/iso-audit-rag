// Footer — same background rail as chat (`bg-background`, muted links).

import Image from "next/image";
import Link from "next/link";

import type { LandingFooterProps } from "./LandingFooter.types";

export function LandingFooter({ className }: LandingFooterProps) {
  return (
    <footer className={`bg-background px-4 py-14 md:px-6 ${className ?? ""}`}>
      <div className="mx-auto grid max-w-[1000px] gap-10 md:grid-cols-3 md:gap-12">
        <Link
          href="/"
          className="flex items-start gap-3 rounded-lg outline-none transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          <Image
            src="/assets/logo-white.webp"
            alt=""
            width={40}
            height={40}
            className="mt-0.5 h-8 w-8 shrink-0 opacity-90"
          />
          <div>
            <p className="text-base font-semibold text-foreground">
              ISO Audit · Compliance AI
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              AI-powered compliance document search
            </p>
          </div>
        </Link>

        <div className="flex flex-col gap-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">Links</p>
          <a
            href="https://github.com/manumu-studio/iso-audit-rag"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground/80 transition-opacity duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:opacity-60"
          >
            GitHub
          </a>
          <a
            href="https://api.iso-audit.manumustudio.com/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground/80 transition-opacity duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:opacity-60"
          >
            API Documentation
          </a>
          <Link
            href="/chat"
            className="text-foreground/80 transition-opacity duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:opacity-60"
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
