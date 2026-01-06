/** @type {import('tailwindcss').Config} */
const defaultTheme = require("tailwindcss/defaultTheme");
const colors = require("tailwindcss/colors");

module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", ...defaultTheme.fontFamily.sans],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", ...defaultTheme.fontFamily.mono],
      },
      typography: {
        DEFAULT: {
          css: {
            'tbody tr:nth-child(2n)': {
              backgroundColor: 'transparent',
            },
          },
        },
        invert: {
          css: {
            'tbody tr:nth-child(2n)': {
              backgroundColor: 'transparent',
            },
          },
        },
      },
    },
    textColor: {
      primary: "var(--color-text-primary)",
      secondary: "var(--color-text-secondary)",
      tertiary: "var(--color-text-tertiary)",
      placeholder: "var(--color-text-placeholder)",
      link: "var(--color-text-link)",
      accent: "var(--color-text-accent)",
      error: "var(--color-text-error)",
      icon: "var(--color-icon)",
      ...colors,
    },
    backgroundColor: {
      primary: "var(--color-bg-primary)",
      intermediate: "var(--color-bg-intermediate)",
      secondary: "var(--color-bg-secondary)",
      tertiary: "var(--color-bg-tertiary)",
      hover: "var(--color-bg-hover)",
      accent: "var(--color-bg-accent)",
      "accent-lite": "var(--color-bg-accent-lite)",
      error: "var(--color-bg-error)",
      ...colors,
    },
    borderColor: {
      primary: "var(--color-border-primary)",
      secondary: "var(--color-border-secondary)",
      accent: "var(--color-border-accent)",
      error: "var(--color-border-error)",
      ...colors,
    },
    ringColor: {
      primary: "var(--color-outline-primary)",
      accent: "var(--color-border-accent)",
      ...colors,
    },
    outlineColor: {
      primary: "var(--color-outline-primary)",
      accent: "var(--color-border-accent)",
      ...colors,
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
  ],
};
