/**
 * Sumber data untuk konfigurasi sitemap (astro.config.mjs).
 *
 * Membaca frontmatter koleksi konten langsung dari disk karena
 * `astro:content` tidak tersedia saat astro.config.mjs dievaluasi.
 *
 * Output:
 *  - NOINDEX_PATHS  : Set pathname (dengan trailing slash) yang harus
 *                     dikeluarkan dari sitemap karena `seo.noIndex: true`
 *                     atau berstatus draft.
 *  - LASTMOD_BY_PATH: Map pathname -> Date untuk mengisi <lastmod>.
 *                     Hanya diisi dari tanggal yang benar-benar ada di
 *                     konten, bukan tanggal build (tanggal build yang
 *                     berubah tiap deploy membuat Google mengabaikan lastmod).
 */
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

const CONTENT_ROOT = path.resolve(process.cwd(), 'src/content');

const CATEGORY_SLUGS = {
  Aspal: 'aspal',
  Beton: 'beton',
  Tanah: 'tanah',
  Batuan: 'batuan',
  Semen: 'semen',
  Pertambangan: 'pertambangan',
  Umum: 'umum',
};

function readCollection(collection) {
  const dir = path.join(CONTENT_ROOT, collection);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((file) => /\.(mdoc|md|mdx)$/i.test(file))
    .map((file) => {
      // Buang BOM kalau ada: kalau tidak, regex frontmatter di bawah gagal
      // cocok dan entri ini hilang dari sitemap tanpa pesan error apa pun.
      const raw = fs.readFileSync(path.join(dir, file), 'utf8').replace(/^\uFEFF/, '');
      const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!match) return null;

      let data;
      try {
        data = parse(match[1]) ?? {};
      } catch {
        return null;
      }

      if (!data || typeof data !== 'object') return null;

      return {
        slug: file.replace(/\.(mdoc|md|mdx)$/i, ''),
        data,
      };
    })
    .filter(Boolean);
}

function toDate(value) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function latest(dates) {
  const valid = dates.filter(Boolean);
  if (valid.length === 0) return undefined;
  return new Date(Math.max(...valid.map((d) => d.getTime())));
}

function build() {
  const noindex = new Set();
  const lastmod = new Map();

  // --- PRODUK ---
  const products = readCollection('products').filter(
    (entry) => entry.data.status !== 'draft',
  );

  const categoryLatest = new Map();
  const productDates = [];

  for (const { slug, data } of products) {
    if (data?.seo?.noIndex === true) {
      noindex.add(`/products/${slug}/`);
    }

    const date = toDate(data.publishDate);
    if (!date) continue;

    lastmod.set(`/products/${slug}/`, date);
    productDates.push(date);

    const categorySlug = CATEGORY_SLUGS[data.category];
    if (categorySlug) {
      categoryLatest.set(
        categorySlug,
        latest([categoryLatest.get(categorySlug), date]),
      );
    }
  }

  for (const [categorySlug, date] of categoryLatest) {
    lastmod.set(`/products/${categorySlug}/`, date);
  }

  const productIndexDate = latest(productDates);
  if (productIndexDate) {
    lastmod.set('/products/', productIndexDate);
  }

  // --- BLOG ---
  const posts = readCollection('blog').filter(
    (entry) => entry.data.status !== 'draft',
  );

  const postDates = [];

  for (const { slug, data } of posts) {
    if (data?.seo?.noIndex === true) {
      noindex.add(`/blog/${slug}/`);
    }

    const date = toDate(data.updatedDate) ?? toDate(data.pubDate);
    if (!date) continue;

    lastmod.set(`/blog/${slug}/`, date);
    postDates.push(date);
  }

  const blogIndexDate = latest(postDates);
  if (blogIndexDate) {
    lastmod.set('/blog/', blogIndexDate);
  }

  // --- HALAMAN STATIS (src/content/pages) ---
  for (const { slug, data } of readCollection('pages')) {
    if (data?.seo?.noIndex === true) {
      noindex.add(`/${slug}/`);
    }
  }

  return { noindex, lastmod };
}

const { noindex, lastmod } = build();

export const NOINDEX_PATHS = noindex;
export const LASTMOD_BY_PATH = lastmod;
