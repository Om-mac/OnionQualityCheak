/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: '#14532d',
        fresh: '#15803d',
        mint: '#dcfce7',
      },
    },
  },
  plugins: [],
};
