// How-it-works pipeline — step badges use Calibre ice pills (same affordance as chat Send).

"use client";

import { motion } from "motion/react";

import type { HowItWorksProps, Step } from "./HowItWorks.types";

const STEPS: readonly Step[] = [
  {
    number: 1,
    title: "Upload",
    description:
      "Upload your compliance documents or use the built-in NIST SP 800-53 catalog",
  },
  {
    number: 2,
    title: "Ask",
    description: "Ask questions in plain English about any control, requirement, or policy",
  },
  {
    number: 3,
    title: "Get Answers",
    description:
      "Receive AI-generated answers with exact clause citations and control references",
  },
];

const EASE = [0.4, 0, 0.2, 1] as const;

export function HowItWorks({ className }: HowItWorksProps) {
  return (
    <section
      id="how-it-works"
      className={`border-t border-white/10 px-4 py-16 md:px-6 md:py-32 ${className ?? ""}`}
    >
      <div className="mx-auto max-w-[1000px]">
        <h2 className="text-center text-3xl font-light text-foreground md:text-4xl">
          How it works
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-relaxed text-muted md:text-lg">
          Three calm steps from documents to cited answers.
        </p>

        <div className="relative mt-16 md:mt-20">
          <div className="absolute bottom-0 left-4 top-0 hidden w-px bg-gradient-to-b from-transparent via-accent/25 to-transparent md:left-[calc(16.666%-2px)] lg:left-1/2 lg:block lg:h-px lg:w-[calc(100%-200px)] lg:-translate-x-1/2 lg:translate-y-[22px] lg:bg-gradient-to-r lg:from-transparent lg:to-transparent lg:via-accent/30" />

          <motion.ol
            className="relative grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.18 } },
            }}
          >
            {STEPS.map((step, idx) => (
              <motion.li
                key={step.number}
                variants={{
                  hidden: { opacity: 0, y: 28 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.6, ease: EASE },
                  },
                }}
                className="relative flex gap-6 md:flex-col md:items-center md:text-center"
              >
                <div className="flex md:flex-col md:items-center md:gap-5">
                  <div className="relative flex md:flex-col md:items-center">
                    {idx > 0 ? (
                      <span
                        className="absolute left-[18px] top-[-48px] hidden h-12 w-px bg-accent/25 md:block lg:hidden"
                        aria-hidden
                      />
                    ) : null}
                    <span
                      className="absolute bottom-[-48px] left-[18px] top-10 w-px bg-gradient-to-b from-accent/25 via-accent/15 to-transparent md:hidden"
                      aria-hidden
                    />
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-base font-semibold text-primary shadow-cal-cta ring-2 ring-accent/30 md:h-12 md:w-12 md:text-lg">
                      {step.number}
                    </div>
                  </div>
                  <div className="md:mt-2">
                    <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted md:text-base">
                      {step.description}
                    </p>
                  </div>
                </div>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </div>
    </section>
  );
}
