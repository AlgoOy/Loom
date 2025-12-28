export type SourceType = 'rss' | 'web' | 'upload';
export type Pillar = 'career_business' | 'market_startup' | 'self_growth';
export type AIProvider = 'openai' | 'anthropic' | 'gemini';
export type MaturityRating = 'ADOPT' | 'TRIAL' | 'ASSESS' | 'HOLD';

export interface Source {
  id: string;
  type: SourceType;
  name: string;
  url: string;
  status: 'active' | 'paused';
  last_fetched_at: number | null;
  created_at: number;
}

export interface PillarData {
  pillar: Pillar;
  relevance_score: number;
  summary: string;
  action_items: string[];
}

export interface Insight {
  id: string;
  item_id: string;
  pillar: Pillar;
  relevance_score: number;
  summary: string;
  action_items: string[];
  maturity_rating: MaturityRating | null;
  tags: string[];
  model_version: string;
  created_at: number;
  // Joined from items
  title?: string;
  url?: string;
  source_name?: string;
}

export interface Report {
  id: string;
  type: 'daily' | 'weekly';
  period_start: number;
  period_end: number;
  created_at: number;
}

export interface Settings {
  configured: boolean;
  provider?: AIProvider;
  model?: string;
  base_url?: string | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}
