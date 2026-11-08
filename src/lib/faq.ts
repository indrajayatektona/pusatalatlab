/**
 * Ekstraksi blok FAQ dari body Markdoc/Markdown untuk dijadikan schema FAQPage.
 *
 * Tiga bentuk penulisan yang dipakai di konten situs ini:
 *   1. Pertanyaan tebal bernomor : `**1. Apa itu X?**` lalu jawaban di bawahnya
 *   2. Pertanyaan tebal         : `**Apa itu X?**` lalu jawaban di bawahnya
 *   3. Pertanyaan berupa heading: `## Apa itu X?` atau `### Apa itu X?`
 *
 * Jawaban dianggap selesai saat menemukan pertanyaan berikutnya atau heading
 * apa pun. Ini yang menghentikan pengambilan tepat di akhir bagian FAQ.
 */

export interface FaqItem {
  question: string;
  answer: string;
}

const HEADING = /^(#{1,6})\s+(.*)$/;
// Pertanyaan tebal, dengan nomor opsional di luar ATAU di dalam penanda tebal.
const BOLD_QUESTION = /^(?:\d+[.)]\s+)?\*\*(.+?)\*\*\s*$/;
const FAQ_HEADING = /faq|pertanyaan yang sering diajukan/i;

function stripInline(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/^\d+[.)]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param body            Body mentah entri konten.
 * @param requireHeading  Kalau true (default), blok FAQ hanya diproses saat
 *                        ada heading yang memuat kata "FAQ". Halaman khusus
 *                        FAQ memakai false karena section-nya bertema
 *                        ("Pertanyaan Umum", "Pengujian Beton", dst.).
 */
export function extractFaq(
  body: string | undefined,
  { requireHeading = true }: { requireHeading?: boolean } = {},
): FaqItem[] {
  if (!body) return [];

  const lines = body.split(/\r?\n/);

  if (requireHeading) {
    const hasFaqHeading = lines.some((line) => {
      const heading = line.trim().match(HEADING);
      return heading ? FAQ_HEADING.test(heading[2]) : false;
    });
    if (!hasFaqHeading) return [];
  }

  const items: FaqItem[] = [];
  let question: string | null = null;
  let answerLines: string[] = [];

  const flush = () => {
    if (question === null) return;
    const answer = stripInline(answerLines.join(' '));
    if (question && answer) items.push({ question, answer });
    question = null;
    answerLines = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Tag Markdoc (mis. {% relatedProducts ... /%}) bukan bagian jawaban.
    if (line.startsWith('{%')) continue;

    const heading = line.match(HEADING);
    let found: string | null = null;

    if (heading) {
      const text = heading[2].trim();
      if (text.endsWith('?')) found = text;
    } else {
      const bold = line.match(BOLD_QUESTION);
      if (bold && bold[1].trim().endsWith('?')) found = bold[1].trim();
    }

    if (found) {
      flush();
      question = stripInline(found);
      continue;
    }

    if (question !== null) {
      // Heading yang bukan pertanyaan menandakan akhir bagian FAQ.
      if (heading) {
        flush();
        continue;
      }
      if (line) answerLines.push(line);
    }
  }

  flush();
  return items;
}
