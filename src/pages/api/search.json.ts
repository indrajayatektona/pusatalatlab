import { getCollection } from 'astro:content';

export async function GET({}) {
  // 1. Ambil semua produk dan FILTER yang BUKAN draft
  const allProducts = await getCollection('products', ({ data }) => {
    return data.status !== 'draft';
  });

  // 2. Format data agar ringan (hanya ambil field penting)
  const searchIndex = allProducts.map((product) => ({
    title: product.data.title,
    category: product.data.category,
    slug: product.slug,
    id: product.data.id, // SKU
    // Kita buat field 'searchable' gabungan biar gampang dicari
    searchable: `${product.data.title} ${product.data.category} ${product.data.id} ${product.data.standards?.join(" ")}`.toLowerCase()
  }));

  return new Response(JSON.stringify(searchIndex), {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    }
  });
}