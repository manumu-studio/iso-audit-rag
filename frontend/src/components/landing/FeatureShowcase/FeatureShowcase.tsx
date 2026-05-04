// Feature grid — card chrome matches chat surfaces (`surface`, `border-white/10`).

"use client";

import { motion } from "motion/react";

import type { Feature, FeatureShowcaseProps } from "./FeatureShowcase.types";

const FEATURES: readonly Feature[] = [
  {
    title: "Hybrid Search",
    description:
      "BM25 keyword search + vector similarity with RRF fusion. Finds the right clauses, not just keyword matches.",
    icon: "🔍",
  },
  {
    title: "Exact Citations",
    description:
      "Every answer traces back to specific control IDs and page numbers. No hallucinated references.",
    icon: "📌",
  },
  {
    title: "PDF Upload",
    description:
      "Drop any compliance PDF and query it instantly. Page-based chunking preserves document structure.",
    icon: "📄",
  },
  {
    title: "1,014 Controls Pre-loaded",
    description:
      "Full NIST SP 800-53 Rev 5 catalog ingested from OSCAL JSON. Ready to query out of the box.",
    icon: "🏛️",
  },
];

const EASE = [0.4, 0, 0.2, 1] as const;

export function FeatureShowcase({ className }: FeatureShowcaseProps) {
  return (
    <section
      id="features"
      className={`border-t border-white/10 px-4 py-16 md:px-6 md:py-32 ${className ?? ""}`}
    >
      <div className="mx-auto max-w-[1000px]">
        <h2 className="text-center text-3xl font-light text-foreground md:text-4xl">Features</h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-relaxed text-muted md:text-lg">
          Everything you need to interrogate compliance corpora with citations you can trust.
        </p>

        <motion.ul
          className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: 0.12 },
            },
          }}
        >
          {FEATURES.map((feature) => (
            <motion.li
              key={feature.title}
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.6, ease: EASE },
                },
              }}
              className="rounded-xl border border-white/10 bg-white/5 p-6 transition-colors duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:border-accent/30 hover:bg-white/[0.07]"
            >
              <div className="flex flex-col gap-3">
                <span className="text-2xl" aria-hidden>
                  {feature.icon}
                </span>
                <h3 className="text-lg font-medium text-foreground">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted md:text-base">
                  {feature.description}
                </p>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
