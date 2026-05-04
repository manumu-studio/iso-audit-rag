// Landing: Calibre tokens on Manrope (root layout). Chat `/chat`: `.chat-shell` + nested `chat*` colors.
import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "#000a41",
        surface: "rgba(227, 242, 255, 0.06)",
        primary: "#00305f",
        accent: "#e3f2ff",
        foreground: "#e3f2ff",
        muted: "rgba(227, 242, 255, 0.55)",
        chat: {
          page: "var(--chat-bg-primary)",
          surface: "var(--chat-bg-secondary)",
          tertiary: "var(--chat-bg-tertiary)",
          sidebar: "var(--chat-sidebar-surface-primary)",
          sidebar2: "var(--chat-sidebar-surface-secondary)",
          composer: "var(--chat-composer-surface-primary)",
          mainStrip: "var(--chat-main-surface-secondary)",
          userBubble: "var(--chat-user-msg-bg)",
          codeBg: "var(--chat-code-panel-bg)",
          codeHead: "var(--chat-code-panel-head)",
        },
        chatFg: {
          DEFAULT: "var(--chat-text-primary)",
          secondary: "var(--chat-text-secondary)",
          tertiary: "var(--chat-text-tertiary)",
          quaternary: "var(--chat-text-quaternary)",
          placeholder: "var(--chat-text-placeholder)",
        },
        chatBorder: {
          light: "var(--chat-border-light)",
          medium: "var(--chat-border-medium)",
          heavy: "var(--chat-border-heavy)",
        },
        chatAccent: {
          DEFAULT: "var(--chat-accent)",
          icon: "var(--chat-icon-accent)",
          static: "var(--chat-accent-static)",
        },
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "ui-sans-serif", "system-ui", "sans-serif"],
        chat: [
          "-apple-system",
          "ui-sans-serif",
          "system-ui",
          '"Segoe UI"',
          "Helvetica",
          '"Apple Color Emoji"',
          "Arial",
          "sans-serif",
        ],
        chatMono: [
          "ui-monospace",
          "SFMono-Regular",
          "SF Mono",
          "Menlo",
          "Consolas",
          "Liberation Mono",
          "monospace",
        ],
      },
      borderRadius: {
        "chat-bubble": "22px",
        "chat-composer": "28px",
        "chat-code": "6px",
      },
      maxWidth: {
        thread: "var(--chat-thread-content-max-width)",
      },
      boxShadow: {
        "chat-composer": "var(--chat-shadow-composer)",
        "cal-cta": "0 4px 20px rgba(227, 242, 255, 0.3)",
        "cal-cta-hover": "0 8px 30px rgba(227, 242, 255, 0.5)",
        "cal-cta-lg": "0 8px 42px rgba(227, 242, 255, 0.18)",
      },
    },
  },
  plugins: [],
} satisfies Config;
