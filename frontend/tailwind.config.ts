// Tailwind theme tokens for the Claude-style dark UI palette.
import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "#1a1a2e",
        surface: "#252540",
        primary: "#7c3aed",
        foreground: "#e2e8f0",
        muted: "#94a3b8",
      },
    },
  },
  plugins: [],
} satisfies Config;
