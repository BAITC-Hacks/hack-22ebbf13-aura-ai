import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0F1420",     // фон: чернильно-синий, не чёрный
        panel: "#161C2B",   // карточки
        raised: "#1C2335",  // поля ввода, hover
        line: "#262F45",    // границы
        fg: "#E7EAF2",
        mute: "#8C95AB",
        tape: "#F2B63D",    // «оградительная лента» — главный акцент
        sent: "#7FB0FF",
        ignored: "#F07470",
      },
      fontFamily: {
        sans: ["var(--font-onest)", "system-ui", "sans-serif"],
        display: ["var(--font-unbounded)", "var(--font-onest)", "sans-serif"],
      },
      keyframes: {
        tick: {
          "0%": { transform: "translateY(-35%)", opacity: "0" },
          "100%": { transform: "none", opacity: "1" },
        },
      },
      animation: { tick: "tick .35s ease-out" },
    },
  },
  plugins: [],
} satisfies Config;
