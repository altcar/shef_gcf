import type { APIRoute } from 'astro';
import { currentVisitorId } from '../../lib/auth';
import { getDb, progressFor } from '../../lib/db';
import { sessionSecret } from '../../lib/env';
import { apiError, json, logError, methodNotAllowed } from '../../lib/http';

export const prerender = false;

/** Polled by the dashboard so a visitor can watch their stamps appear. */
export const GET: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  try {
    const visitorId = await currentVisitorId(request, sessionSecret(env));
    if (!visitorId) return apiError('No visitor session on this device.', 401);

    const progress = await progressFor(getDb(env), visitorId);
    if (!progress) return apiError('Pass not found.', 404);

    return json({
      ok: true,
      visitor: {
        name: progress.visitor.name,
        email: progress.visitor.email,
        course: progress.visitor.course,
        gradYear: progress.visitor.grad_year,
      },
      visited: progress.visited,
      remaining: progress.remaining.map((item) => ({ slug: item.slug, name: item.name })),
      completed: progress.completed,
      redeemedAt: progress.redeemedAt,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    logError('visitor-status', error);
    return apiError('Could not load your progress.', 500);
  }
};

export const POST: APIRoute = () => methodNotAllowed('GET');
