import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import keystatic from '@keystatic/astro';
import markdoc from '@astrojs/markdoc';
import cloudflare from '@astrojs/cloudflare';
import robotsTxt from 'astro-robots-txt';
import { LASTMOD_BY_PATH, NOINDEX_PATHS } from './scripts/sitemap-data.mjs';
import { stripKeystaticCss } from './scripts/strip-keystatic-css.mjs';

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

// Pagination blog & arsip tag: duplikat konten, selalu noindex di halamannya.
function isBlogPaginationPath(pathname) {
  return (
    /^\/blog\/\d+\/?$/.test(pathname) ||
    /^\/blog\/tag\/[^/]+\/\d+\/?$/.test(pathname)
  );
}

// Arsip tag: halaman tipis dengan judul hampir identik, tidak layak diindeks.
function isTagArchivePath(pathname) {
  return pathname.startsWith('/blog/tag/');
}

function isExcludedPath(pathname) {
  return (
    isProductPaginationPath(pathname) ||
    isBlogPaginationPath(pathname) ||
    isTagArchivePath(pathname) ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/keystatic/') ||
    NOINDEX_PATHS.has(pathname)
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

  // URL lama arsip tag masih hidup di produksi. Slug tag kini dinormalisasi
  // (koma -> tanda hubung), jadi URL lama dialihkan permanen ke URL baru.
  redirects: {
    '/blog/tag/beton,-mutu-beton/': '/blog/tag/beton-mutu-beton/',
  },

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

        if (isExcludedPath(pathname)) {
          return undefined;
        }

        const lastmod = LASTMOD_BY_PATH.get(pathname);
        if (lastmod) {
          return { ...item, lastmod };
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
    stripKeystaticCss(),
  ],
});
