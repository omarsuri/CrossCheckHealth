import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./data/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Fraunces", "Georgia", "serif"],
        sans: ["DM Sans", "system-ui", "sans-serif"]
      },
      colors: {
        ink: { DEFAULT: "#0B2545", soft: "#1B365D", light: "#2E5077" },
        aqua: { deep: "#0E7C7B", DEFAULT: "#13A8A5", soft: "#A8E0DC", light: "#E6F4F2" },
        terracotta: { DEFAULT: "#E8B4A0", deep: "#C97A5E", soft: "#FBEAE1" },
        cream: { DEFAULT: "#FAF7F0", warm: "#F4EFE4", cold: "#F9F8F4" },
        teal: { deep: "#0E7C7B", DEFAULT: "#13A8A5", soft: "#A8E0DC", light: "#E6F4F2" },
        navy: "#0B2545",
        charcoal: "#0F1922"
      },
      boxShadow: {
        glass: "0 1px 2px rgba(11,37,69,0.04), 0 8px 24px rgba(11,37,69,0.06), 0 24px 48px rgba(11,37,69,0.04)",
        lift: "0 4px 8px rgba(11,37,69,0.04), 0 20px 40px rgba(11,37,69,0.08), 0 40px 80px rgba(11,37,69,0.06)",
        "inset-glow": "inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(11,37,69,0.06)"
      }
    }
  },
  plugins: []
};

export default config;
