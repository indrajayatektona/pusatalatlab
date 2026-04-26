import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import sitemap, { ChangeFreqEnum } from '@astrojs/sitemap';
import keystatic from '@keystatic/astro';
import markdoc from '@astrojs/markdoc';
import cloudflare from '@astrojs/cloudflare';

const PRODUCT_CATEGORY_PATHS = [
  '/products/umum/',
  '/products/pertambangan/',
  '/products/semen/',
  '/products/batuan/',
  '/products/tanah/',
  '/products/beton/',
  '/products/aspal/',
];

function normalizePathname(pathname) {
  return pathname.endsWith('/') ? pathname : `${pathname}/`;
}

export default defineConfig({
  site: 'https://pusatalatlabsipil.com',

  adapter: cloudflare({
    imageService: 'passthrough',
  }),

  output: 'static',

  integrations: [
    tailwind(),

    sitemap({
      serialize: (item) => {
        return {
          ...item,
          changefreq: ChangeFreqEnum.DAILY,
          priority: 1.0,
          lastmod: buildDate,
        };
      },
      chunks: {
        'produk-kategori': (item) => {
          const url = new URL(item.url);
          const pathname = normalizePathname(url.pathname);

          if (!PRODUCT_CATEGORY_PATHS.includes(pathname)) {
            return undefined;
          }

          return {
            ...item,
            changefreq: ChangeFreqEnum.DAILY,
            priority: 0.9,
            lastmod: buildDate,
          };
        },

        produk: (item) => {
          const url = new URL(item.url);
          const pathname = normalizePathname(url.pathname);

          const isProductPath = pathname.startsWith('/products/');
          const isProductCategory = PRODUCT_CATEGORY_PATHS.includes(pathname);

          if (!isProductPath || isProductCategory) {
            return undefined;
          }

          return {
            ...item,
            changefreq: ChangeFreqEnum.DAILY,
            priority: 1.0,
            lastmod: buildDate,
          };
        },

        blog: (item) => {
          const url = new URL(item.url);
          const pathname = normalizePathname(url.pathname);

          if (!pathname.startsWith('/blog/')) {
            return undefined;
          }

          return {
            ...item,
            changefreq: ChangeFreqEnum.DAILY,
            priority: 1.0,
            lastmod: buildDate,
          };
        },
      },
    }),

    react(),
    keystatic(),
    markdoc(),
  ],
});