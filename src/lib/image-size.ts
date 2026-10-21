/**
 * Membaca dimensi intrinsik gambar lokal di `public/` saat build.
 *
 * Dipakai untuk mengisi atribut `width`/`height` pada <img> agar browser
 * bisa memesan ruang sebelum gambar selesai dimuat (mencegah layout shift).
 *
 * Parser ditulis manual (PNG/JPEG/WebP) supaya tidak menambah dependensi
 * baru hanya untuk membaca 8 byte header. Hasil di-cache per path karena
 * fungsi ini dipanggil berkali-kali untuk gambar yang sama.
 */
import fs from 'node:fs';
import path from 'node:path';

export interface ImageSize {
  width: number;
  height: number;
}

const cache = new Map<string, ImageSize | null>();

function readPng(buf: Buffer): ImageSize | null {
  const isPng =
    buf.length > 24 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47;

  if (!isPng) return null;

  // IHDR selalu chunk pertama: 8 byte signature + 4 length + 4 type + data
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function readJpeg(buf: Buffer): ImageSize | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;

  let offset = 2;

  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buf[offset + 1];

    // Marker tanpa payload panjang
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01) {
      offset += 2;
      continue;
    }

    const segmentLength = buf.readUInt16BE(offset + 2);
    if (segmentLength < 2) return null;

    const isStartOfFrame =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 && // DHT
      marker !== 0xc8 && // JPG
      marker !== 0xcc; // DAC

    if (isStartOfFrame) {
      return {
        height: buf.readUInt16BE(offset + 5),
        width: buf.readUInt16BE(offset + 7),
      };
    }

    offset += 2 + segmentLength;
  }

  return null;
}

function readWebp(buf: Buffer): ImageSize | null {
  const isWebp =
    buf.length > 30 &&
    buf.toString('latin1', 0, 4) === 'RIFF' &&
    buf.toString('latin1', 8, 12) === 'WEBP';

  if (!isWebp) return null;

  const chunk = buf.toString('latin1', 12, 16);

  if (chunk === 'VP8X') {
    return {
      width: buf.readUIntLE(24, 3) + 1,
      height: buf.readUIntLE(27, 3) + 1,
    };
  }

  if (chunk === 'VP8L') {
    const bits = buf.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }

  if (chunk === 'VP8 ') {
    return {
      width: buf.readUInt16LE(26) & 0x3fff,
      height: buf.readUInt16LE(28) & 0x3fff,
    };
  }

  return null;
}

export function getImageSize(src?: string): ImageSize | null {
  if (!src) return null;

  // Hanya file lokal di /public yang bisa dibaca saat build.
  if (!src.startsWith('/')) return null;

  const cached = cache.get(src);
  if (cached !== undefined) return cached;

  const filePath = path.join(process.cwd(), 'public', src);

  if (!fs.existsSync(filePath)) {
    cache.set(src, null);
    return null;
  }

  let size: ImageSize | null = null;

  try {
    const buf = fs.readFileSync(filePath);
    size = readPng(buf) ?? readJpeg(buf) ?? readWebp(buf);
  } catch {
    size = null;
  }

  if (size && (size.width <= 0 || size.height <= 0)) {
    size = null;
  }

  cache.set(src, size);
  return size;
}
