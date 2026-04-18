/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Manrope', ...defaultTheme.fontFamily.sans],
        body:    ['Inter',   ...defaultTheme.fontFamily.sans],
      },
      colors: {
        primary: {
          DEFAULT:   '#005bbf',
          container: '#1a73e8',
          fixed:     '#d8e2ff',
          'fixed-dim':'#adc7ff',
          on:        '#ffffff',
        },
        secondary: {
          DEFAULT:   '#005ac1',
          container: '#4d8efe',
          on:        '#ffffff',
        },
        tertiary: {
          DEFAULT:   '#7a5800',
          container: '#997000',
          'fixed-dim':'#fdbc13',
        },
        surface: {
          DEFAULT: '#f7f9ff',
          low:     '#f1f4fa',
          container:'#ebeef4',
          high:    '#e5e8ee',
          highest: '#dfe3e8',
          lowest:  '#ffffff',
          tint:    '#005bc0',
        },
        'on-surface': {
          DEFAULT: '#181c20',
          variant: '#414754',
        },
        outline: {
          DEFAULT: '#727785',
          variant: '#c1c6d6',
        },
        error: {
          DEFAULT:     '#ba1a1a',
          container:   '#ffdad6',
          'on-container':'#93000a',
        },
      },
      borderRadius: {
        'xs':  '0.25rem',
        'sm':  '0.375rem',
        'md':  '0.5rem',
        'lg':  '0.75rem',
        'xl':  '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        'soft': '0 8px 24px rgba(24,28,32,0.06)',
        'card': '0 2px 8px rgba(24,28,32,0.04)',
      },
      keyframes: {
        'slide-up': {
          '0%':   { opacity: '0', transform: 'translateY(1rem)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'sheet-up': {
          '0%':   { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        spin: {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.3s ease',
        'fade-in':  'fade-in 0.25s ease',
        'sheet-up': 'sheet-up 0.3s ease',
        shimmer:    'shimmer 1.4s linear infinite',
        spin:       'spin 0.8s linear infinite',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};

