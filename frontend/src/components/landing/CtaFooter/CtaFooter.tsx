// CTA strip — Calibre ice primary button matches `/chat` Send.

"use client";

import Link from "next/link";
import { motion } from "motion/react";

import type { CtaFooterProps } from "./CtaFooter.types";

const EASE = [0.4, 0, 0.2, 1] as const;

export function CtaFooter({ className }: CtaFooterProps) {
  return (
    <section
      className={`relative overflow-hidden border-t border-white/10 bg-surface px-4 py-16 md:px-6 md:py-28 ${className ?? ""}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: "radial-gradient(rgba(227, 242, 255, 0.09) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
      />

      <motion.div
        className="relative mx-auto max-w-[720px] text-center"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.65, ease: EASE }}
      >
        <h2 className="text-3xl font-semibold leading-tight text-foreground md:text-4xl">
          Ready to query your compliance standards?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted md:text-lg">
          1,014 NIST controls loaded. Upload your own PDFs. Get cited answers in seconds.
        </p>
        <div className="mt-10 flex justify-center">
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-10 py-3 text-base font-semibold text-primary shadow-cal-cta-lg transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent/50"
          >
            Launch Demo
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
