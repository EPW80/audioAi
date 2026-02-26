/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        'background-secondary': "hsl(var(--background-secondary))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        // Neon colors
        'neon-pink': "hsl(var(--neon-pink))",
        'neon-cyan': "hsl(var(--neon-cyan))",
        'neon-purple': "hsl(var(--neon-purple))",
        'neon-magenta': "hsl(var(--neon-magenta))",
        'neon-blue': "hsl(var(--neon-blue))",
        // Glass colors
        'glass-bg': "hsl(var(--glass-bg))",
        'glass-border': "hsl(var(--glass-border))",
      },
      backgroundImage: {
        'gradient-vaporwave': 'linear-gradient(135deg, hsl(var(--neon-pink)), hsl(var(--neon-cyan)), hsl(var(--neon-purple)))',
        'gradient-cyber': 'linear-gradient(135deg, hsl(var(--neon-cyan)), hsl(var(--neon-blue)), hsl(var(--neon-purple)))',
        'gradient-neon': 'linear-gradient(135deg, hsl(var(--neon-magenta)), hsl(var(--neon-pink)), hsl(var(--neon-cyan)))',
      },
      backdropBlur: {
        xs: '2px',
        '4xl': '80px',
      },
      boxShadow: {
        'glow-sm': '0 0 10px currentColor',
        'glow': '0 0 10px currentColor, 0 0 20px currentColor',
        'glow-lg': '0 0 10px currentColor, 0 0 20px currentColor, 0 0 40px currentColor',
        'neon-pink': '0 0 10px hsl(var(--neon-pink) / 0.5), 0 0 20px hsl(var(--neon-pink) / 0.3)',
        'neon-cyan': '0 0 10px hsl(var(--neon-cyan) / 0.5), 0 0 20px hsl(var(--neon-cyan) / 0.3)',
        'neon-purple': '0 0 10px hsl(var(--neon-purple) / 0.5), 0 0 20px hsl(var(--neon-purple) / 0.3)',
        'glass': '0 8px 32px 0 rgba(0, 255, 255, 0.1)',
      },
      animation: {
        'neon-pulse': 'neon-pulse 2s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 15s ease infinite',
        'grid-flow': 'grid-flow 2s linear infinite',
        'scan-line': 'scan-line 8s linear infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        'tech': ['Orbitron', 'Rajdhani', 'sans-serif'],
      },
      dropShadow: {
        'glow-sm': '0 0 10px currentColor',
        'glow': ['0 0 10px currentColor', '0 0 20px currentColor'],
        'glow-lg': ['0 0 10px currentColor', '0 0 20px currentColor', '0 0 40px currentColor'],
      },
    },
  },
  plugins: [],
}
