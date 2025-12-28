import type { Env, Job, Source } from '../../../shared/types';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/process') {
      const job = await request.json() as Job;

      try {
        await processJob(job, env);
        await markCompleted(job.id, env);
        return Response.json({ ok: true });
      } catch (err) {
        await markFailed(job.id, String(err), env);
        return Response.json({ ok: false, error: String(err) }, { status: 500 });
      }
    }

    return new Response('Not Found', { status: 404 });
  },
};

async function processJob(job: Job, env: Env): Promise<void> {
  if (job.type === 'fetch') {
    await processFetchJob(job, env);
  }
}

async function processFetchJob(job: Job, env: Env): Promise<void> {
  if (!job.source_id) throw new Error('No source_id in job');

  const { results } = await env.DB.prepare('SELECT * FROM sources WHERE id = ?1').bind(job.source_id).all();
  const source = results[0] as unknown as Source | undefined;
  if (!source) throw new Error('Source not found');

  if (source.type === 'rss') {
    await fetchRSS(source, env);
  } else {
    await fetchWeb(source, env);
  }

  // Update source last_fetched_at
  await env.DB.prepare('UPDATE sources SET last_fetched_at = ?1 WHERE id = ?2')
    .bind(Date.now(), source.id).run();

  // Schedule next fetch
  await env.DB.prepare(
    `INSERT INTO jobs (id, type, source_id, status, next_run_at)
     VALUES (?1, ?2, ?3, ?4, ?5)`
  ).bind(crypto.randomUUID(), 'fetch', source.id, 'pending', Date.now() + 6 * 60 * 60 * 1000).run();
}

async function fetchRSS(source: Source, env: Env): Promise<void> {
  const res = await fetch(source.url, {
    headers: source.etag ? { 'If-None-Match': source.etag } : {},
  });

  if (res.status === 304) return; // Not modified

  const xml = await res.text();
  const etag = res.headers.get('ETag');

  if (etag) {
    await env.DB.prepare('UPDATE sources SET etag = ?1 WHERE id = ?2').bind(etag, source.id).run();
  }

  const items = parseRSS(xml);

  for (const item of items.slice(0, 10)) {
    await processItem(item.url, item.title, source.id, env);
  }
}

async function fetchWeb(source: Source, env: Env): Promise<void> {
  await processItem(source.url, source.name, source.id, env);
}

async function processItem(url: string, title: string, sourceId: string, env: Env): Promise<void> {
  // Check if already processed
  const existing = await env.DB.prepare('SELECT id FROM items WHERE url = ?1').bind(url).first();
  if (existing) return;

  // Fetch content
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

  const html = await res.text();
  const content = extractText(html);
  const hash = await sha256(content);

  const itemId = crypto.randomUUID();
  const r2Key = `content/${itemId}.json`;

  // Store in R2
  await env.R2.put(r2Key, JSON.stringify({
    id: itemId,
    url,
    title,
    content,
    fetched_at: Date.now(),
  }), { httpMetadata: { contentType: 'application/json' } });

  // Generate embedding
  const embResult = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: content.slice(0, 8000) });
  const embedding = (embResult as any).data?.[0]?.embedding;

  if (embedding) {
    await env.VECTORIZE.upsert([{
      id: itemId,
      values: embedding,
      metadata: { url, title, source_id: sourceId, r2_key: r2Key },
    }]);
  }

  // Save to D1
  await env.DB.prepare(
    `INSERT INTO items (id, source_id, url, title, content_hash, r2_content_key, vectorize_id, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
  ).bind(itemId, sourceId, url, title, hash, r2Key, itemId, Date.now()).run();

  // Trigger analysis
  if (env.API_GATEWAY) {
    await env.API_GATEWAY.fetch('https://api/internal/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId, content, title, url }),
    });
  }
}

function parseRSS(xml: string): Array<{ title: string; url: string }> {
  const items: Array<{ title: string; url: string }> = [];
  const matches = xml.match(/<item[\s\S]*?>[\s\S]*?<\/item>/gi) || [];

  for (const item of matches) {
    const title = extractTag(item, 'title');
    const link = extractTag(item, 'link');
    if (title && link) {
      items.push({ title: cleanCDATA(title), url: cleanCDATA(link) });
    }
  }
  return items;
}

function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return match ? match[1].trim() : '';
}

function cleanCDATA(text: string): string {
  return text.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function extractText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50000);
}

async function sha256(text: string): Promise<string> {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function markCompleted(jobId: string, env: Env): Promise<void> {
  await env.DB.prepare(
    'UPDATE jobs SET status = ?1, completed_at = ?2 WHERE id = ?3'
  ).bind('completed', Date.now(), jobId).run();
}

async function markFailed(jobId: string, error: string, env: Env): Promise<void> {
  await env.DB.prepare(
    'UPDATE jobs SET status = ?1, error_message = ?2, completed_at = ?3 WHERE id = ?4'
  ).bind('failed', error, Date.now(), jobId).run();
}
