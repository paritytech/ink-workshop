/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        players: {
          1: '#6effdb',
          2: '#ff705e',
          3: '#50d985',
          4: '#5ea4ff',
          5: '#f3ff73',
          6: '#f9e3ff',
          7: '#f694ff',
          8: '#ffc32b',
          9: '#3853ff',
          10: '#bba4c2',
        },
        brand: {
          100: '#e1dcfb',
          200: '#7388ff',
          300: '#3b53fe',
          500: '#151ec3',
          600: '#1119a5',
          800: '#19144f',
        },
        squink: {
          500: '#8747cc',
          800: '#5b017c',
        },
        'squink-pink': {
          500: '#bc83fb',
        },
      },
      fontFamily: {
        Headings: ['Fredoka One', 'cursive'],
        fred: ['Fredoka One', 'cursive'],
        mont: ['Montserrat', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
