/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        available: '#16a34a',
        unavailable: '#dc2626',
        pending: '#ca8a04',
      },
    },
  },
  plugins: [],
};
