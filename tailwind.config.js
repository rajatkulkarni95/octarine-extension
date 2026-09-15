/** @type {import('tailwindcss').Config} */
const defaultTheme = require("tailwindcss/defaultTheme");
const colors = require("tailwindcss/colors");

const palette = {
  transparent: "transparent",
  black: colors.black,
  white: colors.white,
  gray: colors.gray,
  red: colors.red,
  amber: colors.amber,
  yellow: colors.yellow,
  green: colors.green,
  blue: colors.blue,
};

module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Karla", ...defaultTheme.fontFamily.sans],
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
      ...palette,
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
      ...palette,
    },
    borderColor: {
      primary: "var(--color-border-primary)",
      faded: "var(--color-border-faded)",
      secondary: "var(--color-border-secondary)",
      accent: "var(--color-border-accent)",
      error: "var(--color-border-error)",
      ...palette,
    },
    ringColor: {
      primary: "var(--color-outline-primary)",
      accent: "var(--color-border-accent)",
      ...palette,
    },
    outlineColor: {
      primary: "var(--color-outline-primary)",
      accent: "var(--color-border-accent)",
      ...palette,
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
  ],
};
