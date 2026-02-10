import { defineCollection, reference, z } from 'astro:content';

// REUSABLE SEO ZOD SCHEMA
const seoZodSchema = z.object({
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  customTitle: z.string().optional(),
  breadcrumbTitle: z.string().optional(),
  canonicalUrl: z.string().optional(),
  noIndex: z.boolean().default(false),
}).optional(); 

// 1. AUTHORS
const authorsCollection = defineCollection({
  type: 'content',
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

// 2. BLOG
const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    
    // Tambahkan field SEO
    seo: seoZodSchema,

    description: z.string().optional(),
    pubDate: z.date(),
    author: reference('authors'), 
    image: z.string().optional(),
    tags: z.array(z.string()).default(['Teknik Sipil']),
    featured: z.boolean().default(false),
  }),
});

// 3. PRODUK
const productsCollection = defineCollection({
  type: 'content', 
  schema: z.object({
    title: z.string(),
    id: z.string().optional(),
    
    seo: seoZodSchema,

    category: z.enum(['Aspal', 'Beton', 'Tanah', 'Batuan', 'Semen', 'Pertambangan', 'Umum']),
    image: z.string().optional(),
    standards: z.array(z.string()).optional(), 
    
    // --- BAGIAN INI YANG DIUBAH ---
    specifications: z.array(
      z.object({
        key: z.string(),
        value: z.string(),
      })
    ).optional(),
    // ------------------------------

    brochureLink: z.string().optional(), // Pastikan ini juga sudah ada jika di Keystatic ada
    description: z.string().optional(), 
    featured: z.boolean().default(false), 
    publishDate: z.date().default(() => new Date()),
  }),
});

// 4. PAGES
const pagesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    
    // Tambahkan field SEO
    seo: seoZodSchema,

    description: z.string().optional(),
    coverImage: z.string().optional(),
  }),
});

export const collections = {
  'products': productsCollection,
  'blog': blogCollection,
  'pages': pagesCollection,
  'authors': authorsCollection,
};