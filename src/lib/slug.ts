/**
 * Slug untuk arsip tag blog.
 *
 * Dipakai bersama oleh halaman arsip tag dan tautan tag di artikel,
 * supaya URL yang dihasilkan selalu identik. Karakter selain huruf
 * dan angka dibuang sehingga tag seperti "Beton, Mutu Beton" tidak
 * menghasilkan URL dengan koma.
 */
export function tagToSlug(tag: string): string {
  return tag
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
