// Landing route composition — Calibre tokens (`accent` CTAs, `primary` navy accents).

import { CtaFooter } from "@/components/landing/CtaFooter";
import { FeatureShowcase } from "@/components/landing/FeatureShowcase";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingNav } from "@/components/landing/LandingNav";
import { TechBadges } from "@/components/landing/TechBadges";

function SectionDivider() {
  return (
    <div className="flex justify-center px-4 py-2" aria-hidden>
      <div className="h-px w-[min(1100px,92%)] bg-gradient-to-r from-transparent via-accent/25 to-transparent" />
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <LandingNav />
      <LandingHero />
      <FeatureShowcase />
      <HowItWorks />
      <SectionDivider />
      <TechBadges />
      <CtaFooter />
      <LandingFooter />
    </main>
  );
}
