// Cloudflare Workers Bindings
export interface Env {
  DB: D1Database;
  R2: R2Bucket;
  CACHE: KVNamespace;
  AI_CONFIG: KVNamespace;
  VECTORIZE: VectorizeIndex;
  AI: Ai;
  AI_ENCRYPTION_KEY: string;
  ADMIN_PASSWORD: string;
  PROCESSOR?: Fetcher;
  API_GATEWAY?: Fetcher;
}

// Enums
export type SourceType = 'rss' | 'web' | 'upload';
export type JobType = 'fetch' | 'analyze' | 'report';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';
export type ReportType = 'daily' | 'weekly';
export type Pillar = 'career_business' | 'market_startup' | 'self_growth';
export type AIProvider = 'openai' | 'anthropic' | 'gemini';
export type MaturityRating = 'ADOPT' | 'TRIAL' | 'ASSESS' | 'HOLD';

// Database Models
export interface Source {
  id: string;
  type: SourceType;
  name: string;
  url: string;
  schedule: string;
  status: 'active' | 'paused';
  last_fetched_at: number | null;
  etag: string | null;
  created_at: number;
}

export interface Item {
  id: string;
  source_id: string | null;
  url: string;
  title: string;
  published_at: number | null;
  content_hash: string;
  r2_raw_key: string | null;
  r2_content_key: string | null;
  vectorize_id: string | null;
  created_at: number;
}

export interface Job {
  id: string;
  type: JobType;
  source_id: string | null;
  status: JobStatus;
  cursor: string | null;
  retry_count: number;
  next_run_at: number;
  started_at: number | null;
  completed_at: number | null;
  error_message: string | null;
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
}

export interface Report {
  id: string;
  type: ReportType;
  period_start: number;
  period_end: number;
  r2_report_key: string;
  created_at: number;
}

// AI Configuration
export interface AIConfig {
  provider: AIProvider;
  model: string;
  base_url: string | null;
  api_key_encrypted: string;
  temperature: number;
  max_tokens: number;
}

// Three-Pillar Analysis Types
export interface PillarAnalysis {
  relevance_score: number;
  insight: string;
  action_items: string[];
}

export interface ThreePillarResult {
  core_topic: string;
  pillars: {
    career_business: PillarAnalysis | null;
    market_startup: PillarAnalysis | null;
    self_growth: PillarAnalysis | null;
  };
  maturity_rating: MaturityRating;
  tags: string[];
  key_quotes: string[];
}

// API Request/Response Types
export interface AddSourceRequest {
  type: SourceType;
  name: string;
  url: string;
  schedule?: string;
}

export interface SaveSettingsRequest {
  provider: AIProvider;
  model: string;
  api_key: string;
  base_url?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatRequest {
  query: string;
  top_k?: number;
}

export interface ChatResponse {
  answer: string;
  sources: Array<{
    id: string;
    title: string;
    url: string;
  }>;
}
