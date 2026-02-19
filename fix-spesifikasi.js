import fs from 'fs';
import path from 'path';

const dir = 'src/content/products';

console.log('⏳ Memulai perbaikan data spesifikasi produk lama...');

// Pastikan folder ada
if (!fs.existsSync(dir)) {
  console.error('❌ Folder src/content/products tidak ditemukan!');
  process.exit(1);
}

// Ambil semua file .mdoc
const files = fs.readdirSync(dir).filter(f => f.endsWith('.mdoc'));
let fixedCount = 0;

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;

  // KASUS 1: Jika array kosong (dulu belum sempat diisi)
  if (content.includes('specifications: []')) {
    content = content.replace('specifications: []', 'specifications: ""');
    changed = true;
  } 
  // KASUS 2: Jika array berisi data spesifikasi lama
  else if (content.match(/specifications:\s*\n\s+-\s+key:/)) {
    const lines = content.split('\n');
    let newLines = [];
    let inSpecs = false;
    let specsData = [];
    let currentKey = "";

    for (let line of lines) {
      if (line.startsWith('specifications:')) {
        inSpecs = true;
        continue; // Lewati baris judul ini
      }

      if (inSpecs) {
        // Jika ketemu key baru yg rata kiri (contoh: 'description:') atau batas bawah frontmatter '---'
        if (line.match(/^[a-zA-Z0-9_-]+:/) || line.startsWith('---')) {
          inSpecs = false;
          
          // Susun data lama jadi format Teks Multiline baru
          if (specsData.length > 0) {
            newLines.push('specifications: |'); // Tanda | berarti multiline di YAML
            specsData.forEach(s => newLines.push(`  ${s.key} : ${s.value}`));
          } else {
            newLines.push('specifications: ""');
          }
          newLines.push(line);
        } else {
          // Tangkap Key dan Value dari format lama
          const keyMatch = line.match(/-\s+key:\s*(.*)/) || line.match(/key:\s*(.*)/);
          const valMatch = line.match(/value:\s*(.*)/);

          if (keyMatch) {
            currentKey = keyMatch[1].replace(/^["']|["']$/g, '').trim();
          }
          if (valMatch) {
            let currentVal = valMatch[1].replace(/^["']|["']$/g, '').trim();
            specsData.push({ key: currentKey, value: currentVal });
          }
        }
      } else {
        newLines.push(line);
      }
    }
    content = newLines.join('\n');
    changed = true;
  }

  // Jika file diubah, simpan ulang
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Diperbaiki: ${file}`);
    fixedCount++;
  }
});

console.log(`\n🎉 Selesai! ${fixedCount} produk lama berhasil diubah ke format teks multiline.`);