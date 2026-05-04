// Landing hero — Calibre ice CTAs (`accent` fill, `primary` label) consistent with `/chat` Send.

"use client";

import Link from "next/link";
import { motion } from "motion/react";

import { ConstellationCanvas } from "@/components/landing/ConstellationCanvas";

import type { LandingHeroProps } from "./LandingHero.types";

const EASE = [0.4, 0, 0.2, 1] as const;

export function LandingHero({ className }: LandingHeroProps) {
  return (
    <section className={`relative min-h-screen w-full overflow-hidden bg-[linear-gradient(#000a41,#000a41_70%,#3a6a8a_92%,#05122e)] ${className ?? ""}`}>
      <ConstellationCanvas />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1000px] flex-col justify-center px-4 pb-28 pt-28 text-center md:px-6 md:pb-32 md:pt-32">
        <motion.p
          className="text-[clamp(1.05rem,2.5vw,1.4rem)] font-medium uppercase tracking-[0.1em] text-muted"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease: EASE }}
        >
          POWERED BY AI. BUILT FOR COMPLIANCE.
        </motion.p>

        <motion.h1
          className="mt-6 text-[clamp(2.5rem,8vw,5rem)] font-light leading-[1.15] tracking-[-0.03em] text-foreground"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6, ease: EASE }}
        >
          Ask your compliance docs anything.
        </motion.h1>

        <motion.p
          className="mx-auto mt-6 max-w-2xl text-base font-normal leading-relaxed text-foreground/70 md:text-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6, ease: EASE }}
        >
          Upload any compliance standard. Ask in plain English. Get answers with exact clause
          citations.
        </motion.p>

        <motion.div
          className="mt-10 flex justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6, ease: EASE }}
        >
          <Link
            href="/chat"
            className="inline-flex shrink-0 items-center rounded-[50px] bg-accent px-11 py-[1.125rem] text-[1.125rem] font-medium tracking-[0.01em] text-primary shadow-cal-cta transition-all duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-white hover:-translate-y-0.5 hover:shadow-cal-cta-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent/50"
          >
            Try the Demo
          </Link>
        </motion.div>
      </div>

      <motion.div
        className="pointer-events-none absolute inset-x-0 bottom-8 z-10 flex justify-center text-muted"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.6, ease: EASE }}
      >
        <motion.span
          aria-hidden
          className="inline-flex"
          animate={{ y: [0, 6, 0] }}
          transition={{
            repeat: Infinity,
            duration: 2,
            ease: "easeInOut",
          }}
        >
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M6 9l6 6 6-6"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
            />
          </svg>
        </motion.span>
      </motion.div>
    </section>
  );
}
