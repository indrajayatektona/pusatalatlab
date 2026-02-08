import { config, fields, collection } from '@keystatic/core';

export default config({
  storage: {
    kind: 'local', // Ubah ke 'github' nanti saat deploy
  },
  collections: {

    // --- 1. KOLEKSI AUTHORS (Penulis) ---
    authors: collection({
      label: 'Penulis (Authors)',
      slugField: 'name',
      path: 'src/content/authors/*',
      format: { contentField: 'bio' }, // Bio pakai MDOC
      schema: {
        name: fields.slug({ name: { label: 'Nama Lengkap' } }),
        role: fields.text({ label: 'Posisi / Jabatan' }),
        avatar: fields.image({
          label: 'Foto Profil',
          directory: 'public/images/authors',
          publicPath: '/images/authors/',
        }),
        socials: fields.object({
           facebook: fields.url({ label: 'Facebook URL' }),
           linkedin: fields.url({ label: 'LinkedIn URL' }),
           instagram: fields.url({ label: 'Instagram URL' }),
        }),
        bio: fields.document({
          label: 'Bio Singkat',
          formatting: true,
          links: true,
        }),
      },
    }),
    
    // --- 2. KOLEKSI PRODUK ---
    products: collection({
      label: 'Produk Katalog',
      slugField: 'title',
      path: 'src/content/products/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Nama Produk' } }),
        id: fields.text({ label: 'SKU / Kode Barang' }),
        category: fields.select({
          label: 'Kategori',
          options: [
            { label: 'Aspal', value: 'Aspal' },
            { label: 'Beton', value: 'Beton' },
            { label: 'Tanah', value: 'Tanah' },
            { label: 'Batuan', value: 'Batuan' },
            { label: 'Semen', value: 'Semen' },
            { label: 'Pertambangan', value: 'Pertambangan' },
            { label: 'Umum', value: 'Umum' },
          ],
          defaultValue: 'Umum',
        }),
        image: fields.image({
            label: 'Foto Produk',
            directory: 'public/images/products',
            publicPath: '/images/products/',
        }),
        standards: fields.array(
            fields.text({ label: 'Standar (Contoh: ASTM C-39)' }),
            { label: 'Standar SNI/ASTM' }
        ),
        description: fields.text({ label: 'Deskripsi Singkat (SEO)', multiline: true }),
        featured: fields.checkbox({ label: 'Tampilkan di Homepage (Featured)?' }),
        publishDate: fields.date({ label: 'Tanggal Publish', defaultValue: { kind: 'today' } }),
        
        content: fields.document({
          label: 'Deskripsi Lengkap (Artikel)',
          formatting: true,
          dividers: true,
          links: true,
          images: {
             directory: 'public/images/products/content',
             publicPath: '/images/products/content/',
          },
        }),
      },
    }),

    // --- 3. KOLEKSI BLOG ---
    blog: collection({
      label: 'Artikel Blog',
      slugField: 'title',
      path: 'src/content/blog/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Judul Artikel' } }),
        description: fields.text({ label: 'Ringkasan', multiline: true }),
        pubDate: fields.date({ label: 'Tanggal', defaultValue: { kind: 'today' } }),
        
        // --- PERBAIKAN DISINI: Author pakai Relationship ---
        author: fields.relationship({
            label: 'Penulis',
            collection: 'authors', // Mengambil data dari koleksi 'authors'
            validation: { isRequired: true }
        }),

        image: fields.image({
            label: 'Cover Image',
            directory: 'public/images/blog',
            publicPath: '/images/blog/',
        }),
        tags: fields.array(
            fields.text({ label: 'Tag' }),
            { label: 'Tags' }
        ),
        content: fields.document({
          label: 'Isi Artikel',
          formatting: true,
          dividers: true,
          links: true,
          images: {
             directory: 'public/images/blog/content',
             publicPath: '/images/blog/content/',
          },
        }),
      },
    }),

    // --- 4. KOLEKSI HALAMAN (PAGES) ---
    pages: collection({
      label: 'Halaman Statis',
      slugField: 'title',
      path: 'src/content/pages/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Judul Halaman' } }),
        description: fields.text({ label: 'Deskripsi SEO', multiline: true }),
        coverImage: fields.image({
            label: 'Cover Image (Opsional)',
            directory: 'public/images/pages',
            publicPath: '/images/pages/',
        }),
        content: fields.document({
          label: 'Isi Halaman',
          formatting: true,
          dividers: true,
          links: true,
          images: {
             directory: 'public/images/pages/content',
             publicPath: '/images/pages/content/',
          },
          tables: true,
        }),
      },
    }),
  },
});