import type { Env, Job } from '../../../shared/types';

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    const now = Date.now();

    // Get pending jobs
    const { results } = await env.DB.prepare(
      `SELECT * FROM jobs
       WHERE status = 'pending' AND next_run_at <= ?1
       ORDER BY next_run_at ASC LIMIT 10`
    ).bind(now).all();

    const jobs = results as unknown as Job[];
    if (jobs.length === 0) return;

    // Fan-out to processor
    await Promise.all(jobs.map(job => dispatchJob(job, env)));
  },
};

async function dispatchJob(job: Job, env: Env): Promise<void> {
  const now = Date.now();

  // Mark as running
  await env.DB.prepare(
    `UPDATE jobs SET status = 'running', started_at = ?1 WHERE id = ?2`
  ).bind(now, job.id).run();

  try {
    if (!env.PROCESSOR) {
      throw new Error('PROCESSOR binding not configured');
    }

    const res = await env.PROCESSOR.fetch('https://processor/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(job),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Processor error: ${res.status} ${text}`);
    }
  } catch (err) {
    // Mark as failed
    await env.DB.prepare(
      `UPDATE jobs SET status = 'failed', error_message = ?1, completed_at = ?2 WHERE id = ?3`
    ).bind(String(err), Date.now(), job.id).run();
  }
}
