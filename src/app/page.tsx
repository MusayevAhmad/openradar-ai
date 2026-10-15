'use client';

import React, { useState, useEffect } from 'react';
import { ResearchPaper } from '@/types/paper';
import { AppSettings } from '@/lib/storage';
import { 
  Sparkles, 
  Cpu, 
  Bookmark, 
  ExternalLink, 
  CheckCircle2, 
  RefreshCw, 
  Search, 
  Share2, 
  Flame, 
  SlidersHorizontal,
  Bot,
  FileText,
  Activity,
  Layers,
  Calendar,
  Check,
  Copy,
  Network,
  LayoutGrid,
  Radio,
  Server,
  Zap,
  Terminal,
  ShieldCheck,
  Globe,
  Sliders,
  ChevronRight,
  Maximize2,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

interface AgentNode {
  id: string;
  name: string;
  role: string;
  status: 'healthy' | 'scanning' | 'idle';
  platform: string;
  x: number; // percentage
  y: number; // percentage
  papersProcessed: number;
  crons: string;
  glowColor: string;
}

export default function Dashboard() {
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [selectedPaper, setSelectedPaper] = useState<ResearchPaper | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [filterMode, setFilterMode] = useState<'all' | 'unread' | 'bookmarked'>('all');
  const [currentView, setCurrentView] = useState<'map' | 'grid' | 'feed'>('feed');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [copiedPost, setCopiedPost] = useState(false);

  // Agent Swarm Topology Nodes (as seen in ClawPort and AgentCenter)
  const agentNodes: AgentNode[] = [
    { id: 'radar-core', name: 'NEXUS-CORE', role: 'Central Orchestrator', status: 'healthy', platform: 'Local Mac / MPS', x: 50, y: 50, papersProcessed: papers.length, crons: 'Active', glowColor: 'rgba(56, 189, 248, 0.9)' },
    { id: 'arxiv-agent', name: 'ARXIV-SCANNER', role: 'cs.AI & cs.CR Ingestion', status: isScanning ? 'scanning' : 'healthy', platform: 'Cloud Worker', x: 26, y: 28, papersProcessed: papers.filter(p => p.source === 'arxiv').length, crons: 'Every 30m', glowColor: 'rgba(34, 197, 94, 0.8)' },
    { id: 'hf-agent', name: 'HUGGINGFACE-DAILY', role: 'Trending Model Scraper', status: isScanning ? 'scanning' : 'healthy', platform: 'AWS EC2 Node', x: 74, y: 26, papersProcessed: papers.filter(p => p.source === 'huggingface').length, crons: 'Every 1h', glowColor: 'rgba(234, 179, 8, 0.8)' },
    { id: 'safety-agent', name: 'THREAT-SYNTHESIZER', role: 'Threat Model & Safety Eval', status: 'healthy', platform: 'Anthropic / LLM Sandbox', x: 28, y: 72, papersProcessed: 18, crons: 'Event-driven', glowColor: 'rgba(244, 63, 94, 0.8)' },
    { id: 'social-agent', name: 'SCRIBE-DISPATCH', role: 'LinkedIn & Report Formatter', status: 'idle', platform: 'Docker Sub-Agent', x: 72, y: 72, papersProcessed: 24, crons: 'On-demand', glowColor: 'rgba(168, 85, 247, 0.8)' },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/papers');
      const data = await res.json();
      setPapers(data.papers || []);
      setSettings(data.settings || null);
      if (data.papers && data.papers.length > 0 && !selectedPaper) {
        setSelectedPaper(data.papers[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  async function triggerAgentScan() {
    setIsScanning(true);
    setScanMessage('Agent swarm active: querying arXiv, Hugging Face and frontier research feeds...');
    try {
      const res = await fetch('/api/papers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run_agent' })
      });
      const data = await res.json();
      if (data.success) {
        setPapers(data.papers);
        setScanMessage(`Agent swarm completed scan: Indexed ${data.addedCount} new papers across swarm nodes.`);
        setTimeout(() => setScanMessage(null), 6000);
      }
    } catch {
      setScanMessage('Error executing swarm discovery cycle.');
    } finally {
      setIsScanning(false);
    }
  }

  async function toggleBookmark(e: React.MouseEvent, paper: ResearchPaper) {
    e.stopPropagation();
    try {
      const res = await fetch('/api/papers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_bookmark', id: paper.id })
      });
      const data = await res.json();
      if (data.success) {
        setPapers(data.papers);
        if (selectedPaper?.id === paper.id) {
          setSelectedPaper({ ...selectedPaper, isBookmarked: !selectedPaper.isBookmarked });
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function toggleRead(e: React.MouseEvent, paper: ResearchPaper) {
    e.stopPropagation();
    try {
      const res = await fetch('/api/papers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_read', id: paper.id })
      });
      const data = await res.json();
      if (data.success) {
        setPapers(data.papers);
        if (selectedPaper?.id === paper.id) {
          setSelectedPaper({ ...selectedPaper, isRead: !selectedPaper.isRead });
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  function copyLinkedInPost(content: string) {
    navigator.clipboard.writeText(content);
    setCopiedPost(true);
    setTimeout(() => setCopiedPost(false), 2500);
  }

  const filteredPapers = papers.filter(p => {
    const matchesSearch = 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.authors.some(a => a.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTag = selectedTag === 'all' || p.tags.includes(selectedTag);

    const matchesFilter = 
      filterMode === 'all' ? true :
      filterMode === 'unread' ? !p.isRead :
      filterMode === 'bookmarked' ? p.isBookmarked : true;

    return matchesSearch && matchesTag && matchesFilter;
  });

  const allTags = Array.from(new Set(papers.flatMap(p => p.tags)));

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#07090e] text-[#f1f5f9] select-none font-sans">
      {/* Top Application Header (ClawPort / AgentCenter style) */}
      <header className="h-14 border-b border-[#171b26] px-5 flex items-center justify-between shrink-0 bg-[#0a0d14]/90 backdrop-blur-md z-30">
        <div className="flex items-center space-x-6">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-cyan-600 via-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 ring-1 ring-white/20">
              <Network className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm tracking-wide text-white">AGENTCENTER</span>
                <span className="text-[10px] text-zinc-500 font-mono tracking-wider">COMMAND CENTER</span>
              </div>
            </div>
          </div>

          {/* View Mode Switcher: Map vs Grid vs Feed */}
          <div className="flex items-center bg-[#10141f] p-0.5 rounded-lg border border-[#1f2637]">
            <button
              onClick={() => setCurrentView('map')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                currentView === 'map' ? 'bg-[#1b2234] text-sky-400 shadow-sm border border-sky-500/30' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Radio className="h-3.5 w-3.5" />
              <span>Swarm Map</span>
            </button>
            <button
              onClick={() => setCurrentView('feed')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                currentView === 'feed' ? 'bg-[#1b2234] text-sky-400 shadow-sm border border-sky-500/30' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Research Feed</span>
            </button>
          </div>
        </div>

        {/* Global Telemetry & Actions */}
        <div className="flex items-center space-x-4">
          {/* Swarm Health Status Pills (ClawPort style) */}
          <div className="hidden md:flex items-center space-x-3 text-[11px] font-mono text-zinc-400 bg-[#0e121a] px-3 py-1 rounded-full border border-[#1b212f]">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-zinc-300">5 Healthy Nodes</span>
            </span>
            <span className="text-zinc-600">|</span>
            <span className="flex items-center gap-1.5">
              <Radio className="h-3 w-3 text-sky-400" />
              <span>28 Crons Active</span>
            </span>
          </div>

          {/* Settings Tuning */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-1.5 rounded-lg bg-[#111622] hover:bg-[#182030] text-zinc-400 hover:text-white border border-[#21293c] transition cursor-pointer"
            title="Agent Topic & Keyword Tuning"
          >
            <Sliders className="h-4 w-4" />
          </button>

          {/* Run Agent Trigger */}
          <button
            onClick={triggerAgentScan}
            disabled={isScanning}
            className={`px-3.5 py-1.5 rounded-lg font-medium text-xs flex items-center space-x-2 transition cursor-pointer ${
              isScanning
                ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-lg shadow-sky-500/25 active:scale-95'
            }`}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Swarm Running...' : 'Deploy Swarm Scan'}</span>
          </button>
        </div>
      </header>

      {/* Swarm Alert Bar */}
      {scanMessage && (
        <div className="bg-sky-950/40 border-b border-sky-800/40 px-5 py-2 text-xs text-sky-300 flex items-center justify-between">
          <div className="flex items-center space-x-2 font-mono">
            <Activity className="h-3.5 w-3.5 animate-spin text-sky-400" />
            <span>{scanMessage}</span>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Navigation Sidebar */}
        <aside className="w-56 border-r border-[#171b26] bg-[#090c13] flex flex-col justify-between shrink-0 p-3 z-20">
          <div className="space-y-5">
            {/* Search filter */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search telemetry..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 bg-[#0f131d] border border-[#1d2434] rounded-lg text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Navigation Sections (ClawPort style) */}
            <div className="space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 px-2 py-1">Workspace</div>
              
              <button
                onClick={() => setFilterMode('all')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                  filterMode === 'all' ? 'bg-[#151c2a] text-sky-300 border border-sky-800/40' : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#0f131d]'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Layers className="h-3.5 w-3.5" />
                  <span>All Intelligence</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500 bg-[#0b0e15] px-1.5 py-0.5 rounded">{papers.length}</span>
              </button>

              <button
                onClick={() => setFilterMode('unread')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                  filterMode === 'unread' ? 'bg-[#151c2a] text-sky-300 border border-sky-800/40' : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#0f131d]'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Unread Queue</span>
                </div>
                <span className="text-[10px] font-mono text-sky-400 bg-sky-950/60 border border-sky-800/40 px-1.5 py-0.5 rounded">
                  {papers.filter(p => !p.isRead).length}
                </span>
              </button>

              <button
                onClick={() => setFilterMode('bookmarked')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                  filterMode === 'bookmarked' ? 'bg-[#151c2a] text-sky-300 border border-sky-800/40' : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#0f131d]'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Bookmark className="h-3.5 w-3.5" />
                  <span>Bookmarked</span>
                </div>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 border border-amber-800/40 px-1.5 py-0.5 rounded">
                  {papers.filter(p => p.isBookmarked).length}
                </span>
              </button>
            </div>

            {/* Filter by Topic Pills */}
            <div className="space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 px-2">Focus Domains</div>
              <div className="flex flex-col space-y-1 px-1">
                <button
                  onClick={() => setSelectedTag('all')}
                  className={`text-left text-xs px-2.5 py-1.5 rounded-md transition cursor-pointer ${
                    selectedTag === 'all'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-medium'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#111622]'
                  }`}
                >
                  * All Research Tracks
                </button>
                {allTags.slice(0, 7).map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`text-left text-xs px-2.5 py-1.5 rounded-md transition cursor-pointer truncate ${
                      selectedTag === tag
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-medium'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#111622]'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* User Profile Badge (Bottom Left) */}
          <div className="pt-3 border-t border-[#171b26] flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center font-bold text-[11px] text-white">
                AM
              </div>
              <div className="leading-tight">
                <div className="font-semibold text-zinc-200 text-[11px]">Ahmed M.</div>
                <div className="text-[10px] text-zinc-500 font-mono">Lead Operator</div>
              </div>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </aside>

        {/* SWARM MAP VIEW (Interactive Visual Graph like AgentCenter & ClawPort) */}
        {currentView === 'map' ? (
          <div className="flex-1 bg-[#06080e] bg-grid-cyber bg-radial-glow relative overflow-hidden flex flex-col p-6">
            {/* Top Bar on Canvas */}
            <div className="flex items-center justify-between mb-4 z-10">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Distributed Swarm Topology</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-sky-950 border border-sky-800 text-sky-400 font-mono">LIVE MESH</span>
                </h2>
                <p className="text-xs text-zinc-400">Coordinating multi-node ingestion, threat modeling, and local LLM replication analysis.</p>
              </div>

              {/* Map Controls */}
              <div className="flex items-center space-x-1.5 bg-[#0f131d] p-1 rounded-lg border border-[#1e2637]">
                <button className="p-1.5 rounded hover:bg-[#1b2234] text-zinc-400 hover:text-white cursor-pointer"><ZoomIn className="h-3.5 w-3.5" /></button>
                <button className="p-1.5 rounded hover:bg-[#1b2234] text-zinc-400 hover:text-white cursor-pointer"><ZoomOut className="h-3.5 w-3.5" /></button>
                <button className="p-1.5 rounded hover:bg-[#1b2234] text-zinc-400 hover:text-white cursor-pointer"><Maximize2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>

            {/* SVG Connecting Cables between Nexus Core and Nodes */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              {agentNodes.filter(n => n.id !== 'radar-core').map(node => (
                <g key={node.id}>
                  {/* Glowing Connection Line */}
                  <line
                    x1="50%"
                    y1="50%"
                    x2={`${node.x}%`}
                    y2={`${node.y}%`}
                    stroke="rgba(56, 189, 248, 0.25)"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                  <line
                    x1="50%"
                    y1="50%"
                    x2={`${node.x}%`}
                    y2={`${node.y}%`}
                    stroke={node.glowColor}
                    strokeWidth="1.5"
                    opacity="0.6"
                  />
                </g>
              ))}
            </svg>

            {/* Interactive Nodes Placed Across the Canvas */}
            <div className="relative flex-1 z-10">
              {agentNodes.map(node => {
                const isCore = node.id === 'radar-core';
                return (
                  <div
                    key={node.id}
                    style={{ left: `${node.x}%`, top: `${node.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 hover:scale-105"
                  >
                    {isCore ? (
                      /* Central Master Hub Node */
                      <div className="flex flex-col items-center">
                        <div className="relative flex items-center justify-center">
                          <div className="absolute h-24 w-24 rounded-full bg-sky-500/10 animate-ping" />
                          <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-sky-600 via-indigo-600 to-cyan-400 p-0.5 shadow-2xl shadow-sky-500/40">
                            <div className="h-full w-full rounded-full bg-[#0a0d14] flex items-center justify-center">
                              <Bot className="h-7 w-7 text-sky-400 animate-pulse" />
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 text-center">
                          <div className="font-bold text-sm text-white tracking-wide">{node.name}</div>
                          <div className="text-[10px] text-zinc-400 font-mono">{node.role}</div>
                          <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-[10px]">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>{papers.length} Papers Synced</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Sub-Agent Node Card (ClawPort style rounded card) */
                      <div className="glass-panel p-3.5 rounded-xl min-w-[200px] shadow-xl hover:border-sky-500/40 transition">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center space-x-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            <span className="font-bold text-xs text-white tracking-wide">{node.name}</span>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-500 bg-[#0d1017] px-1.5 py-0.5 rounded">
                            {node.platform}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 mb-2">{node.role}</div>
                        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                          <span className="text-emerald-400 font-semibold">{node.crons}</span>
                          <span>{node.papersProcessed} items</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* SPLIT FEED & DEEP READER VIEW */
          <div className="flex flex-1 overflow-hidden">
            {/* Center Column: Telemetry Feed (ClawPort & AgentCenter Feed) */}
            <section className="w-[430px] border-r border-[#171b26] bg-[#07090e] flex flex-col shrink-0">
              <div className="p-3 border-b border-[#171b26] bg-[#090c13] flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-zinc-300">STREAMING DISPATCH</span>
                <span className="text-[10px] font-mono text-zinc-500">{filteredPapers.length} results</span>
              </div>

              {/* Feed Stream */}
              <div className="flex-1 overflow-y-auto divide-y divide-[#131722]">
                {isLoading ? (
                  <div className="p-8 text-center text-zinc-500 text-xs font-mono">Syncing intelligence streams...</div>
                ) : filteredPapers.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 text-xs font-mono">
                    No papers found. Click &quot;Deploy Swarm Scan&quot; to ingest new research.
                  </div>
                ) : (
                  filteredPapers.map(paper => {
                    const isSelected = selectedPaper?.id === paper.id;
                    return (
                      <div
                        key={paper.id}
                        onClick={() => setSelectedPaper(paper)}
                        className={`p-3.5 cursor-pointer transition relative group ${
                          isSelected ? 'bg-[#111726] border-l-2 border-l-sky-400 shadow-inner' : 'hover:bg-[#0c0f17]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center space-x-1.5">
                            <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold ${
                              paper.source === 'anthropic' ? 'bg-amber-950/90 text-amber-300 border border-amber-800/50' :
                              paper.source === 'huggingface' ? 'bg-yellow-950/90 text-yellow-300 border border-yellow-800/50' :
                              'bg-sky-950/90 text-sky-300 border border-sky-800/50'
                            }`}>
                              {paper.source}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">{paper.publishedDate}</span>
                          </div>

                          <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-emerald-950/70 border border-emerald-800/50 text-emerald-400 text-[10px] font-mono font-bold">
                            <Flame className="h-3 w-3 text-emerald-400" />
                            <span>{paper.relevanceScore}%</span>
                          </div>
                        </div>

                        <h3 className={`text-xs font-semibold leading-snug mb-1 line-clamp-2 ${
                          isSelected ? 'text-sky-200' : 'text-zinc-200 group-hover:text-white'
                        }`}>
                          {paper.title}
                        </h3>

                        <p className="text-[11px] text-zinc-400 line-clamp-2 mb-2 leading-relaxed">
                          {paper.keyTakeaway}
                        </p>

                        <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-white/5">
                          <span className="truncate max-w-[200px]">
                            {paper.authors.slice(0, 2).join(', ')}
                          </span>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={e => toggleRead(e, paper)}
                              className={`hover:text-zinc-200 transition cursor-pointer ${paper.isRead ? 'text-sky-400' : 'text-zinc-600'}`}
                              title={paper.isRead ? 'Mark Unread' : 'Mark Read'}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={e => toggleBookmark(e, paper)}
                              className={`hover:text-amber-400 transition cursor-pointer ${paper.isBookmarked ? 'text-amber-400' : 'text-zinc-600'}`}
                              title="Bookmark"
                            >
                              <Bookmark className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* Right Column: High-End Glassmorphism Reader Canvas */}
            <main className="flex-1 overflow-y-auto bg-[#07090f] bg-radial-glow p-8">
              {selectedPaper ? (
                <div className="max-w-3xl mx-auto space-y-6">
                  {/* Breadcrumb & Actions */}
                  <div className="flex items-center justify-between pb-4 border-b border-[#171b26]">
                    <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400">
                      <span className="text-sky-400">{selectedPaper.primaryCategory}</span>
                      <span>/</span>
                      <span>DISCOVERED {selectedPaper.publishedDate}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={e => toggleBookmark(e, selectedPaper)}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                          selectedPaper.isBookmarked
                            ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                            : 'bg-[#0f131d] border-[#1d2434] text-zinc-400 hover:text-white'
                        }`}
                      >
                        <Bookmark className="h-3.5 w-3.5" />
                        <span>{selectedPaper.isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
                      </button>

                      <a
                        href={selectedPaper.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#0f131d] border border-[#1d2434] text-zinc-300 hover:text-white transition cursor-pointer"
                      >
                        <span>Source Link</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>

                      {selectedPaper.pdfUrl && (
                        <a
                          href={selectedPaper.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-lg shadow-sky-500/20 transition cursor-pointer"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>Direct PDF</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Title & Metadata */}
                  <div className="space-y-3">
                    <h1 className="text-2xl font-bold text-white tracking-tight leading-tight">
                      {selectedPaper.title}
                    </h1>

                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <span className="text-zinc-500 font-mono">AUTHORS:</span>
                      <span>{selectedPaper.authors.join(', ')}</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selectedPaper.tags.map(tag => (
                        <span key={tag} className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#101522] border border-[#1e2638] text-sky-300">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Glassmorphism Agent Synthesis Card */}
                  <div className="glass-panel p-5 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="h-4 w-4 text-sky-400" />
                        <span className="font-semibold text-xs tracking-wider uppercase text-zinc-200">
                          Autonomous Swarm Intelligence Synthesis
                        </span>
                      </div>
                      <div className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                        Relevance: {selectedPaper.relevanceScore}/100
                      </div>
                    </div>

                    {/* Executive Takeaway */}
                    <div className="p-3.5 rounded-xl bg-[#0b0e16]/80 border border-white/5 text-sm text-sky-200 leading-relaxed font-medium">
                      {selectedPaper.keyTakeaway}
                    </div>

                    {/* Why It Matters */}
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400">Strategic Significance</h4>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {selectedPaper.whyItMatters}
                      </p>
                    </div>

                    {/* Security Threat Model Alert (Anthropic style) */}
                    {selectedPaper.threatModelOrImplications && (
                      <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/40 space-y-1">
                        <div className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
                          <Cpu className="h-3.5 w-3.5 text-rose-400" />
                          <span>Threat Model & Runtime Isolation Analysis</span>
                        </div>
                        <p className="text-xs text-rose-200/90 leading-relaxed">
                          {selectedPaper.threatModelOrImplications}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Technical Abstract */}
                  <div className="glass-card p-5 rounded-2xl space-y-2">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400">Technical Abstract & Methodology</h3>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {selectedPaper.summary}
                    </p>
                  </div>

                  {/* Ready-to-Publish LinkedIn Post Draft */}
                  {selectedPaper.suggestedLinkedInPost && (
                    <div className="glass-panel p-5 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Share2 className="h-4 w-4 text-sky-400" />
                          <span className="text-xs font-semibold text-white">Generated Social Briefing / Post Draft</span>
                        </div>
                        <button
                          onClick={() => copyLinkedInPost(selectedPaper.suggestedLinkedInPost || '')}
                          className="px-3 py-1 rounded-lg text-xs font-medium bg-[#1a2336] hover:bg-[#222e47] text-sky-300 flex items-center space-x-1.5 transition cursor-pointer"
                        >
                          {copiedPost ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          <span>{copiedPost ? 'Copied!' : 'Copy to Clipboard'}</span>
                        </button>
                      </div>
                      <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-sans bg-[#090c13] p-4 rounded-xl border border-white/5 leading-relaxed">
                        {selectedPaper.suggestedLinkedInPost}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-500 text-xs font-mono">
                  Select a paper from the stream or swarm map to view full briefing.
                </div>
              )}
            </main>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-panel max-w-lg w-full p-6 rounded-2xl space-y-4 shadow-2xl border border-white/10">
            <h2 className="text-base font-bold text-white tracking-tight">Swarm Filter & Agent Tuning</h2>
            <p className="text-xs text-zinc-400">
              Control the semantic thresholds, target research keywords, and crawler frequencies.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Focus Tracks</label>
                <div className="p-3 bg-[#0a0d14] rounded-xl border border-white/5 text-zinc-300 space-y-1 font-mono">
                  {settings?.topics.map((t, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                      <span>{t}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Active Keyword Triggers</label>
                <div className="p-3 bg-[#0a0d14] rounded-xl border border-white/5 flex flex-wrap gap-1.5">
                  {settings?.keywords.map((kw, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-[#131926] text-sky-300 border border-sky-800/30 font-mono text-[11px]">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition cursor-pointer"
              >
                Close & Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
