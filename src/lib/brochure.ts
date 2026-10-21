import { SITE_CONFIG } from '../config';
import { parseSpecifications } from './specs';

/**
 * Generator brosur PDF per produk (on-demand, jalan di browser).
 *
 * Tidak ada file PDF statis: brosur dibuat saat user klik tombol download,
 * jadi selalu sinkron dengan data produk di CMS.
 *
 * Library (jsPDF + jspdf-autotable) di-lazy-load oleh pemanggil
 * supaya bundle halaman produk tidak bertambah.
 */

export interface BrochureProduct {
  title: string;
  slug: string;
  id?: string;
  category?: string;
  image?: string;
  standards?: string[];
  description?: string;
  specifications?: string;
}

type RGB = [number, number, number];

// --- UKURAN HALAMAN (mm) ---
const PAGE_W = 210;
const PAGE_H = 297;
const M = 14; // margin kiri/kanan
const CONTENT_W = PAGE_W - M * 2;
const FOOTER_TOP = 271;

// --- PALET (sama dengan tailwind.config.mjs) ---
const NAVY: RGB = [15, 37, 62];
const GOLD: RGB = [230, 197, 92];
const DARK: RGB = [30, 41, 59];
const SLATE: RGB = [100, 116, 139];
const MUTED: RGB = [148, 163, 184];
const LINE: RGB = [226, 232, 240];
const SOFT: RGB = [248, 250, 252];
const WHITE: RGB = [255, 255, 255];
const INK_SOFT: RGB = [203, 213, 225];

// Nama family font aktif (di-set oleh registerFonts)
let family = 'helvetica';

/* ------------------------------------------------------------------ */
/* ASSET HELPERS                                                       */
/* ------------------------------------------------------------------ */

interface LoadedImage {
  dataUrl: string;
  format: 'PNG' | 'JPEG' | 'WEBP';
  w: number;
  h: number;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsDataURL(blob);
  });
}

function imageSize(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || img.width, h: img.naturalHeight || img.height });
    img.onerror = () => reject(new Error('Gagal decode gambar'));
    img.src = dataUrl;
  });
}

async function fetchAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) return null;

    const buffer = new Uint8Array(await res.arrayBuffer());
    let binary = '';
    const chunkSize = 0x8000;

    for (let i = 0; i < buffer.length; i += chunkSize) {
      binary += String.fromCharCode(...buffer.subarray(i, i + chunkSize));
    }

    return btoa(binary);
  } catch {
    return null;
  }
}

