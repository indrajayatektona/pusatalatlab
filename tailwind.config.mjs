/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
				// Palet Industrial Gumroad-style
				civil: {
					primary: '#0F253E', // Navy Blue Gelap (Utama)
					secondary: '#e6c55c', // Gold Kuning (Action/Button)
					accent: '#E2E8F0', // Abu terang (Background section)
					dark: '#1E293B', // Warna text/border
				}
			},
			fontFamily: {
				// Kita akan pakai font Inter (Google Fonts)
				sans: ['Inter', 'sans-serif'], 
			},
			boxShadow: {
				// Hard Shadow khas Gumroad
				'hard': '4px 4px 0px 0px #1E293B', 
				'hard-sm': '2px 2px 0px 0px #1E293B', 
			}
		},
	},
	plugins: [],
}