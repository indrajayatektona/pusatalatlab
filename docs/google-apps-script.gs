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
 * - Timestamp memakai zona waktu WIB (Asia/Jakarta).
 */

// ==== KONFIGURASI ====
var SECRET = 'GANTI_DENGAN_KATA_SANDI_ACAK';
var SHEET_NAME = 'wa_clicks';
var TIMEZONE = 'Asia/Jakarta';

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