async function loadImage(src?: string): Promise<LoadedImage | null> {
  if (!src || !src.trim()) return null;

  try {
    const res = await fetch(src, { cache: 'force-cache' });
    if (!res.ok) return null;

    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) return null;

    const dataUrl = await blobToDataUrl(blob);
    const size = await imageSize(dataUrl);

    const format: LoadedImage['format'] = blob.type.includes('png')
      ? 'PNG'
      : blob.type.includes('webp')
        ? 'WEBP'
        : 'JPEG';

    return { dataUrl, format, w: size.w, h: size.h };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* FONT                                                                */
/* ------------------------------------------------------------------ */

/**
 * Embed Inter TTF. Font bawaan jsPDF (Helvetica/WinAnsi) tidak punya
 * glyph seperti ≤ dan φ, jadi font ini bikin tabel spesifikasi tampil utuh.
 * Kalau gagal diambil, otomatis fallback ke Helvetica + normalisasi teks.
 */
async function registerFonts(doc: any): Promise<void> {
  const [regular, bold] = await Promise.all([
    fetchAsBase64('/fonts/Inter-Regular.ttf'),
    fetchAsBase64('/fonts/Inter-Bold.ttf'),
  ]);

  if (!regular || !bold) {
    family = 'helvetica';
    doc.setFont(family, 'normal');
    return;
  }

  doc.addFileToVFS('Inter-Regular.ttf', regular);
  doc.addFont('Inter-Regular.ttf', 'Inter', 'normal');
  doc.addFileToVFS('Inter-Bold.ttf', bold);
  doc.addFont('Inter-Bold.ttf', 'Inter', 'bold');

  family = 'Inter';
  doc.setFont(family, 'normal');
}

/* ------------------------------------------------------------------ */
/* TEKS                                                                */
/* ------------------------------------------------------------------ */

/**
 * Bersihkan teks: rapikan spasi baris baru.
 *
 * Penggantian simbol hanya dilakukan saat memakai font bawaan PDF
 * (Helvetica/WinAnsi) yang tidak punya glyph ≤, ≥, dan φ. Kalau Inter
 * berhasil di-embed, simbol aslinya dipertahankan supaya lebih rapi.
 */
function clean(input?: string): string {
  if (!input) return '';

  const text = input
    .replace(/\u00a0/g, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (family === 'Inter') return text;

  return text
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/[φΦ]/g, 'Ø');
}

function drawChip(
  doc: any,
  text: string,
  x: number,
  y: number,
  style: { bg: RGB; color: RGB; border?: RGB },
): number {
  const padX = 2.2;
  const height = 5.2;

  doc.setFont(family, 'bold');
  doc.setFontSize(6.6);
  const width = doc.getTextWidth(text) + padX * 2;

  doc.setFillColor(...style.bg);
  doc.setDrawColor(...(style.border ?? style.bg));
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, width, height, 0.8, 0.8, 'FD');

  doc.setTextColor(...style.color);
  doc.text(text, x + padX, y + height / 2 + 0.95);

  return width;
}

/* ------------------------------------------------------------------ */
/* BAGIAN-BAGIAN HALAMAN                                               */
/* ------------------------------------------------------------------ */

function drawHeader(doc: any, logo: LoadedImage | null): void {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, 5, 'F');

  if (logo) {
    const h = 13;
    const w = (logo.w / logo.h) * h;
    doc.addImage(logo.dataUrl, logo.format, M, 10, w, h);
  } else {
    doc.setFont(family, 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...NAVY);
    doc.text('SAWARGA TEKNIK', M, 19);
  }

  doc.setFont(family, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...SLATE);

  // Letter-spacing dihitung manual: align 'right' bawaan jsPDF tidak
  // memperhitungkan charSpace, sehingga teks bisa melewati margin.
  const tracking = 0.7;
  const label = 'PRODUCT DATASHEET';
  const labelWidth = doc.getTextWidth(label) + tracking * (label.length - 1);
  doc.setCharSpace(tracking);
  doc.text(label, PAGE_W - M - labelWidth, 16.5);
  doc.setCharSpace(0);

  doc.setFont(family, 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text('ALAT LABORATORIUM TEKNIK SIPIL', PAGE_W - M, 21, { align: 'right' });

  doc.setFillColor(...GOLD);
  doc.rect(M, 29, CONTENT_W, 1.4, 'F');
}

