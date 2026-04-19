// src/config.ts
export const SITE_CONFIG = {
  brandName: "CV. Sawarga Teknik",
  // Format nomor WA: Gunakan kode negara tanpa +, contoh: 62812xxx
  whatsapp: "6287893030300", 
  email: "sales@pusatalatlabsipil.com",
  address: "Jl.Jend Amir Machmud No 111/115 , Cibeureum , Cimahi Selatan Jawa Barat.",
  
  // Pesan default untuk Direct WA
  defaultWAMessage: "Halo, Sawarga Teknik saya tertarik dengan produk alat lab sipil Anda.",
};

// Helper function untuk generate Link WA
export function getWALink(message: string = "") {
  const text = encodeURIComponent(message || SITE_CONFIG.defaultWAMessage);
  return `https://wa.me/${SITE_CONFIG.whatsapp}?text=${text}`;
}