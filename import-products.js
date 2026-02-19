import fs from 'fs';
import csv from 'csv-parser';
import slugify from 'slugify';

// Konfigurasi
const CSV_FILE = 'data_produk.csv';
const OUTPUT_DIR = 'src/content/products';

const results = [];

// Helper: Ubah string "Key:Val | Key2:Val2" di CSV jadi format Teks Multiline 
// (Menyesuaikan dengan mode input spesifikasi cepat yang baru)
function parseSpecsToMultiline(rawString) {
  if (!rawString) return '';
  return rawString.split('|').map(item => {
    const parts = item.split(':');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join(':').trim(); // Gabung sisa jika ada titik dua
      return `${key} : ${val}`;
    }
    return '';
  }).filter(line => line !== '').join('\n');
}

// Helper: Mencegah error jika ada tanda kutip ganda (") di dalam CSV
function escapeYamlString(str) {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

// Baca File CSV
fs.createReadStream(CSV_FILE)
  .pipe(csv())
  .on('data', (data) => results.push(data))
  .on('end', () => {
    console.log(`🔍 Membaca ${results.length} baris data...`);

    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    results.forEach((row) => {
      processProduct(row);
    });

    console.log('✅ SELESAI! Produk berhasil di-generate.');
  });

function processProduct(row) {
  if (!row.Judul) return; // Wajib ada Nama Produk

  // 1. Slug (Auto dari Judul)
  const slug = slugify(row.Judul, { lower: true, strict: true });
  const today = new Date().toISOString().split('T')[0];
  
  // 2. Parsing Array Standar (Pisahkan dengan koma atau pipa | di CSV)
  let standardsYaml = '[]';
  if (row.Standar) {
    const standardsArray = row.Standar.split(/[|,]/).map(s => s.trim()).filter(s => s !== '');
    if (standardsArray.length > 0) {
      standardsYaml = '\n' + standardsArray.map(s => `  - "${escapeYamlString(s)}"`).join('\n');
    }
  }

  // 3. Parsing Object Spesifikasi menjadi format Teks (Multiline YAML)
  let specsText = '';
  if (row.Spesifikasi) {
    if (row.Spesifikasi.includes('|') || row.Spesifikasi.includes(':')) {
        specsText = parseSpecsToMultiline(row.Spesifikasi);
    } else {
        specsText = row.Spesifikasi;
    }
  }
  // Indentasi YAML untuk teks multiline (menggunakan operator |)
  const specsYaml = specsText ? `|\n  ${specsText.replace(/\n/g, '\n  ')}` : `""`;

  // 4. Generate Body Content (Deskripsi Lengkap)
  let bodyContent = row.Konten_Lengkap || `Deskripsi lengkap untuk produk **${row.Judul}** belum tersedia.`;

  // 5. Susun Frontmatter (YAML) sesuai Schema Keystatic
  const fileContent = `---
title: "${escapeYamlString(row.Judul)}"
id: "${escapeYamlString(row.SKU || '')}"
seo:
  metaTitle: "${escapeYamlString(row.Meta_Title || '')}"
  metaDescription: "${escapeYamlString(row.Meta_Description || '')}"
  customTitle: "${escapeYamlString(row.Custom_H1 || '')}"
  breadcrumbTitle: "${escapeYamlString(row.Breadcrumb || '')}"
  canonicalUrl: "${escapeYamlString(row.Canonical || '')}"
  noIndex: ${row.NoIndex === 'true' || row.NoIndex === '1' ? 'true' : 'false'}
category: "${escapeYamlString(row.Kategori || 'Umum')}"
image: "${escapeYamlString(row.Gambar || '')}"
standards: ${standardsYaml}
brochureLink: "${escapeYamlString(row.Brosur || '')}"
specifications: ${specsYaml}
description: "${escapeYamlString(row.Ringkasan || '')}"
featured: false
publishDate: ${today}
---
${bodyContent}
`;

  const filePath = `${OUTPUT_DIR}/${slug}.mdoc`;
  try {
    fs.writeFileSync(filePath, fileContent);
    // console.log(`Drafted: ${slug}`);
  } catch (err) {
    console.error(`❌ Gagal generate: ${slug}`, err);
  }
}