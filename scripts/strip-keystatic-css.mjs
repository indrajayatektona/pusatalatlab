import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Menghapus <link> CSS Keystatic dari semua halaman statis hasil build.
 *
 * Integrasi `@keystatic/astro` mendaftarkan route admin `/keystatic` sebagai
 * route on-demand (prerender: false). Astro ikut mengangkat CSS route tersebut
 * (~90 KB) ke seluruh halaman statis sebagai stylesheet render-blocking,
 * padahal halaman publik tidak memakai satu pun class Keystatic.
 *
 * File CSS-nya TIDAK dihapus karena masih dibutuhkan oleh route /keystatic
 * yang dirender oleh worker. Yang dihapus hanya tag <link> di HTML statis.
 */
export function stripKeystaticCss() {
  return {
    name: 'strip-keystatic-css',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const htmlFiles = [];

        const walk = (directory) => {
          for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            const fullPath = path.join(directory, entry.name);
            if (entry.isDirectory()) {
              walk(fullPath);
            } else if (entry.name.endsWith('.html')) {
              htmlFiles.push(fullPath);
            }
          }
        };

        walk(root);

        const keystaticCssLink = /<link[^>]+href="\/_astro\/keystatic[^"]*\.css"[^>]*>/g;
        const hasKeystaticCssLink = /<link[^>]+href="\/_astro\/keystatic[^"]*\.css"[^>]*>/;
        let patched = 0;

        for (const file of htmlFiles) {
          const html = fs.readFileSync(file, 'utf8');
          if (!hasKeystaticCssLink.test(html)) continue;

          fs.writeFileSync(file, html.replace(keystaticCssLink, ''));
          patched += 1;
        }

        logger.info(`CSS Keystatic dilepas dari ${patched} halaman statis.`);
      },
    },
  };
}
