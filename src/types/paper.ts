export interface ResearchPaper {
  id: string;
  title: string;
  authors: string[];
  publishedDate: string;
  source: 'arxiv' | 'huggingface' | 'anthropic' | 'openai' | 'deepmind';
  sourceUrl: string;
  pdfUrl?: string;
  primaryCategory: string;
  tags: string[];
  relevanceScore: number; // 0 - 100
  keyTakeaway: string;
  summary: string;
  whyItMatters: string;
  threatModelOrImplications?: string;
  suggestedLinkedInPost?: string;
  isRead?: boolean;
  isBookmarked?: boolean;
  discoveredAt: string;
}

export interface AgentStatus {
  lastRunTime: string | null;
  isRunning: boolean;
  papersFoundTotal: number;
  activeTopicFilters: string[];
  logs: { timestamp: string; message: string; type: 'info' | 'success' | 'warn' | 'error' }[];
}

export interface UserTopicProfile {
  topics: string[];
  keywords: string[];
  minRelevanceThreshold: number;
}
