import fs from 'node:fs';
import path from 'node:path';

/**
 * Pengaman build: memastikan setiap halaman statis masih memuat CSS Tailwind.
 *
 * Latar belakang: pada Tahap 7 ada hook yang melepas <link> CSS dari semua
 * halaman karena namanya mengandung "keystatic". File itu ternyata CSS global
 * Tailwind situs, sehingga produksi tampil tanpa styling sama sekali.
 * Pemeriksaan ini menggagalkan build (bukan hanya memberi peringatan) agar
 * kerusakan seperti itu tidak pernah sampai ke produksi.
 */

const DIST = 'dist';

// Penanda utility Tailwind yang selalu dipakai di layout/komponen situs.
const TAILWIND_MARKERS = ['.bg-civil-dark', '.shadow-hard', '--tw-ring'];

function collectHtml(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectHtml(full, out);
    } else if (entry.name.endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
}

function localStylesheets(html) {
  return [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)]
    .map((match) => match[0])
    .map((tag) => tag.match(/href="(\/_astro\/[^"]+\.css)"/)?.[1])
    .filter(Boolean);
}

function fail(messages) {
  console.error('\n[verify-build] BUILD DIBATALKAN — CSS situs tidak lengkap:\n');
  for (const message of messages.slice(0, 20)) {
    console.error(`  - ${message}`);
  }
  if (messages.length > 20) {
    console.error(`  ... dan ${messages.length - 20} masalah lain.`);
  }
  console.error('\nHalaman publik tanpa CSS Tailwind akan tampil rusak di produksi.');
  console.error('Periksa integrasi Tailwind dan hook build yang menyentuh <link> CSS.\n');
  process.exit(1);
}

if (!fs.existsSync(DIST)) {
  fail([`Folder ${DIST}/ tidak ditemukan. Jalankan "astro build" terlebih dahulu.`]);
}

const htmlFiles = collectHtml(DIST);
const problems = [];

const cssCache = new Map();
function readCss(href) {
  if (cssCache.has(href)) return cssCache.get(href);

  const file = path.join(DIST, href.replace(/^\//, ''));
  const content = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  cssCache.set(href, content);
  return content;
}

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const hrefs = localStylesheets(html);
  const page = path.relative(DIST, file);

  if (hrefs.length === 0) {
    problems.push(`${page}: tidak ada satu pun <link rel="stylesheet"> lokal`);
    continue;
  }

  let hasTailwind = false;

  for (const href of hrefs) {
    const css = readCss(href);

    if (css === null) {
      problems.push(`${page}: file CSS ${href} dirujuk tetapi tidak ada di ${DIST}/`);
      continue;
    }

    if (TAILWIND_MARKERS.some((marker) => css.includes(marker))) {
      hasTailwind = true;
    }
  }

  if (!hasTailwind) {
    problems.push(`${page}: stylesheet yang dirujuk tidak memuat utility Tailwind`);
  }
}

if (problems.length > 0) {
  fail(problems);
}

console.log(
  `[verify-build] OK — ${htmlFiles.length} halaman memuat CSS Tailwind.`
);
