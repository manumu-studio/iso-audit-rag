// Landing route composition — Calibre tokens (`accent` CTAs, `primary` navy accents).

import { CtaFooter } from "@/components/landing/CtaFooter";
import { FeatureShowcase } from "@/components/landing/FeatureShowcase";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingNav } from "@/components/landing/LandingNav";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <LandingNav />
      <LandingHero />
      {/* Ice (#e3f2ff) at hero bottom → page navy (#000a41); avoids a hard cut into Features. */}
      <div
        aria-hidden
        className="h-24 w-full shrink-0 bg-[linear-gradient(180deg,#e3f2ff_0%,#8aabcc_28%,#355a7d_58%,#0f2348_82%,#000a41_100%)] md:h-32"
      />
      <FeatureShowcase />
      <HowItWorks />
      <CtaFooter />
      <LandingFooter />
    </main>
  );
}
