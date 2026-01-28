// postcss.config.mjs
export default {
  plugins: {
    // 這裡要改用 @tailwindcss/postcss 而不是 tailwindcss
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
};