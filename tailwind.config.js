/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* CSS-variable driven tokens (used across app) */
        background:          'hsl(var(--background))',
        'surface-1':         'hsl(var(--surface-1))',
        'surface-2':         'hsl(var(--surface-2))',
        'surface-3':         'hsl(var(--surface-3))',
        border:              'hsl(var(--border))',
        foreground:          'hsl(var(--foreground))',
        'muted-foreground':  'hsl(var(--muted-foreground))',
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          2:          'hsl(var(--accent-2))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        danger:  'hsl(var(--danger))',
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['ui-monospace', 'Cascadia Code', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontSize: {
        '2xs': ['10px', '14px'],
      },
    },
  },
  plugins: [],
};
