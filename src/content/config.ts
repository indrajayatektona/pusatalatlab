import { defineCollection, reference, z } from 'astro:content';

// 1. Schema untuk AUTHORS (Penulis) - BARU
const authorsCollection = defineCollection({
  type: 'content', // Kita pakai 'content' karena ada Bio (MDOC)
  schema: z.object({
    name: z.string(),
    role: z.string().optional(),
    avatar: z.string().optional(),
    socials: z.object({
        facebook: z.string().url().optional(),
        linkedin: z.string().url().optional(),
        instagram: z.string().url().optional(),
    }).optional(),
  }),
});

// 2. Schema untuk BLOG (Artikel) - UPDATE AUTHOR
const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.date(),
    
    // PERUBAHAN PENTING:
    // Menghubungkan field ini ke koleksi 'authors'
    // Nilai di file markdown harus sesuai dengan nama file author (misal: 'budi-santoso')
    author: reference('authors'), 

    image: z.string().optional(),
    tags: z.array(z.string()).default(['Teknik Sipil']),
    featured: z.boolean().default(false),
  }),
});

// 3. Schema untuk PRODUK
const productsCollection = defineCollection({
  type: 'content', 
  schema: z.object({
    title: z.string(),
    id: z.string(), 
    category: z.enum(['Aspal', 'Beton', 'Tanah', 'Batuan', 'Semen', 'Pertambangan', 'Umum']),
    image: z.string(),
    standards: z.array(z.string()).optional(), 
    description: z.string(), 
    featured: z.boolean().default(false), 
    specifications: z.record(z.string()).optional(), 
    brochureLink: z.string().optional(),
    publishDate: z.date().default(() => new Date()),
  }),
});

// 4. Schema untuk PAGES
const pagesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    coverImage: z.string().optional(),
  }),
});

// Export agar bisa dibaca Astro
export const collections = {
  'products': productsCollection,
  'blog': blogCollection,
  'pages': pagesCollection,
  'authors': authorsCollection, // <--- Jangan lupa didaftarkan disini
};