import type { APIRoute } from 'astro';
import { getDb } from '../../lib/db';
import { json, logError } from '../../lib/http';

export const prerender = false;

/** Uptime probe: confirms the Worker is live and D1 is reachable. */
export const GET: APIRoute = async ({ locals }) => {
  const started = Date.now();
  try {
    await getDb(locals.runtime.env).prepare('SELECT 1').first();
    return json({ ok: true, service: 'gcf', db: 'up', latencyMs: Date.now() - started });
  } catch (error) {
    logError('health', error);
    return json({ ok: false, service: 'gcf', db: 'down' }, 503);
  }
};
