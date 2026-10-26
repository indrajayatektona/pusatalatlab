# Tracking Klik WhatsApp ke Google Sheet

Mencatat setiap klik tombol WhatsApp di website ke Google Sheet: asal halaman,
jenis tombol (direct / modal RFQ), produk, jam, device, browser, dan referrer.

## Arsitektur

```
Browser (website)
   └─ POST text/plain (no-cors / sendBeacon)
        └─ Google Apps Script Web App  (/exec?key=...)
             └─ appendRow → Google Sheet
```

Tidak butuh server sendiri. Google Sheet tidak bisa menerima HTTP request
langsung, jadi Apps Script berperan sebagai jembatan.

## Bagian 1 — Siapkan Google Sheet (sekali saja)

1. Buka <https://sheets.new>, beri nama mis. `WA Tracking Pusat Alat Lab Sipil`.
2. Menu **Extensions → Apps Script**.
3. Hapus isi `Code.gs`, tempel seluruh isi `docs/google-apps-script.gs`.
4. Ubah baris berikut:
   ```js
   var SECRET = 'GANTI_DENGAN_KATA_SANDI_ACAK';
   ```
   Isi kata sandi acak milik Anda, mis. `wa-lab-9f3k2m`.
5. Simpan (Ctrl+S).
6. Jalankan fungsi `testAppend` sekali. Google akan minta izin — setujui.
   Sheet `wa_clicks` dibuat otomatis lengkap dengan header, dan satu baris uji masuk.
7. **Deploy → New deployment → pilih tipe "Web app"**:
   - Description: `WA tracking`
   - Execute as: **Me**
   - Who has access: **Anyone**
8. Salin URL yang berakhiran `/exec`.

## Bagian 2 — Hubungkan ke website

Tambahkan baris berikut ke file `.env`:

```
PUBLIC_WA_TRACK_ENDPOINT="https://script.google.com/macros/s/XXXXX/exec?key=wa-lab-9f3k2m"
```

Ganti `XXXXX` dengan ID dari URL hasil deploy, dan `wa-lab-9f3k2m` dengan SECRET Anda.

Lalu build & deploy ulang situs:

```
npm run build
```

Tracking aktif otomatis. Kosongkan `PUBLIC_WA_TRACK_ENDPOINT` untuk mematikan.

> `.env` sudah masuk `.gitignore`, jadi endpoint + key tidak ikut ke GitHub.
> Untuk hosting, tambahkan variabel `PUBLIC_WA_TRACK_ENDPOINT` di dashboard
> Cloudflare Pages / Workers.

## Bagian 3 — Verifikasi

1. Buka website hasil deploy.
2. Klik tombol WhatsApp (floating button, header, atau tombol di detail produk).
3. Buka Google Sheet, sheet `wa_clicks`. Baris baru harus muncul dalam ±2 detik.
4. Jika tidak muncul:
   - Cek Console browser (F12) — apakah ada error jaringan ke `script.google.com`.
   - Pastikan deployment Web app benar-benar **Anyone**, bukan "Anyone with Google account".
   - Setelah mengubah kode Apps Script, buat **New deployment** (atau edit deployment
     → Version: New version). Deployment lama tidak ikut ter-update.

## Kolom Sheet

| Kolom | Isi |
|---|---|
| Timestamp | `2026-10-27 14:05:33` (WIB) |
| Tanggal | `2026-10-27` |
| Jam | `14:05:33` |
| Event | `wa_click` (klik tombol) atau `rfq_submit` (kirim form RFQ) |
| Source | asal tombol, lihat tabel di bawah |
| Click Type | `direct` (langsung ke WA) atau `modal` (lewat form RFQ) |
| Product | nama produk / topik yang dibawa tombol |
| Nama, Kota, Status, Pesan | terisi hanya untuk `rfq_submit` |
| Page Path | contoh `/products/alat-uji-beton/` |
| Page URL | URL lengkap halaman asal klik |
| Referrer | halaman pengunjung sebelumnya, `(direct)` bila langsung |
| Device | `mobile` / `desktop` / `tablet` |
| Browser | Chrome / Safari / Firefox / Edge / dll |
| Screen | resolusi layar, mis. `390x844` |
| Session ID | UUID per tab; beberapa klik dari orang sama punya ID sama |
| Clock Client | waktu perangkat pengunjung (ISO, UTC) — pembanding bila zona waktu aneh |

## Daftar `source`

| Source | Lokasi tombol |
|---|---|
| `floating_wa` | Tombol WhatsApp mengambang kanan bawah |
| `header_desktop` | Tombol "Minta Penawaran" di header desktop (buka modal) |
| `header_mobile` | Tombol "KONTAK" di header mobile (buka modal) |
| `hero_cta` | Tombol "Konsultasi Gratis (WA)" di hero halaman depan |
| `featured_card_rfq` | Tombol "Minta Penawaran Resmi" di kartu produk unggulan |
| `shipping_card` | Kartu "Kota Anda Tidak Tercantum?" (buka modal) |
| `catalog_pdf` | Tombol "Download PDF" katalog |
| `footer_link` | Nomor WA di kolom kontak footer |
| `footer_chat_sales` | Tombol "Chat Sales Sekarang" di footer |
| `footer_rfq` | Tombol "Formulir RFQ" di footer |
| `product_detail_wa` | Tombol WhatsApp di halaman detail produk |
| `product_detail_rfq` | Tombol "Penawaran Harga" di bawah detail produk (buka modal) |
| `category_sidebar_wa` | Tombol "Chat Sales" di sidebar halaman kategori |
| `blog_share` | Tombol bagikan artikel blog ke WhatsApp |
| `cta_button` | Tombol `CTAButton` lain tanpa `waSource` eksplisit |
| `inline_link` | Link WA di dalam konten (Markdown/CMS) tanpa atribusi |
| `blog_inline` | Link WA di dalam artikel blog tanpa atribusi |
| `modal_unknown` | Form RFQ terkirim tapi asal pembuka modal tidak terekam |

Menambah tombol baru? Beri atribut:

```html
<a href="https://wa.me/..." data-wa-source="nama_sumber" data-wa-type="direct" data-wa-product="Nama Produk">
```

Tombol yang membuka modal:

```html
<button onclick="window.dispatchEvent(new CustomEvent('open-quote'))"
        data-wa-source="nama_sumber" data-wa-type="modal" data-wa-product="Nama Produk">
```

Atau lewat komponen:

```astro
<CTAButton mode="wa" productName={title} waSource="product_detail_wa" />
```

## Catatan

- **Cakupan tidak 100%.** Adblocker / mode privasi ketat bisa memblokir request
  tracking. Realistis 85–95% klik terekam. Angka Sheet = minat, bukan kebenaran absolut.
- **Batas Apps Script**: ±20.000 request/hari untuk akun gratis, jauh di atas
  kebutuhan situs ini.
- **Latensi**: baris muncul 1–3 detik setelah klik.
- **Privasi**: form RFQ mengirim nama, kota, status, dan pesan ke Sheet. Pastikan
  ada keterangan privasi di form bila data ini disimpan.
- **Key di URL**: `?key=` melindungi dari isian spam asal-asalan, tapi bukan
  autentikasi kuat — URL bisa dilihat siapa pun yang membuka View Source.
