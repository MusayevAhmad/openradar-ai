import { NextResponse } from 'next/server';
import { getStoredPapers, saveStoredPapers, getStoredSettings } from '@/lib/storage';
import { fetchArxivPapers, fetchHuggingFacePapers, evaluateAndSynthesizePaper } from '@/lib/agent-engine';

export async function GET() {
  const papers = getStoredPapers();
  const settings = getStoredSettings();
  return NextResponse.json({ papers, settings });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body.action;

    if (action === 'toggle_bookmark') {
      const papers = getStoredPapers();
      const updated = papers.map(p => p.id === body.id ? { ...p, isBookmarked: !p.isBookmarked } : p);
      saveStoredPapers(updated);
      return NextResponse.json({ success: true, papers: updated });
    }

    if (action === 'toggle_read') {
      const papers = getStoredPapers();
      const updated = papers.map(p => p.id === body.id ? { ...p, isRead: !p.isRead } : p);
      saveStoredPapers(updated);
      return NextResponse.json({ success: true, papers: updated });
    }

    if (action === 'run_agent') {
      const settings = getStoredSettings();
      const existingPapers = getStoredPapers();
      const existingIds = new Set(existingPapers.map(p => p.id));

      // Fetch from arXiv and Hugging Face in parallel
      const [arxivResults, hfResults] = await Promise.all([
        fetchArxivPapers(['cs.AI', 'cs.LG', 'cs.CR']),
        fetchHuggingFacePapers()
      ]);

      const rawCandidates = [...arxivResults, ...hfResults];
      const newlyDiscovered = [];

      for (const raw of rawCandidates) {
        if (existingIds.has(raw.id)) continue;

        const evaluated = evaluateAndSynthesizePaper(raw, settings);
        if (evaluated) {
          newlyDiscovered.push(evaluated);
          existingIds.add(evaluated.id);
        }
      }

      // Sort by relevance score descending
      const combined = [...newlyDiscovered, ...existingPapers].sort((a, b) => b.relevanceScore - a.relevanceScore);
      saveStoredPapers(combined);

      return NextResponse.json({
        success: true,
        scannedCount: rawCandidates.length,
        addedCount: newlyDiscovered.length,
        papers: combined
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
