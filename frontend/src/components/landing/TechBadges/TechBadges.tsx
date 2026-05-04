// Tech stack — Calibre.ac alumni bar (divider + label + row); embedded has no fill (hero gradient shows).

"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

import type { TechBadgesProps } from "./TechBadges.types";

interface TechItem {
  readonly name: string;
  readonly icon: ReactNode;
}

/** Calibre `.alumni-logo` height 40px. */
const ICON_CLS = "h-10 w-10 shrink-0";
const STROKE_DEFAULTS = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const TECH_ITEMS: readonly TechItem[] = [
  {
    name: "FastAPI",
    icon: (
      <svg viewBox="0 0 24 24" className={ICON_CLS} fill="currentColor" aria-hidden>
        <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
      </svg>
    ),
  },
  {
    name: "pgvector",
    icon: (
      <svg viewBox="0 0 24 24" className={ICON_CLS} {...STROKE_DEFAULTS} aria-hidden>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
        <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
      </svg>
    ),
  },
  {
    name: "Claude",
    icon: (
      <svg viewBox="0 0 24 24" className={ICON_CLS} fill="currentColor" aria-hidden>
        <path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z" />
      </svg>
    ),
  },
  {
    name: "OpenAI",
    icon: (
      <svg viewBox="0 0 24 24" className={ICON_CLS} {...STROKE_DEFAULTS} aria-hidden>
        <path d="M12 2l8.66 5v10L12 22l-8.66-5V7z" />
        <circle cx="12" cy="12" r="3.5" />
      </svg>
    ),
  },
  {
    name: "Next.js",
    icon: (
      <svg viewBox="0 0 24 24" className={ICON_CLS} fill="currentColor" aria-hidden>
        <path d="M12 2L2 20h20L12 2z" />
      </svg>
    ),
  },
  {
    name: "Neon Postgres",
    icon: (
      <svg viewBox="0 0 24 24" className={ICON_CLS} {...STROKE_DEFAULTS} aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <path d="M8 16V8l8 8V8" />
      </svg>
    ),
  },
  {
    name: "PyMuPDF",
    icon: (
      <svg viewBox="0 0 24 24" className={ICON_CLS} {...STROKE_DEFAULTS} aria-hidden>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8M8 17h5" />
      </svg>
    ),
  },
];

const EASE = [0.4, 0, 0.2, 1] as const;

/** Matches Calibre `.alumni-logo` idle filter. */
const CALIBRE_LOGO_FILTER = "grayscale(1) brightness(0.95) contrast(1.05)";

/** Calibre `.alumni-banner::before` divider. */
const dividerBefore =
  "before:pointer-events-none before:absolute before:left-1/2 before:top-0 before:h-px before:w-[min(1100px,92%)] before:-translate-x-1/2 before:bg-[linear-gradient(90deg,rgba(0,48,95,0),rgba(0,48,95,0.5),rgba(0,48,95,0))] before:content-['']";

/** Embedded: transparent — page gradient + constellation only. */
const alumniBannerEmbedded = `relative z-10 flex w-full flex-col items-center my-4 mb-8 pt-7 pb-6 ${dividerBefore}`;

/** Standalone: light band between dark sections. */
const alumniBannerStandaloneBand = `relative z-10 w-full bg-[linear-gradient(180deg,#edf3f9_0%,#e3eaf4_55%,#dee8f2_100%)] pt-7 pb-6 ${dividerBefore}`;

export function TechBadges({ className, embedded }: TechBadgesProps) {
  const inner = (
    <>
      <p className="mb-6 text-[0.875rem] font-medium uppercase leading-normal tracking-[0.02em] text-primary/90">
        Built with
      </p>

      <motion.ul
        className="flex flex-wrap items-center justify-center gap-10"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={{
          hidden: {},
          visible: {
            transition: { staggerChildren: 0.08 },
          },
        }}
      >
        {TECH_ITEMS.map((item) => (
          <motion.li
            key={item.name}
            variants={{
              hidden: { opacity: 0, y: 16, filter: CALIBRE_LOGO_FILTER },
              visible: {
                opacity: 0.6,
                y: 0,
                filter: CALIBRE_LOGO_FILTER,
                transition: { duration: 0.55, ease: EASE },
              },
            }}
            whileHover={{
              opacity: 1,
              filter: "grayscale(0) brightness(1) contrast(1)",
            }}
            transition={{ filter: { duration: 0.3, ease: EASE } }}
            className="flex cursor-default flex-col items-center gap-2.5 text-primary transition-all duration-300 ease-in-out"
          >
            {item.icon}
            <span className="max-w-32 text-center text-xs font-medium leading-snug tracking-wide text-primary/90">
              {item.name}
            </span>
          </motion.li>
        ))}
      </motion.ul>
    </>
  );

  if (embedded) {
    return (
      <div
        role="region"
        aria-label="Technology stack"
        className={`${alumniBannerEmbedded} ${className ?? ""}`}
      >
        <div className="w-full text-center">{inner}</div>
      </div>
    );
  }

  return (
    <section
      className={`relative z-10 my-4 mb-8 px-4 md:px-6 ${alumniBannerStandaloneBand} ${className ?? ""}`}
    >
      <div className="mx-auto max-w-[1000px] text-center">{inner}</div>
    </section>
  );
}
