// Next.js configuration for the ISO Audit RAG frontend (default SSR on Vercel).
import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, ".."),
};

export default nextConfig;
