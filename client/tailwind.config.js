/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces
        app: 'var(--bg-app)',
        panel: 'var(--bg-panel)',
        raised: 'var(--bg-raised)',
        inset: 'var(--bg-inset)',
        'inset-deep': 'var(--bg-inset-deep)',
        'card-nested': 'var(--bg-card-nested)',
        // Borders
        border: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)',
          'hover-card': 'var(--border-hover-card)',
        },
        // Text
        fg: {
          DEFAULT: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        // Accent
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          dim: 'var(--accent-dim)',
          line: 'var(--accent-border)',
          on: 'var(--on-accent)',
        },
        // Status
        status: {
          ready: 'var(--status-ready)',
          analyzing: 'var(--status-analyzing)',
          rendering: 'var(--status-rendering)',
          uploaded: 'var(--status-uploaded)',
          failed: 'var(--status-failed)',
        },
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      animation: {
        'status-pulse': 'status-pulse 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
