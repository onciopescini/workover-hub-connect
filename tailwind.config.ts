
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
		"./src/feature/**/*.{ts,tsx,js,jsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				'stitch-bg': 'var(--color-bg)',
				'stitch-surface': 'var(--color-surface)',
				'stitch-text': 'var(--color-text)',
				'stitch-muted': 'var(--color-muted)',
				'stitch-brand': 'var(--color-brand)',
				'stitch-accent': 'var(--color-accent)',
				'stitch-success': 'var(--color-success)',
				'stitch-error': 'var(--color-error)',
				'stitch-border': 'var(--color-border)'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				'stitch-xl': 'var(--radius-xl)',
				'stitch-lg': 'var(--radius-lg)',
				'stitch-md': 'var(--radius-md)'
			},
			boxShadow: {
				'stitch-card': 'var(--shadow-card)',
				'stitch-elevated': 'var(--shadow-elevated)',
				'stitch-glow': 'var(--shadow-glow)'
			},
			fontFamily: {
				'stitch-display': 'var(--font-display)',
				'stitch-body': 'var(--font-body)'
			},
			fontSize: {
				'stitch-hero': 'var(--font-size-hero)',
				'stitch-h1': 'var(--font-size-h1)',
				'stitch-h2': 'var(--font-size-h2)',
				'stitch-h3': 'var(--font-size-h3)'
			},
			spacing: {
				'stitch-section': 'var(--space-section)',
				'stitch-card': 'var(--space-card)',
				'stitch-element': 'var(--space-element)'
			},
			zIndex: {
				'map': 'var(--z-map)',
				'filters': 'var(--z-filters)',
				'portal': 'var(--z-portal)',
				'toast': 'var(--z-toast)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'float': {
					'0%': { 
						transform: 'translateY(0px) rotate(0deg)' 
					},
					'100%': { 
						transform: 'translateY(-20px) rotate(180deg)' 
					}
				},
				'float-slow': {
					'0%': { 
						transform: 'translateY(0px) rotate(0deg)' 
					},
					'100%': { 
						transform: 'translateY(-15px) rotate(90deg)' 
					}
				},
				'float-fast': {
					'0%': { 
						transform: 'translateY(0px) rotate(0deg)' 
					},
					'100%': { 
						transform: 'translateY(-25px) rotate(270deg)' 
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'float': 'float 3s ease-in-out infinite alternate',
				'float-slow': 'float-slow 4s ease-in-out infinite alternate',
				'float-fast': 'float-fast 2s ease-in-out infinite alternate'
			}
		}
	},
	plugins: [
		require("tailwindcss-animate"),
		function({ addUtilities }: any) {
			const newUtilities = {
				'.hover-scale-gpu': {
					'will-change': 'transform',
					'&:hover': {
						transform: 'scale(1.05)',
					},
				},
			};
			addUtilities(newUtilities);
		},
	],
} satisfies Config;
