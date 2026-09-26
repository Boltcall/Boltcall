import type { Config } from 'tailwindcss'
// @ts-ignore
import flattenColorPalette from 'tailwindcss/lib/util/flattenColorPalette'

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        hebrew: ['Heebo', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          blue: "#2563EB",
          blueDark: "#1E40AF",
          sky: "#93C5FD",
        },
        text: {
          main: "#0B1220",
          muted: "#475569",
        },
        bg: "#FFFFFF",
        "white-smoke": "#F5F5F5",
        "light-blue": "#DDE2EE",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // New accordion colors
        'accordion-main': 'var(--accordion-main)',
        'accordion-overlay': 'var(--accordion-overlay)',
        'accordion-bg': 'var(--accordion-bg)',
        'accordion-bw': 'var(--accordion-bw)',
        'accordion-blank': 'var(--accordion-blank)',
        'accordion-text': 'var(--accordion-text)',
        'accordion-mtext': 'var(--accordion-mtext)',
        'accordion-border': 'var(--accordion-border)',
        'accordion-ring': 'var(--accordion-ring)',
        'accordion-ring-offset': 'var(--accordion-ring-offset)',
        secondaryBlack: '#212121',

        main: 'var(--main)',
        overlay: 'var(--overlay)',
        bg: 'var(--bg)',
        bw: 'var(--bw)',
        blank: 'var(--blank)',
        mtext: 'var(--mtext)',
        ringOffset: 'var(--ring-offset)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        base: '5px'
      },
      boxShadow: {
        'accordion-shadow': 'var(--accordion-shadow)',
        shadow: 'var(--shadow)'
      },
      translate: {
        boxShadowX: '4px',
        boxShadowY: '4px',
        reverseBoxShadowX: '-4px',
        reverseBoxShadowY: '-4px',
      },
      fontWeight: {
        base: '500',
        heading: '700',
      },
      animation: {
        aurora: "aurora 36s linear infinite",
        spotlight: "spotlight 2s ease .75s 1 forwards",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        blob: "blob 2s ease-in-out infinite",
        "integration-scroll-left": "integration-scroll-left 30s linear infinite",
        "integration-scroll-right": "integration-scroll-right 30s linear infinite",
        "logo-bolt-in": "logo-bolt-in 600ms cubic-bezier(0.16,1,0.3,1) both",
        "logo-char-in": "logo-char-in 500ms cubic-bezier(0.16,1,0.3,1) both",
      },
      keyframes: {
        "logo-bolt-in": {
          "0%": { opacity: "0", transform: "translateY(10px) scale(0.9) rotate(-6deg)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1) rotate(0)" },
        },
        "logo-char-in": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        aurora: {
          from: {
            backgroundPosition: "50% 50%, 50% 50%",
          },
          to: {
            backgroundPosition: "350% 50%, 350% 50%",
          },
        },
        spotlight: {
          "0%": {
            opacity: "0",
            transform: "translate(-72%, -62%) scale(0.5)",
          },
          "100%": {
            opacity: "1",
            transform: "translate(-50%,-40%) scale(1)",
          },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        blob: {
          "0%, 100%": { transform: "translateY(10px)" },
          "50%": { transform: "translate(-10px)" },
        },
        "integration-scroll-left": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "integration-scroll-right": {
          "0%": { transform: "translateX(-50%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
    }
  },
  plugins: [addVariablesForColors],
}

// This plugin adds each Tailwind color as a global CSS variable, e.g. var(--gray-200).
function addVariablesForColors({ addBase, theme }: any) {
  let allColors = flattenColorPalette(theme("colors"));
  let newVars = Object.fromEntries(
    Object.entries(allColors).map(([key, val]) => [`--${key}`, val])
  );

  addBase({
    ":root": newVars,
  });
}

export default config
