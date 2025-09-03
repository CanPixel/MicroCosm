
import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ['Space Grotesk', 'sans-serif'],
        headline: ['Space Grotesk', 'sans-serif'],
        'zcool-kuaile': ['"ZCOOL KuaiLe"', 'cursive'],
        vibes: ['Vibes', 'cursive'],
        code: ['monospace'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        'bg-pan-1': {
          '0%': { transform: 'translateX(0) translateY(0)' },
          '100%': { transform: 'translateX(-200px) translateY(-200px)' },
        },
        'bg-pan-2': {
           '0%': { transform: 'translateX(0) translateY(0)' },
          '100%': { transform: 'translateX(300px) translateY(0px)' },
        },
        'bg-pan-3': {
           '0%': { transform: 'translateX(0) translateY(0)' },
          '100%': { transform: 'translateX(0px) translateY(400px)' },
        },
        'morph': {
          '0%, 100%': { borderRadius: '42% 58% 70% 30% / 45% 45% 55% 55%' },
          '25%': { borderRadius: '58% 42% 43% 57% / 53% 51% 49% 47%' },
          '50%': { borderRadius: '48% 52% 55% 45% / 43% 54% 46% 57%' },
          '75%': { borderRadius: '61% 39% 52% 48% / 52% 50% 50% 48%' },
        },
        'pulse-glow': {
          '0%, 100%': {
            filter: 'drop-shadow(0 0 5px hsl(var(--accent)))',
            transform: 'scale(1)',
          },
          '50%': {
            filter: 'drop-shadow(0 0 10px hsl(var(--accent))) drop-shadow(0 0 15px hsl(var(--accent)))',
            transform: 'scale(1.1)',
          },
        },
        'fade-in': {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        'logo-blob-1': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)', borderRadius: '50%' },
          '25%': { transform: 'translate(5px, 8px) scale(1.1)', borderRadius: '40% 60% 70% 30% / 40% 50% 50% 60%' },
          '50%': { transform: 'translate(-5px, -3px) scale(0.9)', borderRadius: '50%' },
          '75%': { transform: 'translate(3px, -8px) scale(1.05)', borderRadius: '60% 40% 30% 70% / 50% 60% 40% 50%' },
        },
        'logo-blob-2': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)', borderRadius: '50%' },
          '33%': { transform: 'translate(-6px, 10px) scale(1.2)', borderRadius: '70% 30% 50% 50% / 30% 40% 60% 70%' },
          '66%': { transform: 'translate(8px, -4px) scale(0.8)', borderRadius: '50%' },
        },
        'logo-blob-3': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)', borderRadius: '50%' },
          '20%': { transform: 'translate(-10px, -5px) scale(1.1)', borderRadius: '30% 70% 40% 60% / 60% 30% 70% 40%' },
          '40%': { transform: 'translate(5px, 5px) scale(1)', borderRadius: '50%' },
          '60%': { transform: 'translate(10px, -10px) scale(0.9)', borderRadius: '70% 30% 60% 40% / 40% 70% 30% 60%' },
          '80%': { transform: 'translate(-5px, 8px) scale(1.1)', borderRadius: '50%' },
        },
        'sway': {
          '0%': { transform: 'translate(0px, 0px) rotate(0deg)' },
          '25%': { transform: 'translate(15px, 5px) rotate(-5deg)' },
          '50%': { transform: 'translate(-10px, -10px) rotate(8deg)' },
          '75%': { transform: 'translate(5px, -15px) rotate(-2deg)' },
          '100%': { transform: 'translate(0px, 0px) rotate(0deg)' },
        },
        'spin': {
            '0%': { transform: 'rotate(0deg)' },
            '100%': { transform: 'rotate(360deg)' },
        },
        'spin-reverse': {
            '0%': { transform: 'rotate(0deg)' },
            '100%': { transform: 'rotate(-360deg)' },
        },
        'whip': {
          '0%': { transform: 'rotate(-5deg)' },
          '100%': { transform: 'rotate(10deg)' },
        },
        'jitter': {
          '0%, 100%': { transform: 'translate(0, 0) rotate(-1deg)' },
          '10%': { transform: 'translate(1px, 2px) rotate(1deg)' },
          '20%': { transform: 'translate(-1px, -1px) rotate(0deg)' },
          '30%': { transform: 'translate(2px, 1px) rotate(-1deg)' },
          '40%': { transform: 'translate(-2px, -2px) rotate(1deg)' },
          '50%': { transform: 'translate(1px, -1px) rotate(0deg)' },
          '60%': { transform: 'translate(-1px, 2px) rotate(-1deg)' },
          '70%': { transform: 'translate(2px, -1px) rotate(1deg)' },
          '80%': { transform: 'translate(-2px, 1px) rotate(0deg)' },
          '90%': { transform: 'translate(1px, -2px) rotate(-1deg)' },
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'morph': 'morph 8s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        'fade-in': 'fade-in 0.5s ease-in-out',
        'logo-blob-1': 'logo-blob-1 12s ease-in-out infinite',
        'logo-blob-2': 'logo-blob-2 10s ease-in-out infinite alternate',
        'logo-blob-3': 'logo-blob-3 15s ease-in-out infinite',
        'sway': 'sway 15s ease-in-out infinite',
        'spin': 'spin 20s linear infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
