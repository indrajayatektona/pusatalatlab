import fs from 'fs';
import path from 'path';

const CONTENT_DIR = 'src/content';
const PUBLIC_DIR = 'public';
const OUTPUT_FILE = path.join(PUBLIC_DIR, 'llms.txt');

function extractFrontmatter(content) {
  const match = content.match(/^---([\s\S]*?)---/);
  if (!match) return {};
  
  const yaml = match[1];
  const metadata = {};
  
  const lines = yaml.split('\n');
  let currentKey = null;
  let inMultiline = false;
  let multilineValue = [];

  for (let line of lines) {
    if (!line.trim()) continue;

    // Check for new key
    const keyMatch = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)/);
    if (keyMatch && !inMultiline) {
      currentKey = keyMatch[1];
      let value = keyMatch[2].trim();

      if (value === '>-' || value === '|' || value === '|-') {
        inMultiline = true;
        multilineValue = [];
      } else {
        // Basic cleanup for quotes
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        }
        metadata[currentKey] = value;
        inMultiline = false;
      }
    } else if (inMultiline && line.startsWith('  ')) {
      multilineValue.push(line.trim());
    } else if (inMultiline && !line.startsWith('  ')) {
      metadata[currentKey] = multilineValue.join(' ');
      inMultiline = false;
      // Re-process this line as it might be a new key
      const retryMatch = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)/);
      if (retryMatch) {
        currentKey = retryMatch[1];
        let value = retryMatch[2].trim();
        if (value === '>-' || value === '|' || value === '|-') {
          inMultiline = true;
          multilineValue = [];
        } else {
          metadata[currentKey] = value;
        }
      }
    }
  }
  if (inMultiline) {
    metadata[currentKey] = multilineValue.join(' ');
  }
  return metadata;
}

async function generateLLMsText() {
  console.log('Generating llms.txt...');
  
  let output = `# Pusatalatlabsipil - Distributor Alat Laboratorium Teknik Sipil\n\n`;
  output += `Distributor resmi alat laboratorium teknik sipil dengan jaminan garansi dan kualitas standar SNI/ASTM. Melayani pengadaan peralatan untuk pengujian tanah, beton, aspal, batuan, dan semen.\n\n`;
  
  output += `## Koleksi Utama\n\n`;
  
  // 1. Pages
  output += `### Halaman Utama\n`;
  output += `- [Beranda](https://pusatalatlabsipil.com/)\n`;
  output += `- [Produk](https://pusatalatlabsipil.com/products)\n`;
  output += `- [Blog](https://pusatalatlabsipil.com/blog)\n\n`;

  // 2. Produk
  const productsDir = path.join(CONTENT_DIR, 'products');
  if (fs.existsSync(productsDir)) {
    output += `### Produk Unggulan\n`;
    const files = fs.readdirSync(productsDir).filter(f => f.endsWith('.mdoc'));
    
    for (const file of files) {
      const content = fs.readFileSync(path.join(productsDir, file), 'utf-8');
      const meta = extractFrontmatter(content);
      const slug = file.replace('.mdoc', '');
      if (meta.title) {
        output += `- [${meta.title}](https://pusatalatlabsipil.com/products/${slug}): ${meta.category || ''} - ${meta.description || ''}\n`;
      }
    }
    output += `\n`;
  }

  // 3. Blog
  const blogDir = path.join(CONTENT_DIR, 'blog');
  if (fs.existsSync(blogDir)) {
    output += `### Artikel Terbaru\n`;
    const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.mdoc'));
    
    for (const file of files) {
      const content = fs.readFileSync(path.join(blogDir, file), 'utf-8');
      const meta = extractFrontmatter(content);
      const slug = file.replace('.mdoc', '');
      if (meta.title) {
        output += `- [${meta.title}](https://pusatalatlabsipil.com/blog/${slug})\n`;
      }
    }
    output += `\n`;
  }

  fs.writeFileSync(OUTPUT_FILE, output);
  console.log(`Successfully generated ${OUTPUT_FILE}`);
}

generateLLMsText().catch(console.error);
