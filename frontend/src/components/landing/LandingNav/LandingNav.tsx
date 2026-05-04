// Sticky landing navigation — logo + branding left, nav center, CTA right.
// Header behaviour ported from helical-bio-explorer; typography follows Calibre tokens.

"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { MouseEvent } from "react";

import type { LandingNavProps } from "./LandingNav.types";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function scrollToAnchor(hash: string): void {
  const id = hash.startsWith("#") ? hash.slice(1) : hash;
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
}

export function LandingNav({ className }: LandingNavProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const shellClass = scrolled
    ? "border-b border-white/10 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60"
    : "border-b border-transparent bg-transparent";

  const onAnchorClick =
    (hash: string) =>
    (e: MouseEvent<HTMLAnchorElement>): void => {
      e.preventDefault();
      scrollToAnchor(hash);
    };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${shellClass} ${className ?? ""}`}
    >
      <div className="mx-auto flex max-w-[1000px] items-center justify-between gap-4 px-3 py-2 md:px-6 md:py-3">
        {/* ── Logo + branding ── */}
        <Link
          href="/"
          aria-label="Home"
          className="flex items-center gap-2 rounded-lg p-1.5 outline-none transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:gap-3"
        >
          <Image
            src="/assets/logo-white.webp"
            alt=""
            width={40}
            height={40}
            className="h-7 w-7 shrink-0 opacity-90 md:h-10 md:w-10"
            priority
          />
          <span className="text-xs font-semibold leading-snug tracking-tight text-foreground md:hidden">
            ISO Audit
          </span>
          <span className="hidden text-sm font-semibold tracking-tight text-foreground md:inline md:text-base">
            ISO Audit · Compliance AI
          </span>
        </Link>

        {/* ── Center nav links ── */}
        <nav
          aria-label="Primary"
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex"
        >
          <a
            href="#features"
            className="text-sm font-medium text-muted transition-colors duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:text-foreground"
            onClick={onAnchorClick("#features")}
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="text-sm font-medium text-muted transition-colors duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:text-foreground"
            onClick={onAnchorClick("#how-it-works")}
          >
            How It Works
          </a>
        </nav>

        {/* ── Right side: GitHub icon + CTA ── */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <a
            href="https://github.com/manumu-studio/iso-audit-rag"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:text-foreground"
            aria-label="View source on GitHub"
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-5 w-5"
              aria-hidden
            >
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836a9.59 9.59 0 012.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
          </a>

          <Link
            href="/chat"
            className="inline-flex shrink-0 items-center rounded-[50px] bg-accent px-6 py-2 text-sm font-medium tracking-[0.01em] text-primary shadow-cal-cta transition-all duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-white hover:-translate-y-0.5 hover:shadow-cal-cta-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent/50"
          >
            Try the Demo
          </Link>
        </div>
      </div>
    </header>
  );
}
