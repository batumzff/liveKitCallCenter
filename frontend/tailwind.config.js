/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand colors (Indigo/Blue theme)
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',  // Main primary
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        // Secondary colors for accents
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        // Success states (Green)
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',  // Main success
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#0f2027',
        },
        // Warning states (Amber)
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',  // Main warning
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#5c1a07',
        },
        // Error/Danger states (Red)
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',  // Main error
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        // Info states (same as primary)
        info: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',  // Main info
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // Enhanced neutral grays with better contrast
        neutral: {
          0: '#ffffff',
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',  // Better for text
          600: '#525252',  // Good for secondary text
          700: '#404040',  // Primary text color
          800: '#262626',  // Dark text
          900: '#171717',  // Very dark
          950: '#0a0a0a',
        },
        // Background colors with proper contrast
        background: {
          primary: '#ffffff',
          secondary: '#f8fafc',
          tertiary: '#f1f5f9',
          dark: '#0f172a',
          card: '#ffffff',
          modal: '#ffffff',
        },
        // Border colors
        border: {
          light: '#e2e8f0',
          medium: '#cbd5e1',
          dark: '#94a3b8',
          focus: '#0ea5e9',
          error: '#ef4444',
          success: '#22c55e',
        },
        // Text colors with proper contrast ratios
        text: {
          primary: '#0f172a',      // Very dark for main text
          secondary: '#475569',    // Medium gray for secondary text
          tertiary: '#64748b',     // Light gray for tertiary text
          disabled: '#94a3b8',     // Very light for disabled states
          inverse: '#ffffff',      // White text for dark backgrounds
          link: '#0ea5e9',         // Primary color for links
          'link-hover': '#0284c7', // Darker primary for link hover
        },
        // Call center specific colors
        call: {
          incoming: '#22c55e',    // Green
          outgoing: '#0ea5e9',    // Primary blue
          missed: '#ef4444',      // Red
          completed: '#10b981',   // Emerald
          failed: '#f97316',      // Orange
          ringing: '#8b5cf6',     // Purple
        },
        // Agent status colors
        agent: {
          active: '#22c55e',      // Green
          inactive: '#64748b',    // Gray
          error: '#ef4444',       // Red
          testing: '#f97316',     // Orange
        },
        // Campaign status colors
        campaign: {
          draft: '#64748b',       // Gray
          active: '#22c55e',      // Green
          paused: '#f97316',      // Orange
          stopped: '#ef4444',     // Red
          completed: '#0ea5e9',   // Blue
        }
      },
      // Enhanced shadow system for better depth
      boxShadow: {
        'soft': '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
        'large': '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'modal': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'focus': '0 0 0 3px rgba(14, 165, 233, 0.1)',
      },
      // Enhanced border radius
      borderRadius: {
        'xs': '0.125rem',   // 2px
        'sm': '0.25rem',    // 4px
        'md': '0.375rem',   // 6px
        'lg': '0.5rem',     // 8px
        'xl': '0.75rem',    // 12px
        '2xl': '1rem',      // 16px
        '3xl': '1.5rem',    // 24px
      },
      // Custom spacing for consistent layouts
      spacing: {
        '18': '4.5rem',     // 72px
        '88': '22rem',      // 352px
        '128': '32rem',     // 512px
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}