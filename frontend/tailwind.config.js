/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        saffron: { DEFAULT: '#F28C28', deep: '#B85A0B', pale: '#FCE3C8' },
        ekta: { DEFAULT: '#1E9E6A', deep: '#0F6B46', pale: '#D6F0E4' },
        chalk: '#F7F5F0',
        ink: { DEFAULT: '#1F1A17', soft: '#4A403A' },
        dust: '#E9E2D6',
        // Neo-Brutalist pop palette
        pop: { yellow: '#FFD60A', pink: '#FF3D7F', sky: '#3EC6F0', paper: '#FFFBF0' },
        nb: '#111111',
      },
      boxShadow: {
        nb: '6px 6px 0 #111111',
        'nb-sm': '3px 3px 0 #111111',
        'nb-lg': '10px 10px 0 #111111',
      },
      fontFamily: {
        display: ['"Rozha One"', 'Georgia', 'serif'],
        body: ['Hind', 'system-ui', 'sans-serif'],
        tag: ['Teko', 'Impact', 'sans-serif'],
        brut: ['"Archivo Black"', '"Arial Black"', 'Impact', 'sans-serif'],
        sfx: ['Bangers', 'Impact', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
