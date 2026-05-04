// Root layout: metadata, Manrope (Calibre / PACKET-06), and global styles.
import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ISO Audit · Compliance AI",
  description: "Compliance standards Q&A powered by RAG",
  icons: {
    icon: [{ url: "/assets/logo-white.webp", type: "image/webp" }],
    apple: [{ url: "/assets/logo-white.webp", type: "image/webp" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${manrope.className} font-sans antialiased`}>{children}</body>
    </html>
  );
}
