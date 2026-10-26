/**
 * Google Apps Script — penerima tracking klik WhatsApp.
 * Menambahkan satu baris ke Google Sheet setiap kali ada event dari website.
 *
 * CARA PASANG
 * 1. Buat Google Sheet baru.
 * 2. Menu: Extensions > Apps Script. Hapus isi default, tempel seluruh file ini.
 * 3. Ganti SECRET dengan kata sandi acak milik Anda sendiri.
 * 4. Deploy > New deployment > pilih "Web app".
 *      - Description : WA tracking
 *      - Execute as  : Me
 *      - Who has access : Anyone
 * 5. Salin URL yang berakhiran /exec.
 * 6. Isi di file .env proyek:
 *      PUBLIC_WA_TRACK_ENDPOINT="https://script.google.com/macros/s/XXXX/exec?key=SANDBI"
 *    lalu build/deploy ulang website.
 *
 * CATATAN
 * - Jika SECRET tidak diisi (""), pengecekan kunci dilewati. Tidak disarankan
 *   untuk situs publik karena URL bisa disalahgunakan mengisi Sheet.
 * - Baris header dibuat otomatis pada sheet bernama SHEET_NAME.
 * - Sheet "Rekap" dibuat otomatis, berisi ringkasan per tanggal.
 * - Timestamp memakai zona waktu WIB (Asia/Jakarta).
 *
 * SETELAH MENGUBAH KODE INI WAJIB BUAT DEPLOYMENT BARU:
 *   Deploy > Manage deployments > ikon pensil > Version: New version > Deploy
 *   Tanpa langkah ini, URL /exec masih menjalankan kode lama.
 */

// ==== KONFIGURASI ====
var SECRET = 'GANTI_DENGAN_KATA_SANDI_ACAK';
var SHEET_NAME = 'wa_clicks';
var RECAP_SHEET = 'Rekap';
var TIMEZONE = 'Asia/Jakarta';

// true  = Rekap dihitung ulang setiap ada klik baru (paling praktis)
// false = Rekap hanya diperbarui saat menu "WA Tracking > Perbarui Rekap" diklik
var AUTO_RECAP = true;

var HEADERS = [
  'Timestamp',
  'Tanggal',
  'Jam',
  'Event',
  'Source',
  'Click Type',
  'Product',
  'Nama',
  'Kota',
  'Status',
  'Pesan',
  'Page Path',
  'Page URL',
  'Referrer',
  'Device',
  'Browser',
  'Screen',
  'Session ID',
  'Clock Client',
];

function doPost(e) {
  try {
    if (SECRET) {
      var key = (e && e.parameter && e.parameter.key) || '';
      if (key !== SECRET) {
        return jsonOutput_({ ok: false, error: 'unauthorized' });
      }
    }

    var raw = e && e.postData && e.postData.contents ? e.postData.contents : '';
    var data = raw ? JSON.parse(raw) : {};
    var form = data.form || {};

    var now = new Date();
    var sheet = getSheet_();

    sheet.appendRow([
      Utilities.formatDate(now, TIMEZONE, 'yyyy-MM-dd HH:mm:ss'),
      Utilities.formatDate(now, TIMEZONE, 'yyyy-MM-dd'),
      Utilities.formatDate(now, TIMEZONE, 'HH:mm:ss'),
      String(data.event || 'wa_click'),
      String(data.source || ''),
      String(data.clickType || ''),
      String(data.product || ''),
      String(form.name || ''),
      String(form.city || ''),
      String(form.status || ''),
      String(form.message || ''),
      String(data.pagePath || ''),
      String(data.pageUrl || ''),
      String(data.referrer || ''),
      String(data.device || ''),
      String(data.browser || ''),
      String(data.screen || ''),
      String(data.sessionId || ''),
      String(data.clientTime || ''),
    ]);

    if (AUTO_RECAP) {
      try {
        buildRecap();
      } catch (recapErr) {
        // Kegagalan rekap tidak boleh menggagalkan pencatatan klik.
        Logger.log('buildRecap gagal: ' + recapErr);
      }
    }

    return jsonOutput_({ ok: true });
  } catch (err) {
    return jsonOutput_({ ok: false, error: String(err) });
  }
}

