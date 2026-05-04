// Chat route shell: Calibre palette matches landing; `.chat-shell` vars — typography inherits Manrope from root.

import type { ReactNode } from "react";

export default function ChatRouteLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="chat-shell flex h-dvh w-full flex-col overflow-hidden bg-chat-page text-chatFg antialiased">
      {children}
    </div>
  );
}
