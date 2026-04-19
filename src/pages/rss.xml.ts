import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context: any) {
  // 1. Ambil semua data Blog dan Produk secara otomatis (hanya yang published)
  const blogs = await getCollection('blog', ({ data }) => data.status === 'published');
  const products = await getCollection('products', ({ data }) => data.status === 'published');

  // 2. Format Blog agar sesuai dengan standar RSS
  const blogItems = blogs.map((post) => ({
    title: post.data.title,
    pubDate: post.data.pubDate,
    description: post.data.description || '',
    link: `/blog/${post.slug}/`,
  }));

  // 3. Format Produk agar sesuai dengan standar RSS
  const productItems = products.map((prod) => ({
    title: `Produk Baru: ${prod.data.title}`,
    pubDate: prod.data.publishDate, // Di schema Anda, produk menggunakan 'publishDate'
    description: prod.data.description || `Lihat detail spesifikasi untuk ${prod.data.title}`,
    link: `/products/${prod.slug}/`, // Sesuaikan dengan struktur URL produk Anda
  }));

  // 4. Gabungkan keduanya dan urutkan dari yang paling baru
  const allItems = [...blogItems, ...productItems].sort(
    (a, b) => new Date(b.pubDate).valueOf() - new Date(a.pubDate).valueOf()
  );

  // 5. Astro akan otomatis men-generate XML-nya
  return rss({
    title: 'Pusat Alat Lab Sipil',
    description: 'Update artikel blog dan rilis produk terbaru dari Pusat Alat Lab Sipil.',
    site: context.site,
    items: allItems,
  });
}