/**
 * Generator public/llms.txt.
 *
 * Dijalankan otomatis lewat `prebuild` dan `dev` (lihat package.json), jadi
 * file selalu ikut terbarui sebelum build.
 *
 * Aturan penting: entri draft dan halaman `seo.noIndex: true` TIDAK boleh
 * masuk. File ini dibaca langsung oleh mesin AI, jadi apa pun yang tidak
 * diindeks Google juga tidak boleh dipromosikan di sini.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

const CONTENT_DIR = 'src/content';
const OUTPUT_FILE = path.join('public', 'llms.txt');
const BASE_URL = 'https://pusatalatlabsipil.com';

const CATEGORIES = [
  { name: 'Alat Lab Aspal', slug: 'aspal' },
  { name: 'Alat Lab Beton', slug: 'beton' },
  { name: 'Alat Lab Tanah', slug: 'tanah' },
  { name: 'Alat Lab Batuan', slug: 'batuan' },
  { name: 'Alat Lab Semen', slug: 'semen' },
  { name: 'Pertambangan', slug: 'pertambangan' },
  { name: 'Alat Umum', slug: 'umum' },
];

function readCollection(collection) {
  const dir = path.join(CONTENT_DIR, collection);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((file) => /\.(mdoc|md|mdx)$/i.test(file))
    .map((file) => {
      // Buang BOM supaya regex frontmatter tetap cocok.
      const raw = fs
        .readFileSync(path.join(dir, file), 'utf8')
        .replace(/^\uFEFF/, '');
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

function isPublic(entry) {
  return entry.data.status !== 'draft' && entry.data?.seo?.noIndex !== true;
}

function toTime(value) {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function oneLine(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function generateLLMsText() {
  const lines = [];

  lines.push('# Pusat Alat Lab Sipil - Distributor Alat Laboratorium Teknik Sipil');
  lines.push('');
  lines.push(
    '> Distributor resmi dan produsen alat laboratorium teknik sipil dengan jaminan garansi',
  );
  lines.push(
    '> dan kualitas standar SNI/ASTM. Melayani pengadaan peralatan untuk pengujian tanah,',
  );
  lines.push('> beton, aspal, batuan, dan semen di seluruh Indonesia.');
  lines.push('');

  lines.push('## Kontak');
  lines.push('- Email: sales@pusatalatlabsipil.com');
  lines.push('- WhatsApp: +62 878-9303-0300');
  lines.push(
    '- Alamat: Jl. Jend. Amir Machmud No. 111/115, Cibeureum, Cimahi Selatan, Jawa Barat, Indonesia',
  );
  lines.push(
    '- Harga: berbasis penawaran (quotation). Hubungi sales untuk daftar harga dan surat dukungan tender.',
  );
  lines.push('');

  lines.push('## Halaman Utama');
  lines.push(`- [Beranda](${BASE_URL}/)`);
  lines.push(`- [Katalog Produk](${BASE_URL}/products/)`);
  lines.push(`- [Blog & Artikel Teknik Sipil](${BASE_URL}/blog/)`);
  lines.push(`- [Panduan Pengadaan](${BASE_URL}/panduan-pengadaan/)`);
  lines.push(`- [FAQ](${BASE_URL}/faq/)`);
  lines.push(`- [Kontak](${BASE_URL}/contact/)`);
  lines.push('');

  lines.push('## Kategori Produk');
  for (const category of CATEGORIES) {
    lines.push(`- [${category.name}](${BASE_URL}/products/${category.slug}/)`);
  }
  lines.push('');

  const products = readCollection('products')
    .filter(isPublic)
    .sort(
      (a, b) => toTime(b.data.publishDate) - toTime(a.data.publishDate),
    );

  if (products.length > 0) {
    lines.push('## Produk');
    for (const { slug, data } of products) {
      const title = oneLine(data.title);
      if (!title) continue;

      const category = oneLine(data.category);
      const description = oneLine(
        data.description ?? data?.seo?.metaDescription,
      );
      const suffix = [category, description].filter(Boolean).join(' - ');

      lines.push(
        `- [${title}](${BASE_URL}/products/${slug}/)${suffix ? `: ${suffix}` : ''}`,
      );
    }
    lines.push('');
  }

  const posts = readCollection('blog')
    .filter(isPublic)
    .sort(
      (a, b) =>
        toTime(b.data.updatedDate ?? b.data.pubDate) -
        toTime(a.data.updatedDate ?? a.data.pubDate),
    );

  if (posts.length > 0) {
    lines.push('## Artikel');
    for (const { slug, data } of posts) {
      const title = oneLine(data.title);
      if (!title) continue;
      lines.push(`- [${title}](${BASE_URL}/blog/${slug}/)`);
    }
    lines.push('');
  }

  fs.writeFileSync(OUTPUT_FILE, lines.join('\n'));
  console.log(
    `[llms.txt] ${products.length} produk + ${posts.length} artikel ditulis ke ${OUTPUT_FILE}`,
  );
}

generateLLMsText();