/** Uji manual dari editor Apps Script. */
function testAppend() {
  var fake = {
    parameter: { key: SECRET },
    postData: {
      contents: JSON.stringify({
        event: 'wa_click',
        source: 'manual_test',
        clickType: 'direct',
        product: 'Uji coba',
        pagePath: '/',
        pageUrl: 'https://pusatalatlabsipil.com/',
        referrer: '(direct)',
        device: 'desktop',
        browser: 'Chrome',
        screen: '1920x1080',
        sessionId: 'test-session',
        clientTime: new Date().toISOString(),
      }),
    },
  };
  Logger.log(doPost(fake).getContent());
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#0F253E')
      .setFontColor('#FFFFFF');
    sheet.setColumnWidth(1, 160);
  }

  return sheet;
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Bangun ulang sheet "Rekap": satu baris per tanggal, diurutkan terbaru di atas.
 * Dihitung penuh dari sheet wa_clicks sehingga tidak pernah ada data dobel.
 */
function buildRecap() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dataSheet = ss.getSheetByName(SHEET_NAME);
  if (!dataSheet) return;

  var recap = ss.getSheetByName(RECAP_SHEET) || ss.insertSheet(RECAP_SHEET);
  recap.clear();

  var headers = [
    'Tanggal', 'Total Klik', 'RFQ', 'Klik Biasa',
    'Modal', 'Direct', 'Mobile', 'Desktop', 'Tablet',
    'Halaman Teratas',
  ];
  recap.getRange(1, 1, 1, headers.length).setValues([headers]);

  var lastRow = dataSheet.getLastRow();
  var out = [];

  if (lastRow >= 2) {
    // Kolom A..P = 16 kolom. Indeks array dimulai 0.
    var rows = dataSheet.getRange(2, 1, lastRow - 1, 16).getValues();
    var byDate = {};

    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];

      // Kolom B (Tanggal) sudah berupa teks yyyy-MM-dd dari doPost.
      var tanggal = r[1];
      if (tanggal instanceof Date) {
        tanggal = Utilities.formatDate(tanggal, TIMEZONE, 'yyyy-MM-dd');
      }
      tanggal = String(tanggal || '').trim();
      if (!tanggal) continue;

      if (!byDate[tanggal]) {
        byDate[tanggal] = {
          total: 0, rfq: 0, modal: 0, direct: 0,
          mobile: 0, desktop: 0, tablet: 0,
          pages: {},
        };
      }

      var d = byDate[tanggal];
      var event = String(r[3] || '');
      var clickType = String(r[4] || '');
      var device = String(r[14] || '');
      var pagePath = String(r[11] || '');

      d.total++;
      if (event === 'rfq_submit') d.rfq++;
      if (clickType === 'modal') d.modal++;
      if (clickType === 'direct') d.direct++;
      if (device === 'mobile') d.mobile++;
      if (device === 'desktop') d.desktop++;
      if (device === 'tablet') d.tablet++;

      if (pagePath) {
        d.pages[pagePath] = (d.pages[pagePath] || 0) + 1;
      }
    }

    var tanggalList = Object.keys(byDate).sort().reverse();

    for (var j = 0; j < tanggalList.length; j++) {
      var tgl = tanggalList[j];
      var dd = byDate[tgl];

      var topPage = '';
      var topCount = 0;
      for (var p in dd.pages) {
        if (dd.pages[p] > topCount) {
          topCount = dd.pages[p];
          topPage = p;
        }
      }

      out.push([
        tgl,
        dd.total,
        dd.rfq,
        dd.total - dd.modal, // klik biasa = semua event non-modal
        dd.modal,
        dd.direct,
        dd.mobile,
        dd.desktop,
        dd.tablet,
        topPage ? topPage + ' (' + topCount + ')' : '',
      ]);
    }
  }

  if (out.length) {
    recap.getRange(2, 1, out.length, headers.length).setValues(out);
  }

  recap.setFrozenRows(1);
  recap.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#0F253E')
    .setFontColor('#FFFFFF');
  recap.autoResizeColumns(1, headers.length);
}

/** Menu di Google Sheet supaya perintah bisa dijalankan tanpa buka editor. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('WA Tracking')
    .addItem('Perbarui Rekap', 'buildRecap')
    .addItem('Uji Kirim Baris', 'testAppend')
    .addToUi();
}

/** Uji cepat: isi beberapa baris contoh lalu bangun rekap. */
function testRecap() {
  testAppend();
  buildRecap();
  Logger.log('Rekap diperbarui. Buka sheet "' + RECAP_SHEET + '".');
}
