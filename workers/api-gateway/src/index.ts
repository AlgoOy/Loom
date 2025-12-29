import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, Source, AIConfig, Pillar, ReportType, Insight } from '../../../shared/types';
import { encrypt, decrypt } from './services/encryption';
import { callAI } from './services/ai-router';
import { analyzeThreePillar } from './services/three-pillar';

type Variables = { isAdmin: boolean };
const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use('/*', cors({
  origin: ['https://algooy.github.io', 'http://localhost:3000', 'http://localhost:5173'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Admin authentication middleware
app.use('/api/*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const password = authHeader?.replace('Bearer ', '');
  c.set('isAdmin', password === c.env.ADMIN_PASSWORD);
  await next();
});

// Helper to require admin
function requireAdmin(c: any): Response | null {
  if (!c.get('isAdmin')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  return null;
}

// Auth check endpoint
app.post('/api/auth', (c) => {
  return c.json({ authenticated: c.get('isAdmin') });
});

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }));

// Sources CRUD
app.post('/api/sources', async (c) => {
  const denied = requireAdmin(c);
  if (denied) return denied;

  const body = await c.req.json();
  if (!body.url || !body.type || !body.name) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  const now = Date.now();
  const source: Source = {
    id: crypto.randomUUID(),
    type: body.type,
    name: body.name,
    url: body.url,
    schedule: body.schedule || '0 */6 * * *',
    status: 'active',
    last_fetched_at: null,
    etag: null,
    created_at: now,
  };

  await c.env.DB.prepare(
    `INSERT INTO sources (id, type, name, url, schedule, status, last_fetched_at, etag, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`
  ).bind(
    source.id, source.type, source.name, source.url, source.schedule,
    source.status, source.last_fetched_at, source.etag, source.created_at
  ).run();

  // Create initial fetch job
  await c.env.DB.prepare(
    `INSERT INTO jobs (id, type, source_id, status, next_run_at) VALUES (?1, ?2, ?3, ?4, ?5)`
  ).bind(crypto.randomUUID(), 'fetch', source.id, 'pending', now).run();

  return c.json({ source }, 201);
});

app.get('/api/sources', async (c) => {
  const denied = requireAdmin(c);
  if (denied) return denied;

  const { results } = await c.env.DB.prepare('SELECT * FROM sources ORDER BY created_at DESC').all();
  return c.json({ sources: results });
});

app.delete('/api/sources/:id', async (c) => {
  const denied = requireAdmin(c);
  if (denied) return denied;

  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM sources WHERE id = ?1').bind(id).run();
  return c.json({ ok: true });
});

// Insights
app.get('/api/insights', async (c) => {
  const pillar = c.req.query('pillar') as Pillar | undefined;
  const rawLimit = Number(c.req.query('limit') || 50);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 50;

  let stmt = c.env.DB.prepare(
    'SELECT * FROM insights ORDER BY created_at DESC LIMIT ?1'
  ).bind(limit);

  if (pillar) {
    stmt = c.env.DB.prepare(
      'SELECT * FROM insights WHERE pillar = ?1 ORDER BY created_at DESC LIMIT ?2'
    ).bind(pillar, limit);
  }

  const { results } = await stmt.all();

  const insights = results.map((row: any) => ({
    ...row,
    action_items: safeJsonParse(row.action_items, []),
    tags: safeJsonParse(row.tags, []),
  }));

  return c.json({ insights });
});

// Chat / RAG Search (admin only - consumes AI tokens)
app.post('/api/chat', async (c) => {
  const denied = requireAdmin(c);
  if (denied) return denied;

  const body = await c.req.json();
  if (!body.query) return c.json({ error: 'Missing query' }, 400);

  const rawTopK = Number(body.top_k || 5);
  const topK = Number.isFinite(rawTopK) ? Math.min(Math.max(rawTopK, 1), 10) : 5;
  const query = String(body.query);

  // Generate embedding
  const embResult = await c.env.AI.run('@cf/baai/bge-base-en-v1.5', { text: query });
  const embedding = (embResult as any).data?.[0]?.embedding;
  if (!embedding) return c.json({ error: 'Embedding generation failed' }, 500);

  // Vector search
  const search = await c.env.VECTORIZE.query(embedding, { topK, returnMetadata: true });
  const matches = search.matches || [];

  const sources: Array<{ id: string; title: string; url: string }> = [];
  const contextChunks: string[] = [];

  for (const match of matches) {
    const meta = match.metadata as any;
    if (meta?.r2_key) {
      const obj = await c.env.R2.get(meta.r2_key);
      if (obj) {
        const data = await obj.json() as any;
        contextChunks.push(`Title: ${data.title}\nURL: ${data.url}\nContent: ${data.content?.slice(0, 2000)}`);
        sources.push({ id: match.id, title: data.title || '', url: data.url || '' });
      }
    }
  }

  if (contextChunks.length === 0) {
    return c.json({ answer: 'No relevant content found in knowledge base.', sources: [] });
  }

  // Load AI config
  const config = await loadAIConfig(c.env);

  const response = await callAI(
    {
      provider: config.provider,
      apiKey: config.apiKey,
      model: config.model,
      baseUrl: config.base_url,
      temperature: 0.3,
      maxTokens: 1500,
    },
    [
      { role: 'system', content: 'You are a growth research assistant. Answer based only on provided context. Be concise and actionable.' },
      { role: 'user', content: `Question: ${query}\n\nContext:\n${contextChunks.join('\n\n')}` },
    ]
  );

  return c.json({ answer: response.content, sources });
});

// Reports
app.get('/api/reports/:type', async (c) => {
  const type = c.req.param('type') as ReportType;
  if (type !== 'daily' && type !== 'weekly') {
    return c.json({ error: 'Invalid report type' }, 400);
  }

  const { results } = await c.env.DB.prepare(
    'SELECT * FROM reports WHERE type = ?1 ORDER BY created_at DESC LIMIT 10'
  ).bind(type).all();

  return c.json({ reports: results });
});

// Settings (admin only)
app.post('/api/settings', async (c) => {
  const denied = requireAdmin(c);
  if (denied) return denied;

  const body = await c.req.json();
  if (!body.provider || !body.model || !body.api_key) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  const encrypted = await encrypt(body.api_key, c.env.AI_ENCRYPTION_KEY);

  const config: AIConfig = {
    provider: body.provider,
    model: body.model,
    base_url: body.base_url || null,
    api_key_encrypted: encrypted,
    temperature: body.temperature ?? 0.2,
    max_tokens: body.max_tokens ?? 2000,
  };

  await c.env.AI_CONFIG.put('config', JSON.stringify(config));
  return c.json({ ok: true });
});

app.get('/api/settings', async (c) => {
  const denied = requireAdmin(c);
  if (denied) return denied;

  const stored = await c.env.AI_CONFIG.get('config', 'json') as AIConfig | null;
  if (!stored) return c.json({ configured: false });
  return c.json({
    configured: true,
    provider: stored.provider,
    model: stored.model,
    base_url: stored.base_url,
  });
});

// Internal endpoint for processor
app.post('/internal/analyze', async (c) => {
  const body = await c.req.json();
  if (!body.content || !body.item_id) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  const config = await loadAIConfig(c.env);

  const analysis = await analyzeThreePillar({
    content: body.content,
    title: body.title || '',
    url: body.url || '',
    config,
    apiKey: config.apiKey,
  });

  const now = Date.now();
  const pillars: Array<{ pillar: Pillar; data: any }> = [
    { pillar: 'career_business', data: analysis.pillars.career_business },
    { pillar: 'market_startup', data: analysis.pillars.market_startup },
    { pillar: 'self_growth', data: analysis.pillars.self_growth },
  ];

  for (const { pillar, data } of pillars) {
    if (!data) continue;

    await c.env.DB.prepare(
      `INSERT INTO insights (id, item_id, pillar, relevance_score, summary, action_items, maturity_rating, tags, model_version, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`
    ).bind(
      crypto.randomUUID(),
      body.item_id,
      pillar,
      data.relevance_score,
      data.insight,
      JSON.stringify(data.action_items),
      analysis.maturity_rating,
      JSON.stringify(analysis.tags),
      config.model,
      now
    ).run();
  }

  return c.json({ analysis, core_topic: analysis.core_topic });
});

async function loadAIConfig(env: Env): Promise<AIConfig & { apiKey: string }> {
  const stored = await env.AI_CONFIG.get('config', 'json') as AIConfig | null;
  if (!stored) throw new Error('AI config not set. Please configure in settings.');
  const apiKey = await decrypt(stored.api_key_encrypted, env.AI_ENCRYPTION_KEY);
  return { ...stored, apiKey };
}

function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export default app;
