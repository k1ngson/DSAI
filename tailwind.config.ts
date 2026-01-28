import type { Config } from "tailwindcss";

const config: Config = {
  // Must add this line to enable theme switching via <html class="dark">
  darkMode: "class", 
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          black: "#050505",    // 極致黑背景
          deep: "#0a0a0f",     // 稍淺的深藍黑
          glow: "#3b82f6",     // 霓虹藍
          purple: "#8b5cf6",   // 霓虹紫
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      }
    },
  },
  plugins: [],
};
export default config;