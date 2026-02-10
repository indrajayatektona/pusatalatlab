import fs from 'fs';
import csv from 'csv-parser';
import slugify from 'slugify';

// Konfigurasi
const CSV_FILE = 'data_produk.csv';
const OUTPUT_DIR = 'src/content/products';

const results = [];

// Helper: Ubah string "Key:Val | Key2:Val2" jadi Object
function parseSpecs(rawString) {
  if (!rawString) return {};
  const specs = {};
  rawString.split('|').forEach(item => {
    const [key, val] = item.split(':');
    if (key && val) {
      specs[key.trim()] = val.trim();
    }
  });
  return specs;
}

// Helper: Auto-Generate Konten SEO (Anti Thin Content)
function generateSEOContent(row, specsObj) {
  // Jika sudah ada konten manual di CSV, pakai itu
  if (row.Konten_Manual && row.Konten_Manual.length > 50) {
    return row.Konten_Manual;
  }

  // Jika kosong, generate template
  const specList = Object.entries(specsObj)
    .map(([k, v]) => `- **${k}**: ${v}`)
    .join('\n');
  
  const standarText = row.Standar ? `sesuai standar ${row.Standar.replace(/\|/g, ', ')}` : 'berstandar industri';

  return `
## Deskripsi Produk ${row.Judul}

**${row.Judul}** adalah solusi instrumen pengujian kualitas tinggi untuk kebutuhan kategori **${row.Kategori}**. Alat ini dirancang khusus untuk memenuhi standar pengujian laboratorium teknik sipil dan konstruksi, ${standarText}.

Produk ini menjadi pilihan utama kontraktor dan konsultan karena durabilitas tinggi dan akurasi pengukuran yang presisi. Sangat cocok digunakan untuk pengujian lapangan maupun laboratorium permanen.

### Fitur dan Spesifikasi Unggulan

Untuk memastikan keandalan data pengujian Anda, ${row.Judul} dilengkapi dengan spesifikasi teknis sebagai berikut:

${specList}

### Mengapa Memilih Alat Ini?

1. **Akurasi Terjamin**: Dikalibrasi untuk meminimalkan margin error.
2. **Material Kokoh**: Tahan terhadap kondisi lingkungan proyek yang keras.
3. **Kemudahan Operasional**: Desain ergonomis yang memudahkan teknisi lab.

---
*Butuh penawaran harga atau konsultasi teknis terkait ${row.Judul}? Hubungi tim Indra Jaya Tektona melalui WhatsApp di pojok kanan bawah.*
`;
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
  if (!row.Judul) return;

  const slug = slugify(row.Judul, { lower: true, strict: true });
  const today = new Date().toISOString().split('T')[0];
  
  // 1. Parsing Array Standar
  let standardsYaml = '';
  if (row.Standar) {
    const standardsArray = row.Standar.split(/[|,]/).map(s => s.trim());
    standardsYaml = standardsArray.map(s => `  - "${s}"`).join('\n');
  }

  // 2. Parsing Object Spesifikasi (Penting untuk Schema)
 const specsObj = parseSpecs(row.Spesifikasi_Raw);
  let specsYaml = '';
  if (Object.keys(specsObj).length > 0) {
    // Format baru: List of Objects
    specsYaml = Object.entries(specsObj)
      .map(([k, v]) => `  - key: "${k}"\n    value: "${v}"`) 
      .join('\n');
  }

  // 3. Generate Body Content
  const bodyContent = generateSEOContent(row, specsObj);

  // 4. Susun Frontmatter (YAML)
  // Perhatikan: Kita escape double quotes di Judul untuk menghindari YAML error
  const fileContent = `---
title: "${row.Judul.replace(/"/g, '\\"')}"
id: "${row.SKU || ''}"
seo:
  metaTitle: "${row.Meta_Title || row.Judul}"
  metaDescription: "${row.Meta_Desc || row.Deskripsi_Singkat || ''}"
  customTitle: "${row.SEO_Custom_Title || ''}"
  breadcrumbTitle: ""
  canonicalUrl: ""
  noIndex: ${row.SEO_NoIndex === 'true' ? true : false}
category: ${row.Kategori || 'Umum'}
image: "${row.Gambar || ''}"
standards:
${standardsYaml}
specifications:
${specsYaml}
brochureLink: "${row.Brochure_Link || ''}"
description: >
  ${row.Deskripsi_Singkat || `Jual ${row.Judul} spesifikasi terbaik untuk kebutuhan ${row.Kategori}.`}
featured: false
publishDate: ${today}
---
${bodyContent}
`;

  const filePath = `${OUTPUT_DIR}/${slug}.mdoc`;
  try {
    fs.writeFileSync(filePath, fileContent);
    // console.log(`Drafted: ${slug}`); // Optional log
  } catch (err) {
    console.error(`❌ Gagal: ${slug}`, err);
  }
}