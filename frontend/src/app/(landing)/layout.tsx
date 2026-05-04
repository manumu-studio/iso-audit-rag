// Landing route shell: Calibre gradient shows through from `globals.css`; typography via root Manrope.

import type { ReactNode } from "react";

export default function LandingLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="min-h-screen scroll-smooth overflow-x-hidden bg-transparent text-foreground antialiased">
      {children}
    </div>
  );
}
