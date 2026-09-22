import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Enhanced M3 Typography Scale with stronger hierarchy
        'display-lg': ['3.75rem', { lineHeight: '1.1', fontWeight: '700', letterSpacing: '-0.03em' }],
        'display-md': ['3rem', { lineHeight: '1.15', fontWeight: '700', letterSpacing: '-0.025em' }],
        'display-sm': ['2.5rem', { lineHeight: '1.2', fontWeight: '600', letterSpacing: '-0.02em' }],
        'headline-lg': ['2.125rem', { lineHeight: '1.25', fontWeight: '600', letterSpacing: '-0.015em' }],
        'headline-md': ['1.875rem', { lineHeight: '1.3', fontWeight: '600', letterSpacing: '-0.01em' }],
        'headline-sm': ['1.625rem', { lineHeight: '1.35', fontWeight: '600' }],
        'title-lg': ['1.5rem', { lineHeight: '1.35', fontWeight: '600' }],
        'title-md': ['1.125rem', { lineHeight: '1.4', fontWeight: '600', letterSpacing: '0.01em' }],
        'title-sm': ['1rem', { lineHeight: '1.45', fontWeight: '600', letterSpacing: '0.01em' }],
        'body-lg': ['1.0625rem', { lineHeight: '1.6', fontWeight: '400', letterSpacing: '0.015em' }],
        'body-md': ['0.9375rem', { lineHeight: '1.55', fontWeight: '400', letterSpacing: '0.01em' }],
        'body-sm': ['0.8125rem', { lineHeight: '1.5', fontWeight: '400', letterSpacing: '0.02em' }],
        'label-lg': ['0.9375rem', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.02em' }],
        'label-md': ['0.8125rem', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.03em' }],
        'label-sm': ['0.75rem', { lineHeight: '1.35', fontWeight: '500', letterSpacing: '0.04em' }],
        // Financial statement text - excluded from changes
        'financial': ['0.875rem', { lineHeight: '1.5', fontWeight: '400', letterSpacing: '0' }],
      },
      colors: {
        border: {
          DEFAULT: "hsl(var(--border))",
          lighter: "hsl(var(--border-lighter))",
          category: "hsl(var(--border-category))",
          checkbox: "hsl(var(--checkbox-border))",
        },
        "category-accent": "hsl(var(--category-accent))",
        "category-title": "hsl(var(--category-title))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        link: "hsl(var(--link))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          button: {
            DEFAULT: "hsl(var(--secondary-button-bg))",
            hover: "hsl(var(--secondary-button-bg-hover))",
            active: "hsl(var(--secondary-button-bg-active))",
            foreground: "hsl(var(--secondary-button-foreground))",
            border: "hsl(var(--secondary-button-border))",
            "border-hover": "hsl(var(--secondary-button-border-hover))",
            "border-active": "hsl(var(--secondary-button-border-active))",
          },
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
        // M3 Color tokens
        surface: {
          DEFAULT: "hsl(var(--m3-surface))",
          variant: "hsl(var(--m3-surface-variant))",
          container: {
            lowest: "hsl(var(--m3-surface-container-lowest))",
            low: "hsl(var(--m3-surface-container-low))",
            DEFAULT: "hsl(var(--m3-surface-container))",
            high: "hsl(var(--m3-surface-container-high))",
            highest: "hsl(var(--m3-surface-container-highest))",
          },
        },
        "on-surface": {
          DEFAULT: "hsl(var(--m3-on-surface))",
          variant: "hsl(var(--m3-on-surface-variant))",
        },
        "primary-container": {
          DEFAULT: "hsl(var(--m3-primary-container))",
        },
        "on-primary-container": {
          DEFAULT: "hsl(var(--m3-on-primary-container))",
        },
        "secondary-container": {
          DEFAULT: "hsl(var(--m3-secondary-container))",
        },
        "on-secondary-container": {
          DEFAULT: "hsl(var(--m3-on-secondary-container))",
        },
        "tertiary-container": {
          DEFAULT: "hsl(var(--m3-tertiary-container))",
        },
        "on-tertiary-container": {
          DEFAULT: "hsl(var(--m3-on-tertiary-container))",
        },
        error: {
          DEFAULT: "hsl(var(--m3-error))",
          container: "hsl(var(--m3-error-container))",
        },
        "on-error": {
          DEFAULT: "hsl(var(--m3-on-error))",
          container: "hsl(var(--m3-on-error-container))",
        },
        "on-primary": {
          DEFAULT: "hsl(var(--primary-foreground))",
        },
        outline: {
          DEFAULT: "hsl(var(--m3-outline))",
          variant: "hsl(var(--m3-outline-variant))",
        },
        inverse: {
          surface: "hsl(var(--m3-inverse-surface))",
          "on-surface": "hsl(var(--m3-inverse-on-surface))",
          primary: "hsl(var(--m3-inverse-primary))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
          bg: "hsl(var(--sidebar-bg))",
          muted: "hsl(var(--sidebar-muted))",
        },
        dropzone: {
          bg: "hsl(var(--dropzone-bg))",
          border: "hsl(var(--dropzone-border))",
          hover: "hsl(var(--dropzone-hover))",
        },
        countable: {
          blue: "hsl(var(--countable-blue))",
          "blue-light": "hsl(var(--countable-blue-light))",
          "blue-dark": "hsl(var(--countable-blue-dark))",
          teal: "hsl(var(--countable-teal))",
          navy: "hsl(var(--countable-navy))",
        },
      },
      borderRadius: {
        // Futuristic Shape scale - Enhanced curvature for modern look
        'none': '0',
        'xs': '6px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '32px',
        'full': '9999px',
        // Button specific radius
        'button': '0.75rem',
      },
      boxShadow: {
        // M3 Elevation
        'elevation-1': 'var(--elevation-1)',
        'elevation-2': 'var(--elevation-2)',
        'elevation-3': 'var(--elevation-3)',
        'elevation-4': 'var(--elevation-4)',
        'elevation-5': 'var(--elevation-5)',
      },
      transitionTimingFunction: {
        // M3 Motion easing
        'emphasized': 'cubic-bezier(0.2, 0, 0, 1)',
        'emphasized-decelerate': 'cubic-bezier(0.05, 0.7, 0.1, 1)',
        'emphasized-accelerate': 'cubic-bezier(0.3, 0, 0.8, 0.15)',
        'standard': 'cubic-bezier(0.2, 0, 0, 1)',
        'standard-decelerate': 'cubic-bezier(0, 0, 0, 1)',
        'standard-accelerate': 'cubic-bezier(0.3, 0, 1, 1)',
      },
      transitionDuration: {
        // M3 Motion durations
        'short1': '50ms',
        'short2': '100ms',
        'short3': '150ms',
        'short4': '200ms',
        'medium1': '250ms',
        'medium2': '300ms',
        'medium3': '350ms',
        'medium4': '400ms',
        'long1': '450ms',
        'long2': '500ms',
        'long3': '550ms',
        'long4': '600ms',
        'extra-long1': '700ms',
        'extra-long2': '800ms',
        'extra-long3': '900ms',
        'extra-long4': '1000ms',
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.92)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 5px hsl(207 71% 38% / 0.3)" },
          "50%": { boxShadow: "0 0 20px hsl(207 71% 38% / 0.5)" },
        },
        // M3 Checkbox animations
        "m3-ripple": {
          "0%": { transform: "scale(0)", opacity: "1" },
          "100%": { transform: "scale(2.5)", opacity: "0" },
        },
        "m3-checkmark-in": {
          "0%": { transform: "scale(0)", opacity: "0" },
          "50%": { transform: "scale(1.2)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        // Pop-out / hover effects
        "pop-out": {
          "0%": { transform: "scale(1)", boxShadow: "0 0 0 transparent" },
          "100%": { transform: "scale(1.02)", boxShadow: "0 8px 25px hsl(213 40% 20% / 0.12)" },
        },
        "pop-in": {
          "0%": { transform: "scale(1.02)", boxShadow: "0 8px 25px hsl(213 40% 20% / 0.12)" },
          "100%": { transform: "scale(1)", boxShadow: "0 0 0 transparent" },
        },
        "highlight-pulse": {
          "0%, 100%": { backgroundColor: "transparent" },
          "50%": { backgroundColor: "hsl(207 71% 38% / 0.08)" },
        },
        "button-press": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(0.97)" },
          "100%": { transform: "scale(1)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 hsl(207 71% 38% / 0)" },
          "50%": { boxShadow: "0 0 20px 4px hsl(207 71% 38% / 0.2)" },
        },
        "lift-shadow": {
          "0%": { transform: "translateY(0)", boxShadow: "0 2px 8px hsl(213 40% 20% / 0.08)" },
          "100%": { transform: "translateY(-2px)", boxShadow: "0 12px 32px hsl(213 40% 20% / 0.15)" },
        },
        "swing": {
          "0%": { transform: "rotate(0deg)" },
          "15%": { transform: "rotate(12deg)" },
          "30%": { transform: "rotate(-10deg)" },
          "45%": { transform: "rotate(6deg)" },
          "60%": { transform: "rotate(-4deg)" },
          "75%": { transform: "rotate(2deg)" },
          "100%": { transform: "rotate(0deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-emphasized",
        "accordion-up": "accordion-up 0.2s ease-emphasized",
        "fade-in": "fade-in 0.2s ease-emphasized",
        "slide-up": "slide-up 0.3s ease-emphasized",
        "scale-in": "scale-in 0.2s ease-emphasized",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "m3-ripple": "m3-ripple 400ms cubic-bezier(0.2, 0, 0, 1) forwards",
        "m3-checkmark-in": "m3-checkmark-in 200ms cubic-bezier(0.05, 0.7, 0.1, 1) forwards",
        // Interactive micro-animations
        "pop-out": "pop-out 200ms cubic-bezier(0.2, 0, 0, 1) forwards",
        "pop-in": "pop-in 150ms cubic-bezier(0.2, 0, 0, 1) forwards",
        "highlight-pulse": "highlight-pulse 600ms ease-in-out",
        "button-press": "button-press 150ms ease-out",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "lift-shadow": "lift-shadow 200ms cubic-bezier(0.2, 0, 0, 1) forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;