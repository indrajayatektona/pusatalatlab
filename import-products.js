import fs from 'fs';
import csv from 'csv-parser';
import slugify from 'slugify';

// Konfigurasi
const CSV_FILE = 'data_produk.csv'; 
const OUTPUT_DIR = 'src/content/products'; 

const results = [];

// Baca File CSV
fs.createReadStream(CSV_FILE)
  .pipe(csv())
  .on('data', (data) => results.push(data))
  .on('end', () => {
    console.log(`Membaca ${results.length} produk dari CSV...`);
    
    if (!fs.existsSync(OUTPUT_DIR)){
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    results.forEach((row) => {
      processProduct(row);
    });
    
    console.log('--- SELESAI! Produk berhasil dibuat (Draft Mode) ---');
  });

function processProduct(row) {
  // 1. Validasi Judul (Wajib ada)
  if (!row.Judul) return;

  // 2. Buat Slug
  const slug = slugify(row.Judul, { lower: true, strict: true });
  
  // 3. Olah Standar (jika ada)
  let standardsYaml = '';
  if (row.Standar) {
    const standardsArray = row.Standar.split('|').map(s => s.trim());
    standardsYaml = standardsArray.map(s => `  - ${s}`).join('\n');
  }

  // 4. Handle Gambar Kosong (Agar tidak error null)
  // Jika di CSV kosong, kita tulis string kosong ""
  const imagePath = row.Gambar ? row.Gambar.trim() : "";

  // 5. Tanggal
  const today = new Date().toISOString().split('T')[0];

  // 6. Susun File MDOC
  // Note: content di bawah '---' dibiarkan kosong jika row.Konten_Lengkap kosong
  const fileContent = `---
title: "${row.Judul.replace(/"/g, '\\"')}"
id: "${row.SKU || ''}"
seo:
  metaTitle: "${row.Meta_Title || ''}"
  metaDescription: "${row.Meta_Desc || ''}"
  customTitle: ""
  breadcrumbTitle: ""
  canonicalUrl: ""
  noIndex: false
category: ${row.Kategori || 'Umum'}
image: "${imagePath}"
standards:
${standardsYaml}
description: >
  ${row.Deskripsi_Singkat || ''}
featured: false
publishDate: ${today}
---
${row.Konten_Lengkap || ''}
`;

  // 7. Tulis File
  const filePath = `${OUTPUT_DIR}/${slug}.mdoc`;
  try {
    fs.writeFileSync(filePath, fileContent);
    console.log(`✅ Draft: ${slug}`);
  } catch (err) {
    console.error(`❌ Gagal: ${slug}`, err);
  }
}