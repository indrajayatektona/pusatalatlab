/**
 * Parser spesifikasi produk.
 *
 * Dipakai bersama oleh halaman detail produk (src/pages/products/[slug].astro)
 * dan generator brosur PDF (src/lib/brochure.ts) supaya format tampilan
 * selalu konsisten dan tidak ada duplikasi logic.
 *
 * Mendukung 2 format data:
 * 1. BARU (Mode Cepat Keystatic) -> string multiline: "Nama : Nilai"
 * 2. LAMA (Keystatic array)     -> array of string atau array of { key, value }
 */

export interface ProductSpec {
  key: string;
  value: string;
}

/** Pecah satu baris "Nama : Nilai" menjadi object. Null jika baris tidak valid. */
function parseSpecLine(line: string): ProductSpec | null {
  const raw = line.trim();
  if (!raw) return null;

  // Pisah berdasarkan titik dua (:) PERTAMA saja.
  // Sisa titik dua ikut masuk ke value (misal: "Dimensi : 10 : 20").
  const separatorIndex = raw.indexOf(':');
  if (separatorIndex === -1) return null;

  const key = raw.slice(0, separatorIndex).trim();
  const value = raw.slice(separatorIndex + 1).trim();

  if (!key) return null;

  return { key, value };
}

export function parseSpecifications(specifications: unknown): ProductSpec[] {
  if (!specifications) return [];

  // --- FORMAT BARU: String multiline ---
  if (typeof specifications === 'string') {
    return specifications
      .split(/\r?\n/)
      .map(parseSpecLine)
      .filter((item): item is ProductSpec => item !== null);
  }

  // --- FORMAT LAMA: Array ---
  if (Array.isArray(specifications)) {
    return specifications
      .map((item): ProductSpec | null => {
        if (!item) return null;

        // Array of string ("Nama : Nilai")
        if (typeof item === 'string') return parseSpecLine(item);

        // Array of object ({ key, value } / { label, value })
        if (typeof item === 'object') {
          const obj = item as Record<string, unknown>;
          const key = String(obj.key ?? obj.label ?? obj.name ?? '').trim();
          const value = String(obj.value ?? obj.val ?? '').trim();
          if (!key) return null;
          return { key, value };
        }

        return null;
      })
      .filter((item): item is ProductSpec => item !== null);
  }

  return [];
}
