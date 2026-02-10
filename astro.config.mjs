import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import react from '@astrojs/react';
import sitemap from "@astrojs/sitemap";
import keystatic from '@keystatic/astro';
import markdoc from '@astrojs/markdoc';

export default defineConfig({
  site: 'https://pusatalatlabsipil.com',
  
  // 2. Tambahkan pengaturan Output & Adapter
  output: 'hybrid', // 'hybrid' = Halaman statis tetap cepat, API tetap jalan
  adapter: cloudflare(),
  
  integrations: [
    tailwind(), 
    sitemap(), 
    react(),
    keystatic(),
    markdoc()
  ]
});