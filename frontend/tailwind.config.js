/** @type {import('tailwindcss').Config} */
// Visual identity: a canteen token/departure-board look, the kind of amber
// split-flap display seen on old railway/bus indicator boards, since this
// app's whole job is telling someone "your order, your time, your counter"
// the same way those boards do.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#12181B',
        panel: '#1E2629',
        panel2: '#293134',
        signal: '#F2A93C',
        signalDim: '#8A6A2E',
        paper: '#EFE7D8',
        leaf: '#6E9B72',
        chili: '#C1443B',
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
