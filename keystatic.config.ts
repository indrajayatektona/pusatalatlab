import { config, fields, collection } from '@keystatic/core';

// --- 0. DEFINISI SEO SCHEMA (Reusable) ---
const seoSchema = fields.object({
  metaTitle: fields.text({
    label: 'Meta Title (SERP)',
    description: 'Judul biru yang muncul di Google. Jika kosong, akan menggunakan Judul Halaman.',
    validation: { length: { max: 60 } }
  }),
  metaDescription: fields.text({
    label: 'Meta Description (SERP)',
    description: 'Deskripsi pendek di hasil pencarian Google. Max 160 karakter.',
    multiline: true,
    validation: { length: { max: 160 } }
  }),
  customTitle: fields.text({
    label: 'Custom H1 Title',
    description: 'Judul besar di halaman (Override). Isi jika ingin H1 beda dengan Judul Dokumen.',
  }),
  breadcrumbTitle: fields.text({
    label: 'Breadcrumb Label',
    description: 'Nama pendek untuk navigasi breadcrumb (Misal: "Tutorial" alih-alih judul panjang).',
  }),
  canonicalUrl: fields.url({
    label: 'Canonical URL',
    description: 'Isi jika konten ini adalah duplikat/pindahan dari URL lain.',
  }),
  noIndex: fields.checkbox({
    label: 'No Index',
    description: 'Centang jika halaman ini TIDAK BOLEH muncul di Google.',
    defaultValue: false,
  }),
}, { label: 'Pengaturan SEO & Metadata' });


export default config({
  // --- BAGIAN INI YANG DIUPDATE OTOMATIS ---
  // Jika sedang di Production (Cloudflare), pakai GitHub mode.
  // Jika di Local (Komputer sendiri), pakai Local mode.
  storage: import.meta.env.PROD
    ? {
        kind: 'github',
        // GANTI INI DENGAN USERNAME & REPO GITHUB ANDA YANG ASLI
        // Format: 'username/nama-repo'
        // Contoh: 'indrajayatektona/pusatalatlab'
        repo: 'indrajayatektona/pusatalatlab', 
      }
    : {
        kind: 'local',
      },
  // -----------------------------------------

  collections: {

    // --- 1. KOLEKSI AUTHORS (Penulis) ---
    authors: collection({
      label: 'Penulis (Authors)',
      slugField: 'name',
      path: 'src/content/authors/*',
      format: { contentField: 'bio' },
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
 columns: ['title', 'status', 'category', 'publishDate'],
      
      schema: {
        title: fields.slug({ name: { label: 'Nama Produk' } }),
        
        // TAMBAHKAN FIELD STATUS PUBLIKASI
        status: fields.select({
          label: 'Status',
          options: [
            { label: 'Draft', value: 'draft' },
            { label: 'Published', value: 'published' }
          ],
          defaultValue: 'published',
        }),

        id: fields.text({ label: 'SKU / Kode Barang' }),
        seo: seoSchema, 
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
            fields.text({ label: 'Standar' }),
            { label: 'Standar SNI/ASTM' }
        ),

        brochureLink: fields.text({
            label: 'Link Brosur / PDF',
            description: 'Contoh: /brosur/produk-a.pdf atau https://drive.google.com/...' 
        }),

        specifications: fields.text({
    label: 'Spesifikasi Teknis (Mode Cepat)',
    description: 'Format: "Nama Spesifikasi : Nilai". Satu per baris. Contoh:\nDimensi : 10 x 20 cm\nBerat : 5 kg',
    multiline: true,
}),

        description: fields.text({ label: 'Ringkasan Produk (Untuk Card/List)', multiline: true }),
        featured: fields.checkbox({ label: 'Tampilkan di Homepage (Featured)?' }),
        publishDate: fields.date({ label: 'Tanggal Publish', defaultValue: { kind: 'today' } }),

        updatedDate: fields.date({ 
          label: 'Tanggal Update Terakhir',
          description: 'Pilih manual saat melakukan update konten'
        }),
        
        content: fields.document({
          label: 'Deskripsi Lengkap',
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
      columns: ['title', 'status', 'author', 'pubDate', 'updatedDate'],
      schema: {
        title: fields.slug({ name: { label: 'Judul Artikel' } }),

        status: fields.select({
          label: 'Status Artikel',
          options: [
            { label: 'Draft', value: 'draft' },
            { label: 'Published', value: 'published' }
          ],
          defaultValue: 'draft', // Set default ke draft untuk artikel baru
        }),
        
        seo: seoSchema,

        description: fields.text({ label: 'Ringkasan (Excerpt)', multiline: true }),
        pubDate: fields.date({ label: 'Tanggal', defaultValue: { kind: 'today' } }),

        updatedDate: fields.date({ 
          label: 'Tanggal Update Terakhir',
          description: 'Ubah tanggal ini jika melakukan revisi artikel'
        }),
        
        author: fields.relationship({
            label: 'Penulis',
            collection: 'authors',
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
        title: fields.slug({ name: { label: 'Nama Halaman (Internal)' } }),

        status: fields.select({
  label: 'Status Halaman',
  options: [
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' }
  ],
  defaultValue: 'draft',
}),
        
        seo: seoSchema,

        description: fields.text({ label: 'Deskripsi Singkat', multiline: true }),
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