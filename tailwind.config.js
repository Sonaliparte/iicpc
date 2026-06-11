/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          void: "#050508",
          purple: "#0D0720",
          teal: "#030F18",
        },
        cyber: {
          cyan: "#00F5FF",
          violet: "#8B5CF6",
          amber: "#F59E0B",
          crimson: "#EF4444",
        }
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["Space Grotesk", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        'glass-cyan': '0 8px 32px 0 rgba(0, 245, 255, 0.08)',
        'glass-violet': '0 8px 32px 0 rgba(139, 92, 246, 0.08)',
        'halo-cyan': '0 0 25px 0 rgba(0, 245, 255, 0.35)',
        'halo-violet': '0 0 25px 0 rgba(139, 92, 246, 0.35)',
        'halo-amber': '0 0 25px 0 rgba(245, 158, 11, 0.35)',
        'glow-cyan': '0 0 15px 0 rgba(0, 245, 255, 0.15)',
        'glow-violet': '0 0 15px 0 rgba(139, 92, 246, 0.15)',
      },
      animation: {
        'float-slow': 'float 8s ease-in-out infinite',
        'float-medium': 'float 5s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 30s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        }
      }
    },
  },
  plugins: [],
}
