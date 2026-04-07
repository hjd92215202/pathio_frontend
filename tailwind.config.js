/** @type {import('tailwindcss').Config} */
export default {
  content:[
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 预留知径 (Pathio) 的品牌色
        pathio: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          500: '#14b8a6', // 主色调：一种偏探索感的青绿色
          900: '#134e4a',
        }
      }
    },
  },
  plugins:[],
}