function drawHero(doc: any, product: BrochureProduct, image: LoadedImage | null): number {
  const top = 38;
  const boxW = 64;
  const boxH = 64;

  // --- Frame foto produk ---
  doc.setFillColor(...WHITE);
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.rect(M, top, boxW, boxH, 'FD');

  if (image) {
    const ratio = Math.min((boxW - 4) / image.w, (boxH - 4) / image.h);
    const w = image.w * ratio;
    const h = image.h * ratio;

    doc.addImage(
      image.dataUrl,
      image.format,
      M + (boxW - w) / 2,
      top + (boxH - h) / 2,
      w,
      h,
    );
  } else {
    doc.setFillColor(...SOFT);
    doc.rect(M + 1, top + 1, boxW - 2, boxH - 2, 'F');
    doc.setFont(family, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text('Foto belum tersedia', M + boxW / 2, top + boxH / 2, { align: 'center' });
  }

  // --- Kolom kanan ---
  const x = M + boxW + 8;
  const colW = PAGE_W - M - x;

  let chipX = x;
  const chipY = top + 1;

  chipX += drawChip(doc, clean(product.category || 'UMUM').toUpperCase(), chipX, chipY, {
    bg: GOLD,
    color: NAVY,
  }) + 2.5;

  const sku = clean(product.id);
  if (sku) {
    drawChip(doc, `SKU ${sku}`, chipX, chipY, { bg: SOFT, color: SLATE, border: LINE });
  }

  // --- Judul ---
  doc.setFont(family, 'bold');
  doc.setFontSize(17);
  doc.setTextColor(...NAVY);

  const titleLines = doc.splitTextToSize(clean(product.title), colW).slice(0, 3);
  let cursor = top + 14;

  titleLines.forEach((line: string) => {
    doc.text(line, x, cursor);
    cursor += 7;
  });

  cursor += 0.5;

  // --- Badge standar ---
  if (product.standards && product.standards.length > 0) {
    let sx = x;
    const chipH = 5.2;

    for (const standard of product.standards.slice(0, 4)) {
      const label = clean(standard);
      if (!label) continue;

      doc.setFont(family, 'bold');
      doc.setFontSize(6.6);
      const width = doc.getTextWidth(label) + 4.4;

      if (sx + width > x + colW) {
        sx = x;
        cursor += chipH + 1.4;
      }

      drawChip(doc, label, sx, cursor, { bg: SOFT, color: NAVY, border: GOLD });
      sx += width + 2;
    }

    cursor += chipH + 4.4;
  }

  // --- Ringkasan ---
  if (product.description) {
    doc.setFont(family, 'normal');
    doc.setFontSize(8.4);
    doc.setTextColor(...SLATE);

    const maxLines = 4;
    const lines: string[] = doc.splitTextToSize(clean(product.description), colW);

    if (lines.length > maxLines) {
      const shown = lines.slice(0, maxLines);
      shown[maxLines - 1] = `${shown[maxLines - 1].replace(/[\s.,;:-]+\S*$/, '')}...`;
      lines.length = 0;
      lines.push(...shown);
    }

    lines.forEach((line, index) => doc.text(line, x, cursor + index * 4.1));
    cursor += lines.length * 4.1;
  }

  return Math.max(top + boxH, cursor) + 10;
}

function drawSectionTitle(doc: any, text: string, y: number): void {
  doc.setFillColor(...GOLD);
  doc.rect(M, y - 3.1, 3, 3, 'F');

  doc.setFont(family, 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...NAVY);
  doc.setCharSpace(0.3);
  doc.text(text.toUpperCase(), M + 5, y);
  doc.setCharSpace(0);
}

function drawContinuationHeader(doc: any, title: string): void {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, 3, 'F');

  doc.setFont(family, 'bold');
  doc.setFontSize(7.6);
  doc.setTextColor(...SLATE);
  doc.text('PRODUCT DATASHEET', M, 10);

  doc.setFont(family, 'normal');
  doc.setTextColor(...MUTED);
  doc.text(clean(title).toUpperCase(), PAGE_W - M, 10, { align: 'right' });

  doc.setFillColor(...GOLD);
  doc.rect(M, 13, CONTENT_W, 0.8, 'F');
}

/**
 * Blok penutup: 4 keunggulan layanan.
 * Ditempel di atas CTA supaya halaman tetap seimbang walau spesifikasi sedikit.
 */
const FEATURES = [
  { title: 'Garansi Resmi', desc: 'Setiap unit melewati quality control sebelum dikirim.' },
  { title: 'Standar Internasional', desc: 'Mengacu standar ASTM, AASHTO, dan SNI.' },
  { title: 'Pengiriman Cepat', desc: 'Dikirim ke seluruh Indonesia dengan packing aman.' },
  { title: 'Harga Terjangkau', desc: 'Kompetitif untuk institusi, kampus, dan proyek.' },
];

