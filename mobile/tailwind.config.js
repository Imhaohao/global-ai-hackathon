/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{ts,tsx}', './web/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: require('./src/colors.json'),
      borderRadius: {
        control: '20px',
        card: '28px',
        screen: '44px',
        device: '56px',
      },
    },
  },
  plugins: [],
};
