import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#0B0D11",
          secondary: "#11141B",
          card: "#171A22",
          elevated: "#1C1F28",
        },
        accent: {
          DEFAULT: "#FF4655",
          hover: "#FF5F6D",
          dim: "rgba(255,70,85,0.12)",
          cyan: "#00E5FF",
          "cyan-dim": "rgba(0,229,255,0.10)",
          gold: "#FFE84D",
          "gold-dim": "rgba(255,232,77,0.10)",
          purple: "#A78BFA",
          "purple-dim": "rgba(167,139,250,0.10)",
        },
        border: {
          DEFAULT: "#252830",
          accent: "#FF4655",
        },
        text: {
          primary: "#ECF0F8",
          secondary: "#8B90A8",
          muted: "#505568",
          mono: "#00E5FF",
        },
      },
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        rajdhani: ["DM Sans", "sans-serif"],
        barlow: ["Barlow Condensed", "sans-serif"],
        mono: ["Share Tech Mono", "monospace"],
      },
      clipPath: {
        corner: "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
