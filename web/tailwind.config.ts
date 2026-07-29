import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ledger: {
          bg: "#0B0D12",
          surface: "#12151C",
          card: "#181C25",
          border: "#262B36",
          hairline: "#1F2430",
        },
        ink: {
          primary: "#EDECE6",
          secondary: "#9A9FAC",
          muted: "#5B606C",
        },
        seal: {
          teal: "#1D9E75",
          tealDark: "#0F6E56",
          amber: "#BA7517",
          amberDark: "#854F0B",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
