#!/usr/bin/env python3
"""
Autonomous AI Research Paper Radar Agent
Fetches latest papers from arXiv & Hugging Face, evaluates relevance,
creates structured digests, and updates the dashboard storage.
"""

import urllib.request
import xml.etree.ElementTree as ET
import json
import os
import sys
from datetime import datetime

DASHBOARD_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(DASHBOARD_DIR, 'data')
PAPERS_FILE = os.path.join(DATA_DIR, 'papers.json')
SETTINGS_FILE = os.path.join(DATA_DIR, 'settings.json')

def load_settings():
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, 'r') as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "keywords": [
            "agent", "autonomous", "threat model", "self-replicating", "edge",
            "distillation", "reasoning", "alignment", "inference", "jailbreak",
            "mechanistic", "safety", "rlhf", "test-time compute"
        ],
        "minScore": 65
    }

def fetch_arxiv(query_cats=["cs.AI", "cs.LG", "cs.CR"], max_results=20):
    cat_query = "+OR+".join([f"cat:{c}" for c in query_cats])
    url = f"https://export.arxiv.org/api/query?search_query={cat_query}&sortBy=submittedDate&sortOrder=descending&max_results={max_results}"
    
    req = urllib.request.Request(url, headers={'User-Agent': 'AI-Research-Agent/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            xml_data = resp.read()
    except Exception as e:
        print(f"[!] Error fetching arXiv: {e}")
        return []

    root = ET.fromstring(xml_data)
    ns = {'atom': 'http://www.w3.org/2005/Atom', 'arxiv': 'http://arxiv.org/schemas/atom'}

    entries = []
    for entry in root.findall('atom:entry', ns):
        id_elem = entry.find('atom:id', ns)
        title_elem = entry.find('atom:title', ns)
        summary_elem = entry.find('atom:summary', ns)
        published_elem = entry.find('atom:published', ns)
        category_elem = entry.find('arxiv:primary_category', ns)

        if id_elem is None or title_elem is None or summary_elem is None:
            continue

        raw_id = id_elem.text.strip()
        arxiv_id = raw_id.replace('http://arxiv.org/abs/', '').replace('https://arxiv.org/abs/', '')
        
        authors = [a.find('atom:name', ns).text.strip() for a in entry.findall('atom:author', ns) if a.find('atom:name', ns) is not None][:4]
        category = category_elem.attrib.get('term', 'cs.AI') if category_elem is not None else 'cs.AI'
        
        pdf_url = f"https://arxiv.org/pdf/{arxiv_id}.pdf"

        entries.append({
            'id': f"arxiv-{arxiv_id}",
            'title': " ".join(title_elem.text.split()),
            'summary': " ".join(summary_elem.text.split()),
            'authors': authors,
            'published': published_elem.text[:10] if published_elem is not None else datetime.now().strftime('%Y-%m-%d'),
            'pdfUrl': pdf_url,
            'sourceUrl': f"https://arxiv.org/abs/{arxiv_id}",
            'primaryCategory': category,
            'source': 'arxiv'
        })
    return entries

def fetch_huggingface(max_results=15):
    url = "https://huggingface.co/api/daily_papers"
    req = urllib.request.Request(url, headers={'User-Agent': 'AI-Research-Agent/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"[!] Warning: HF daily papers unavailable: {e}")
        return []

    results = []
    for item in data[:max_results]:
        p = item.get('paper', {})
        if not p:
            continue
        authors = [a.get('name', '') for a in p.get('authors', [])][:4]
        paper_id = p.get('id', '')
        results.append({
            'id': f"hf-{paper_id}",
            'title': p.get('title', 'Untitled'),
            'summary': p.get('summary', ''),
            'authors': authors if authors else ['Hugging Face Open Research'],
            'published': p.get('publishedAt', datetime.now().strftime('%Y-%m-%d'))[:10],
            'pdfUrl': f"https://arxiv.org/pdf/{paper_id}.pdf" if paper_id else None,
            'sourceUrl': f"https://huggingface.co/papers/{paper_id}",
            'primaryCategory': 'cs.AI',
            'source': 'huggingface'
        })
    return results

def evaluate_paper(raw, settings):
    text = (raw['title'] + " " + raw['summary']).lower()
    score = 50
    matched_kws = []

    for kw in settings.get('keywords', []):
        if kw.lower() in text:
            matched_kws.append(kw)
            score += 8

    if 'agent' in text or 'autonomous' in text:
        score += 12
    if 'threat' in text or 'safety' in text or 'security' in text:
        score += 10
    if 'edge' in text or 'distill' in text or 'efficiency' in text:
        score += 10

    score = min(score, 99)
    if score < settings.get('minScore', 65):
        return None

    sentences = [s.strip() for s in raw['summary'].split('. ') if len(s.strip()) > 10]
    key_takeaway = f"{sentences[0]}." if sentences else raw['summary'][:150] + "..."
    why_it_matters = f"Crucial development: {sentences[1]}. This directly impacts autonomous agent systems and edge security." if len(sentences) > 1 else f"Breakthrough progress in {raw['primaryCategory']}."
    
    threat_model = (
        "High autonomy introduces self-correction risk and unpredictable API interactions when granted access to terminal or runtime environments."
        if any(w in text for w in ['agent', 'threat', 'safety'])
        else "Lowering compute requirements accelerates local private deployment but expands surface area for unmonitored execution."
    )

    linkedin_post = f"""Exciting new AI research: "{raw['title']}"

Key Takeaway:
{key_takeaway}

Why it matters:
{why_it_matters}

Authors: {', '.join(raw['authors'])}
Paper Link: {raw.get('pdfUrl') or raw['sourceUrl']}"""

    return {
        'id': raw['id'],
        'title': raw['title'],
        'authors': raw['authors'],
        'publishedDate': raw['published'],
        'source': raw['source'],
        'sourceUrl': raw['sourceUrl'],
        'pdfUrl': raw.get('pdfUrl'),
        'primaryCategory': raw['primaryCategory'],
        'tags': matched_kws[:4] if matched_kws else ['AI Research', raw['primaryCategory']],
        'relevanceScore': score,
        'keyTakeaway': key_takeaway,
        'summary': raw['summary'],
        'whyItMatters': why_it_matters,
        'threatModelOrImplications': threat_model,
        'suggestedLinkedInPost': linkedin_post,
        'isRead': False,
        'isBookmarked': False,
        'discoveredAt': datetime.now().isoformat()
    }

def main():
    print("🤖 [AI Research Radar Agent] Initiating discovery scan...")
    os.makedirs(DATA_DIR, exist_ok=True)
    settings = load_settings()

    existing_papers = []
    if os.path.exists(PAPERS_FILE):
        try:
            with open(PAPERS_FILE, 'r') as f:
                existing_papers = json.load(f)
        except Exception:
            existing_papers = []

    existing_ids = {p['id'] for p in existing_papers}

    print("📡 Querying arXiv & Hugging Face daily papers...")
    arxiv_entries = fetch_arxiv()
    hf_entries = fetch_huggingface()
    candidates = arxiv_entries + hf_entries

    newly_added = []
    for raw in candidates:
        if raw['id'] in existing_ids:
            continue
        evaluated = evaluate_paper(raw, settings)
        if evaluated:
            newly_added.append(evaluated)
            existing_ids.add(evaluated['id'])

    combined = newly_added + existing_papers
    combined.sort(key=lambda x: x.get('relevanceScore', 0), reverse=True)

    with open(PAPERS_FILE, 'w') as f:
        json.dump(combined, f, indent=2)

    print(f"✅ Discovery scan completed! Found {len(newly_added)} high-relevance papers out of {len(candidates)} candidates.")
    print(f"📊 Total database now tracking {len(combined)} curated papers.")

if __name__ == '__main__':
    main()
