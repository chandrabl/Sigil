/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0B0E16",
          900: "#12161F",
          800: "#1A1F2C",
          700: "#242B3B",
          600: "#333C52",
        },
        parchment: {
          100: "#F1EBDA",
          200: "#E8DFC7",
          300: "#D9CCA8",
        },
        brass: {
          400: "#C9A467",
          500: "#B8935B",
          600: "#96793F",
        },
        seal: {
          500: "#8A2E2E",
          600: "#6E2222",
        },
        moss: {
          400: "#5E7A5E",
          500: "#4A6349",
        },
      },
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        body: ["'IBM Plex Sans'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      backgroundImage: {
        "grain": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};
