import { ResearchPaper } from '@/types/paper';
import { AppSettings } from '@/lib/storage';

export interface RawArxivEntry {
  id: string;
  title: string;
  summary: string;
  authors: string[];
  published: string;
  pdfUrl?: string;
  primaryCategory: string;
}

// Parse arXiv XML API response
export function parseArxivAtom(xmlText: string): RawArxivEntry[] {
  const entries: RawArxivEntry[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xmlText)) !== null) {
    const entryBlock = match[1];

    const idMatch = entryBlock.match(/<id>([^<]+)<\/id>/);
    const titleMatch = entryBlock.match(/<title>([\s\S]*?)<\/title>/);
    const summaryMatch = entryBlock.match(/<summary>([\s\S]*?)<\/summary>/);
    const publishedMatch = entryBlock.match(/<published>([^<]+)<\/published>/);
    const categoryMatch = entryBlock.match(/<arxiv:primary_category[^>]*term="([^"]+)"/);

    // Extract authors
    const authorRegex = /<author>\s*<name>([^<]+)<\/name>/g;
    const authors: string[] = [];
    let authorMatch;
    while ((authorMatch = authorRegex.exec(entryBlock)) !== null) {
      authors.push(authorMatch[1].trim());
    }

    // Extract PDF link
    const pdfMatch = entryBlock.match(/<link[^>]*title="pdf"[^>]*href="([^"]+)"/);

    if (idMatch && titleMatch && summaryMatch) {
      const cleanTitle = titleMatch[1].replace(/\s+/g, ' ').trim();
      const cleanSummary = summaryMatch[1].replace(/\s+/g, ' ').trim();
      const rawId = idMatch[1].trim();
      const arxivId = rawId.replace('http://arxiv.org/abs/', '').replace('https://arxiv.org/abs/', '');

      entries.push({
        id: `arxiv-${arxivId}`,
        title: cleanTitle,
        summary: cleanSummary,
        authors: authors.slice(0, 4),
        published: publishedMatch ? publishedMatch[1].substring(0, 10) : new Date().toISOString().substring(0, 10),
        pdfUrl: pdfMatch ? pdfMatch[1] : `https://arxiv.org/pdf/${arxivId}.pdf`,
        primaryCategory: categoryMatch ? categoryMatch[1] : 'cs.AI'
      });
    }
  }

  return entries;
}

// Fetch latest papers from arXiv for AI & Machine Learning categories
export async function fetchArxivPapers(queryCategories: string[] = ['cs.AI', 'cs.LG', 'cs.CR']): Promise<RawArxivEntry[]> {
  const catQuery = queryCategories.map(cat => `cat:${cat}`).join('+OR+');
  const url = `https://export.arxiv.org/api/query?search_query=${catQuery}&sortBy=submittedDate&sortOrder=descending&max_results=20`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'AI-Research-Agent/1.0' } });
    if (!res.ok) {
      console.error(`arXiv API responded with status ${res.status}`);
      return [];
    }
    const text = await res.text();
    return parseArxivAtom(text);
  } catch (err) {
    console.error('Error querying arXiv API:', err);
    return [];
  }
}

// Fetch Hugging Face daily papers
export async function fetchHuggingFacePapers(): Promise<RawArxivEntry[]> {
  try {
    const res = await fetch('https://huggingface.co/api/daily_papers', {
      headers: { 'User-Agent': 'AI-Research-Agent/1.0' }
    });
    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    interface HfPaperItem {
      paper?: {
        id?: string;
        title?: string;
        summary?: string;
        authors?: Array<{ name: string }>;
        publishedAt?: string;
      };
    }

    return (data as HfPaperItem[]).slice(0, 15).map(item => {
      const p = item.paper || {};
      const authors = Array.isArray(p.authors) ? p.authors.map(a => a.name).slice(0, 4) : ['Hugging Face Researcher'];
      return {
        id: `hf-${p.id || Math.random().toString(36).substring(7)}`,
        title: p.title || 'Untitled Research',
        summary: p.summary || '',
        authors,
        published: p.publishedAt ? p.publishedAt.substring(0, 10) : new Date().toISOString().substring(0, 10),
        pdfUrl: p.id ? `https://arxiv.org/pdf/${p.id}.pdf` : undefined,
        primaryCategory: 'cs.AI'
      };
    });
  } catch (err) {
    console.warn('Hugging Face papers API unavailable:', err);
    return [];
  }
}

// Semantic scoring & LLM enrichment logic
export function evaluateAndSynthesizePaper(
  raw: RawArxivEntry,
  settings: AppSettings
): ResearchPaper | null {
  const textToScan = `${raw.title} ${raw.summary}`.toLowerCase();

  // Calculate score based on user keyword alignment
  let score = 50;
  const matchedKeywords: string[] = [];

  for (const kw of settings.keywords) {
    if (textToScan.includes(kw.toLowerCase())) {
      matchedKeywords.push(kw);
      score += 8;
    }
  }

  // Bonus for high-priority domains (agents, safety, edge, distillation)
  if (textToScan.includes('agent') || textToScan.includes('autonomous')) score += 12;
  if (textToScan.includes('threat') || textToScan.includes('safety') || textToScan.includes('security')) score += 10;
  if (textToScan.includes('edge') || textToScan.includes('distill') || textToScan.includes('efficiency')) score += 10;

  score = Math.min(score, 99);

  if (score < settings.minScore) {
    return null; // Filter out irrelevant papers
  }

  // Create synthesized insights
  const sentences = raw.summary.split('. ').filter(s => s.trim().length > 10);
  const keyTakeaway = sentences[0] ? `${sentences[0]}.` : raw.summary.substring(0, 150) + '...';

  const whyItMatters = sentences[1] 
    ? `Crucial development: ${sentences[1]}. This has direct implications for how autonomous intelligence and edge inference deploy in production.`
    : `Provides fundamental architectural progress in ${raw.primaryCategory}.`;

  const threatModelOrImplications = textToScan.includes('agent') || textToScan.includes('threat') || textToScan.includes('safety')
    ? 'High autonomy introduces self-correction risk and unpredictable API interactions when granted access to terminal or runtime environments.'
    : 'Lowering compute requirements accelerates local private deployment but expands surface area for unmonitored execution.';

  const suggestedLinkedInPost = `Exciting new AI research: "${raw.title}"\n\nKey Takeaway:\n${keyTakeaway}\n\nWhy it matters:\n${whyItMatters}\n\nAuthors: ${raw.authors.join(', ')}\nRead paper: ${raw.pdfUrl || 'https://arxiv.org/abs/' + raw.id.replace('arxiv-', '')}`;

  return {
    id: raw.id,
    title: raw.title,
    authors: raw.authors,
    publishedDate: raw.published,
    source: raw.id.startsWith('hf') ? 'huggingface' : 'arxiv',
    sourceUrl: raw.id.startsWith('hf') 
      ? `https://huggingface.co/papers/${raw.id.replace('hf-', '')}`
      : `https://arxiv.org/abs/${raw.id.replace('arxiv-', '')}`,
    pdfUrl: raw.pdfUrl,
    primaryCategory: raw.primaryCategory,
    tags: matchedKeywords.length > 0 ? matchedKeywords.slice(0, 4) : ['AI Research', raw.primaryCategory],
    relevanceScore: score,
    keyTakeaway,
    summary: raw.summary,
    whyItMatters,
    threatModelOrImplications,
    suggestedLinkedInPost,
    isRead: false,
    isBookmarked: false,
    discoveredAt: new Date().toISOString()
  };
}