const FEATURES_H = 21;

function drawFeatures(doc: any, top: number): void {
  doc.setFillColor(...SOFT);
  doc.rect(M, top, CONTENT_W, FEATURES_H, 'F');

  doc.setFillColor(...GOLD);
  doc.rect(M, top, CONTENT_W, 0.8, 'F');

  const inner = 5;
  const gap = 4;
  const colW = (CONTENT_W - inner * 2 - gap * (FEATURES.length - 1)) / FEATURES.length;

  FEATURES.forEach((feature, index) => {
    const x = M + inner + index * (colW + gap);

    if (index > 0) {
      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.2);
      doc.line(x - gap / 2, top + 4, x - gap / 2, top + FEATURES_H - 4);
    }

    doc.setFont(family, 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(...NAVY);
    doc.text(feature.title, x, top + 7);

    doc.setFont(family, 'normal');
    doc.setFontSize(6.7);
    doc.setTextColor(...SLATE);

    const lines: string[] = doc.splitTextToSize(feature.desc, colW);
    lines.slice(0, 2).forEach((line, lineIndex) => {
      doc.text(line, x, top + 11.2 + lineIndex * 3.2);
    });
  });
}

/** Kotak ajakan kontak (penawaran / surat dukungan tender). */
const CTA_H = 15;

