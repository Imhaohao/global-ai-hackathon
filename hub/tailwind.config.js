/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: require('./src/colors.json'),
      borderRadius: {
        control: '20px',
        card: '28px',
      },
    },
  },
  plugins: [],
};
