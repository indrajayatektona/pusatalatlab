// src/lib/tracking.ts
// Helper pelacakan klik WhatsApp. Event dikirim ke Google Apps Script Web App
// yang menambahkan baris ke Google Sheet.
//
// Nonaktif otomatis bila `SITE_CONFIG.tracking.endpoint` kosong.

import { SITE_CONFIG } from '../config';

export type WAClickType = 'direct' | 'modal';
export type WAEvent = 'wa_click' | 'rfq_submit';

export interface WATrackPayload {
  event?: WAEvent;
  /** Asal tombol, mis. "floating_wa", "header", "product_detail_wa". */
  source: string;
  clickType: WAClickType;
  /** Nama produk / topik yang dibawa tombol. */
  product?: string;
  /** Data form RFQ (khusus event rfq_submit). */
  form?: {
    name?: string;
    city?: string;
    status?: string;
    message?: string;
  };
}

const SESSION_KEY = 'wa_sid';

/** ID sesi per tab browser, dipakai untuk menggabungkan beberapa klik. */
function getSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return 'unknown';
  }
}

function getDevice(): string {
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua)) return 'tablet';
  if (/Mobi|Android|iPhone/i.test(ua)) return 'mobile';
  return 'desktop';
}

function getBrowser(): string {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\/|Opera/.test(ua)) return 'Opera';
  if (/SamsungBrowser/.test(ua)) return 'Samsung Internet';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Lainnya';
}

/** Kirim event klik WhatsApp. Tidak memblokir navigasi. */
export function trackWAClick(payload: WATrackPayload): void {
  const endpoint = SITE_CONFIG.tracking?.endpoint;
  if (!endpoint) return; // tracking belum dikonfigurasi

  const body = JSON.stringify({
    event: payload.event ?? 'wa_click',
    source: payload.source,
    clickType: payload.clickType,
    product: payload.product ?? '',
    form: payload.form ?? null,
    pageUrl: location.href,
    pagePath: location.pathname,
    referrer: document.referrer || '(direct)',
    device: getDevice(),
    browser: getBrowser(),
    sessionId: getSessionId(),
    screen: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    clientTime: new Date().toISOString(),
  });

  try {
    // Content-Type text/plain menghindari preflight CORS. Apps Script tetap
    // membaca isi lewat e.postData.contents.
    const blob = new Blob([body], { type: 'text/plain;charset=UTF-8' });
    if (navigator.sendBeacon?.(endpoint, blob)) return;
  } catch {
    /* jatuh ke fetch di bawah */
  }

  try {
    fetch(endpoint, {
      method: 'POST',
      mode: 'no-cors',
      keepalive: true,
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body,
    }).catch(() => {});
  } catch {
    /* abaikan: tracking tidak boleh mengganggu UX */
  }
}
