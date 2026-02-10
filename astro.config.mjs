import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import react from '@astrojs/react';
import sitemap from "@astrojs/sitemap";
import keystatic from '@keystatic/astro';
import markdoc from '@astrojs/markdoc';

// 1. Adapter Cloudflare TETAP DIPAKAI
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://pusatalatlabsipil.com',
  adapter: cloudflare(),
  
  integrations: [
    tailwind(), 
    sitemap(), 
    react(),
    keystatic(),
    markdoc()
  ]
});