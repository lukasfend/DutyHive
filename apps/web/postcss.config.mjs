/**
 * Tailwind 4 uses a PostCSS plugin (`@tailwindcss/postcss`) instead of the
 * CLI-style `tailwind.config.js`. Tokens and theme are CSS-first via @theme.
 */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
