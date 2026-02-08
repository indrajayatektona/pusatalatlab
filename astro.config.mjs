import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import react from '@astrojs/react';
import sitemap from "@astrojs/sitemap";
import keystatic from '@keystatic/astro';
import markdoc from '@astrojs/markdoc';

// https://astro.build/config
export default defineConfig({
  // Ganti dengan domain aslimu nanti saat deploy.
  site: 'https://pusatalatlabsipil.com',
  
  integrations: [
    tailwind(), 
    sitemap(), 
    react(),
    keystatic(),
    markdoc()
  ]
});