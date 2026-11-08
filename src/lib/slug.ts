/**
 * Slug untuk arsip tag blog.
 *
 * Dipakai bersama oleh halaman arsip tag dan tautan tag di artikel,
 * supaya URL yang dihasilkan selalu identik. Karakter selain huruf
 * dan angka dibuang sehingga tag seperti "Slump Test" menjadi
 * "slump-test" dan URL-nya bebas dari spasi maupun tanda baca.
 */
export function tagToSlug(tag: string): string {
  return tag
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