function drawCta(doc: any, top: number): void {
  doc.setFillColor(...SOFT);
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.rect(M, top, CONTENT_W, CTA_H, 'FD');

  doc.setFillColor(...GOLD);
  doc.rect(M, top, 1.6, CTA_H, 'F');

  doc.setFont(family, 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text('Butuh penawaran harga atau surat dukungan tender?', M + 6, top + 6);

  doc.setFont(family, 'normal');
  doc.setFontSize(7.6);
  doc.setTextColor(...SLATE);
  doc.text(
    `WhatsApp ${SITE_CONFIG.phoneDisplay}   |   ${SITE_CONFIG.email}   |   ${SITE_CONFIG.website.replace(/^https?:\/\//, '')}`,
    M + 6,
    top + 11,
  );
}

function drawFooter(doc: any, page: number, total: number): void {
  doc.setFillColor(...NAVY);
  doc.rect(0, FOOTER_TOP, PAGE_W, PAGE_H - FOOTER_TOP, 'F');

  doc.setFillColor(...GOLD);
  doc.rect(0, FOOTER_TOP, PAGE_W, 1.2, 'F');

  // Kiri: identitas perusahaan
  doc.setFont(family, 'bold');
  doc.setFontSize(8.6);
  doc.setTextColor(...WHITE);
  doc.text(SITE_CONFIG.brandName.toUpperCase(), M, FOOTER_TOP + 8);

  doc.setFont(family, 'normal');
  doc.setFontSize(6.9);
  doc.setTextColor(...INK_SOFT);

  const addressLines: string[] = doc.splitTextToSize(clean(SITE_CONFIG.address), 104);
  addressLines.slice(0, 2).forEach((line, index) => {
    doc.text(line, M, FOOTER_TOP + 12.8 + index * 3.4);
  });

  // Kanan: kontak
  const rightX = PAGE_W - M;

  doc.setFontSize(7.2);
  doc.setTextColor(...WHITE);
  doc.text(`WhatsApp ${SITE_CONFIG.phoneDisplay}`, rightX, FOOTER_TOP + 8, { align: 'right' });

  doc.setTextColor(...INK_SOFT);
  doc.text(SITE_CONFIG.email, rightX, FOOTER_TOP + 12.4, { align: 'right' });
  doc.text(SITE_CONFIG.website.replace(/^https?:\/\//, ''), rightX, FOOTER_TOP + 16.4, {
    align: 'right',
  });

  doc.setFontSize(6.4);
  doc.setTextColor(...MUTED);
  doc.text(`Halaman ${page} / ${total}`, rightX, FOOTER_TOP + 22, { align: 'right' });
}

/* ------------------------------------------------------------------ */
/* MAIN                                                                */
/* ------------------------------------------------------------------ */

export async function generateProductBrochure(product: BrochureProduct): Promise<void> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });

  const [logo, image] = await Promise.all([
    loadImage('/images/logo-brochure.png'),
    loadImage(product.image),
  ]);

  await registerFonts(doc);

  drawHeader(doc, logo);

  let cursor = drawHero(doc, product, image);

  // --- Spesifikasi ---
  drawSectionTitle(doc, 'Spesifikasi Teknis', cursor);

  const specs = parseSpecifications(product.specifications);
  const tableTop = cursor + 5;

  if (specs.length > 0) {
    autoTable(doc, {
      startY: tableTop,
      head: [['SPESIFIKASI', 'NILAI']],
      body: specs.map((spec) => [clean(spec.key), clean(spec.value)]),
      theme: 'grid',
      // Jangan pernah memecah satu baris spesifikasi ke dua halaman
      rowPageBreak: 'avoid',
      margin: { left: M, right: M, top: 20, bottom: PAGE_H - FOOTER_TOP + 12 },
      styles: {
        font: family,
        fontSize: 8.4,
        textColor: DARK,
        lineColor: LINE,
        lineWidth: 0.1,
        cellPadding: { top: 2.1, bottom: 2.1, left: 3, right: 3 },
        overflow: 'linebreak',
        valign: 'top',
      },
      headStyles: {
        fillColor: NAVY,
        textColor: WHITE,
        fontStyle: 'bold',
        fontSize: 7.6,
        halign: 'left',
        cellPadding: { top: 2.4, bottom: 2.4, left: 3, right: 3 },
      },
      alternateRowStyles: { fillColor: SOFT },
      columnStyles: {
        0: { cellWidth: 52, fontStyle: 'bold', textColor: NAVY },
        1: { cellWidth: 'auto' },
      },
      didDrawPage: (data: any) => {
        if (data.pageNumber > 1) drawContinuationHeader(doc, product.title);
      },
    });
  } else {
    // Produk tanpa data spesifikasi: tetap tampilkan blok informasi
    doc.setFillColor(...SOFT);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.rect(M, tableTop, CONTENT_W, 16, 'FD');

    doc.setFont(family, 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(...SLATE);
    doc.text(
      'Detail spesifikasi teknis produk ini dapat dikonsultasikan langsung dengan tim teknis kami.',
      M + 4,
      tableTop + 9.5,
    );
  }

  const finalY: number = (doc as any).lastAutoTable?.finalY ?? tableTop + 16;

  // --- Ekor halaman: catatan, keunggulan, CTA ---
  // CTA & blok keunggulan ditempel ke bawah halaman supaya tata letak tetap
  // seimbang, baik untuk produk dengan 5 spesifikasi maupun 17 spesifikasi.
  const bottomLimit = FOOTER_TOP - 8;
  const ctaY = bottomLimit - CTA_H;
  const featuresY = ctaY - 7 - FEATURES_H;

  let y = finalY + 7;

  if (y < featuresY) {
    doc.setFont(family, 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...MUTED);
    doc.text(
      '* Spesifikasi dapat berubah sewaktu-waktu tanpa pemberitahuan sebelumnya.',
      M,
      y,
    );
    y += 8;
  }

  // Blok keunggulan hanya digambar kalau tidak menabrak isi di atasnya
  if (y <= featuresY) {
    drawFeatures(doc, featuresY);
  }

  // CTA tetap aman digambar selama tidak menimpa tabel
  if (y <= ctaY) {
    drawCta(doc, ctaY);
  }

  // --- Footer di semua halaman ---
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    drawFooter(doc, page, total);
  }

  doc.save(`Brosur-${product.slug}.pdf`);
}
