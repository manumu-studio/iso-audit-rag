// Tech badges — same outline treatment as inputs (`border-white/10`, `surface`).

"use client";

import { motion } from "motion/react";

import type { TechBadgesProps } from "./TechBadges.types";

const TECH_LABELS = [
  "FastAPI",
  "pgvector",
  "Claude (Anthropic)",
  "OpenAI Embeddings",
  "Next.js 15",
  "Neon Postgres",
  "PyMuPDF",
] as const;

const EASE = [0.4, 0, 0.2, 1] as const;

export function TechBadges({ className }: TechBadgesProps) {
  return (
    <section className={`border-t border-white/10 px-4 py-16 md:px-6 md:py-32 ${className ?? ""}`}>
      <div className="mx-auto max-w-[1000px] text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">
          Built with
        </p>

        <motion.ul
          className="mt-8 flex flex-wrap items-center justify-center gap-3 md:gap-4"
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
          {TECH_LABELS.map((label) => (
            <motion.li
              key={label}
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.55, ease: EASE },
                },
              }}
              className="rounded-full border border-white/15 bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:border-accent/35 hover:text-foreground"
            >
              {label}
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
