import type { Config } from "tailwindcss"

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "web-brand": {
          DEFAULT: "#7C3AED",
          light: "#EDE9FE",
          dark: "#6d28d9",
        },
        "web-accent": {
          DEFAULT: "#8b5cf6",
          light: "#f5f3ff",
        },
      },
      fontSize: {
        "hero-sm": ["1.875rem", { lineHeight: "2.25rem" }],
        "hero-md": ["2.25rem", { lineHeight: "2.75rem" }],
        "hero-lg": ["3rem", { lineHeight: "1.1" }],
        "hero-xl": ["3.75rem", { lineHeight: "1.1" }],
        "hero-2xl": ["4.5rem", { lineHeight: "1.05" }],
      },
    },
  },
} satisfies Config
