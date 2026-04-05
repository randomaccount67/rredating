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
          primary: "#0F1013",
          secondary: "#13151A",
          card: "#1A1D24",
          elevated: "#1E2128",
        },
        accent: {
          DEFAULT: "#FF4655",
          hover: "#FF5F6D",
          dim: "rgba(255,70,85,0.15)",
        },
        border: {
          DEFAULT: "#2A2D35",
          accent: "#FF4655",
        },
        text: {
          primary: "#E8EAF0",
          secondary: "#8B8FA8",
          muted: "#525566",
          mono: "#A8FFBD",
        },
      },
      fontFamily: {
        rajdhani: ["Rajdhani", "sans-serif"],
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
