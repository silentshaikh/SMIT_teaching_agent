import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      xs: "375px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      colors: {
        cyber: {
          black: "var(--cyber-bg)",
          "black-900": "var(--cyber-bg-900)",
          "black-800": "var(--cyber-bg-900)",
          grey: "#1a1a2e",
          green: "var(--cyber-text)",
          "green-dim": "var(--cyber-text-dim)",
          purple: "#7c3aed",
          "purple-deep": "#4a1a8a",
          crimson: "#FF003C",
          "crimson-dim": "#cc0030",
          cyan: "#00f0ff",
        },
      },
      fontFamily: {
        heading: ["var(--font-heading)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        orbitron: ["Orbitron", "monospace"],
        syncopate: ["Syncopate", "sans-serif"],
        michroma: ["Michroma", "sans-serif"],
        "share-tech": ["Share Tech Mono", "monospace"],
        "space-mono": ["Space Mono", "monospace"],
        jetbrains: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "pulse-neon": "pulseNeon 2s ease-in-out infinite",
        "glitch": "glitch 0.3s ease-in-out infinite",
        "scan-line": "scanLine 4s linear infinite",
        "border-flash": "borderFlash 0.8s ease-in-out infinite",
        "iris-open": "irisOpen 1.2s ease-out forwards",
        "gradient-shift": "gradientShift 4s ease infinite",
      },
      keyframes: {
        pulseNeon: {
          "0%, 100%": { opacity: "1", filter: "brightness(1)" },
          "50%": { opacity: "0.7", filter: "brightness(1.5)" },
        },
        glitch: {
          "0%, 100%": { transform: "translate(0)" },
          "20%": { transform: "translate(-2px, 1px)" },
          "40%": { transform: "translate(2px, -1px)" },
          "60%": { transform: "translate(-1px, -1px)" },
          "80%": { transform: "translate(1px, 2px)" },
        },
        scanLine: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        borderFlash: {
          "0%, 100%": { borderColor: "#00FF66" },
          "50%": { borderColor: "#FF003C" },
        },
        irisOpen: {
          "0%": { clipPath: "circle(0% at 50% 50%)" },
          "100%": { clipPath: "circle(100% at 50% 50%)" },
        },
        gradientShift: {
          "0%": { backgroundPosition: "0% center" },
          "50%": { backgroundPosition: "100% center" },
          "100%": { backgroundPosition: "0% center" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
