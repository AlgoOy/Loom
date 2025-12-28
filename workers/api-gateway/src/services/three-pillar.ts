import type { AIConfig, ThreePillarResult, MaturityRating } from '../../../../shared/types';
import { callAI } from './ai-router';

const THREE_PILLAR_PROMPT = `You are an elite personal insight analyst. Analyze the following content and extract actionable intelligence across THREE dimensions.

## CONTENT TO ANALYZE:
{content}

## SOURCE METADATA:
- Title: {title}
- URL: {url}

## OUTPUT FORMAT (JSON):
Return a JSON object with the following structure. If a dimension has no relevance, set its value to null.

{
  "core_topic": "One-sentence summary of the main subject",
  "pillars": {
    "career_business": {
      "relevance_score": 0-100,
      "insight": "How this helps current job/business optimization or strengthens professional moat",
      "action_items": ["Specific actionable recommendation 1", "..."]
    },
    "market_startup": {
      "relevance_score": 0-100,
      "insight": "Hidden market pain points, unmet needs, or new business models enabled by tech combinations",
      "action_items": ["Potential opportunity 1", "..."]
    },
    "self_growth": {
      "relevance_score": 0-100,
      "insight": "New mental models, technical cognition upgrades, or global perspective expansion",
      "action_items": ["Learning or mindset shift 1", "..."]
    }
  },
  "maturity_rating": "ADOPT | TRIAL | ASSESS | HOLD",
  "tags": ["AI", "SaaS", "Management", "..."],
  "key_quotes": ["Verbatim important quote from source 1", "..."]
}

## RULES:
1. Be brutally honest - if content is low-value fluff, say so
2. Action items must be SPECIFIC and PERSONAL (not generic advice)
3. Always ground insights in actual content - no hallucination
4. Maturity rating follows ThoughtWorks Tech Radar logic:
   - ADOPT: Proven, use now
   - TRIAL: Worth pursuing, understand risks
   - ASSESS: Worth exploring, not ready for production
   - HOLD: Proceed with caution
5. Extract 1-3 key quotes that support your analysis
6. Output ONLY valid JSON, no markdown fences`;

interface AnalyzeParams {
  content: string;
  title: string;
  url: string;
  config: AIConfig;
  apiKey: string;
}

export async function analyzeThreePillar(params: AnalyzeParams): Promise<ThreePillarResult> {
  const prompt = THREE_PILLAR_PROMPT
    .replace('{content}', params.content.slice(0, 15000))
    .replace('{title}', params.title)
    .replace('{url}', params.url);

  const response = await callAI(
    {
      provider: params.config.provider,
      apiKey: params.apiKey,
      model: params.config.model,
      baseUrl: params.config.base_url,
      temperature: params.config.temperature,
      maxTokens: params.config.max_tokens,
    },
    [
      { role: 'system', content: 'You are an expert analyst. Output only valid JSON.' },
      { role: 'user', content: prompt },
    ]
  );

  return parseAnalysisResponse(response.content);
}

function parseAnalysisResponse(text: string): ThreePillarResult {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON found in response');

  const parsed = JSON.parse(match[0]);

  return {
    core_topic: parsed.core_topic || '',
    pillars: {
      career_business: normalizePillar(parsed.pillars?.career_business),
      market_startup: normalizePillar(parsed.pillars?.market_startup),
      self_growth: normalizePillar(parsed.pillars?.self_growth),
    },
    maturity_rating: normalizeMaturity(parsed.maturity_rating),
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    key_quotes: Array.isArray(parsed.key_quotes) ? parsed.key_quotes : [],
  };
}

function normalizePillar(p: any): { relevance_score: number; insight: string; action_items: string[] } | null {
  if (!p || typeof p !== 'object') return null;
  if (p.relevance_score === 0 || p.relevance_score === null) return null;
  return {
    relevance_score: Number(p.relevance_score) || 0,
    insight: String(p.insight || ''),
    action_items: Array.isArray(p.action_items) ? p.action_items.map(String) : [],
  };
}

function normalizeMaturity(m: any): MaturityRating {
  const val = String(m).toUpperCase();
  if (['ADOPT', 'TRIAL', 'ASSESS', 'HOLD'].includes(val)) return val as MaturityRating;
  return 'ASSESS';
}
