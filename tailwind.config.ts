import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        neutral: {
          0: "#FFFFFF",
          10: "#F9F5F2",
          20: "#F0EAE5",
          30: "#DBD6CD",
          40: "#9C9494",
          50: "#807778",
          60: "#686162",
          70: "#554F4F",
          80: "#494343",
          90: "#3F3B3C",
          100: "#302D2D",
        },
        specialist: {
          general: "#006E90",     // Médecin généraliste
          dentist: "#FECA45",     // Chirurgien-dentiste (texte sombre)
          psychiatrist: "#9F84BD", // Psychiatre
          pediatrician: "#17BEBB", // Pédiatre
          gynecologist: "#D87DA9", // Gynécologue-Obstétricien
          radiologist: "#F19953",
          others: "#2DA131",
        },
        primary: "#006E90",
        success: "#2DA131",
        warning: "#FECA45",
        danger: "#CC0000",
      },
      fontFamily: {
        sans: ["Aileron", "system-ui", "-apple-system", "sans-serif"],
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        blocSlideIn: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        pulseGentle: {
          "0%, 100%": { opacity: "1",   transform: "scale(1)" },
          "50%":       { opacity: "0.4", transform: "scale(1.2)" },
        },
        heroIn: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in":        "fadeIn 300ms ease-out both",
        "bloc-in":        "blocSlideIn 280ms ease-out both",
        "pulse-gentle":   "pulseGentle 2s ease-in-out infinite",
        "hero-in":        "heroIn 600ms ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
