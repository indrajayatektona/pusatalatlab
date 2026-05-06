import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import keystatic from '@keystatic/astro';
import markdoc from '@astrojs/markdoc';
import cloudflare from '@astrojs/cloudflare';
import robotsTxt from 'astro-robots-txt';

const PRODUCT_CATEGORY_PATHS = new Set([
  '/products/umum/',
  '/products/pertambangan/',
  '/products/semen/',
  '/products/batuan/',
  '/products/tanah/',
  '/products/beton/',
  '/products/aspal/',
]);

function normalizePathname(pathname) {
  return pathname.endsWith('/') ? pathname : `${pathname}/`;
}

function isProductPaginationPath(pathname) {
  return (
    /^\/products\/\d+\/?$/.test(pathname) ||
    /^\/products\/[^/]+\/\d+\/?$/.test(pathname)
  );
}

function getNormalizedPathname(item) {
  const url = new URL(item.url);
  return normalizePathname(url.pathname);
}

export default defineConfig({
  site: 'https://pusatalatlabsipil.com',

  adapter: cloudflare({
    imageService: 'passthrough',
  }),

  output: 'static',

  integrations: [
    tailwind(),

    robotsTxt({
      policy: [
        {
          userAgent: '*',
          allow: '/',
          disallow: ['/api/', '/keystatic/'],
        },
      ],
      sitemap: true,
    }),

    sitemap({
      serialize: (item) => {
        const pathname = getNormalizedPathname(item);

        if (isProductPaginationPath(pathname)) {
          return undefined;
        }

        if (
          pathname.startsWith('/api/') ||
          pathname.startsWith('/keystatic/')
        ) {
          return undefined;
        }

        return item;
      },

      chunks: {
        'produk-kategori': (item) => {
          const pathname = getNormalizedPathname(item);

          if (!PRODUCT_CATEGORY_PATHS.has(pathname)) {
            return undefined;
          }

          return item;
        },

        produk: (item) => {
          const pathname = getNormalizedPathname(item);

          const isProductPath = pathname.startsWith('/products/');
          const isProductCategory = PRODUCT_CATEGORY_PATHS.has(pathname);
          const isPagination = isProductPaginationPath(pathname);

          if (!isProductPath || isProductCategory || isPagination) {
            return undefined;
          }

          return item;
        },

        blog: (item) => {
          const pathname = getNormalizedPathname(item);

          if (!pathname.startsWith('/blog/')) {
            return undefined;
          }

          return item;
        },
      },
    }),

    react(),
    keystatic(),
    markdoc(),
  ],
});
