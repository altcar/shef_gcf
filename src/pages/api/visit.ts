import type { APIRoute } from 'astro';
import { isStaff } from '../../lib/auth';
import { getDb, progressFor, recordVisit, takeRateLimit, visitorByToken } from '../../lib/db';
import { getEmployer } from '../../lib/employers';
import { sessionSecret } from '../../lib/env';
import { apiError, clientKey, isCrossSite, json, logError, methodNotAllowed, readJsonObject, str } from '../../lib/http';
import { passToken } from '../../lib/pass';

export const prerender = false;


export const POST: APIRoute = async ({ request, locals }) => {
  if (isCrossSite(request)) return apiError('Cross-site request blocked.', 403);

  const env = locals.runtime.env;
  try {
    const db = getDb(env);
    const secret = sessionSecret(env);

    if (!(await isStaff(request, secret))) {
      return apiError('Staff session expired. Unlock the booth scanner again.', 401, { reason: 'staff' });
    }

    const body = await readJsonObject(request);
    if (!body) return apiError('Send a JSON object with an employer and pass data.', 400);

    const employer = getEmployer(str(body.employer));
    if (!employer) return apiError('Unknown employer.', 400);
    if (!(await takeRateLimit(db, `scan:${clientKey(request)}`, 40, 60))) {
      return apiError('Scanning too quickly. Wait a moment.', 429);
    }

    const token = passToken(str(body.data));
    if (!token) return apiError('No pass code in that QR.', 400);

    const visitor = await visitorByToken(db, token);
    if (!visitor) {
      return apiError('That pass is not recognised. Ask the visitor to show their dashboard again.', 404);
    }

    const { already } = await recordVisit(db, visitor.id, employer.slug);
    const progress = await progressFor(db, visitor.id);
    if (!progress) return apiError('Visitor record disappeared while recording the visit.', 500);

    return json({
      ok: true,
      already,
      message: already
        ? `${visitor.name} had already been scanned at ${employer.name}.`
        : `Visit recorded at ${employer.name}.`,
      visitor: {
        name: visitor.name,
        email: visitor.email,
        course: visitor.course,
        gradYear: visitor.grad_year,
      },
      employer: { slug: employer.slug, name: employer.name },
      visitedCount: progress.visited.length,
      total: progress.visited.length + progress.remaining.length,
      completed: progress.completed,
      redeemedAt: progress.redeemedAt,
      remaining: progress.remaining.map((item) => ({ slug: item.slug, name: item.name })),
    });
  } catch (error) {
    logError('visit', error);
    return apiError('Could not record that visit. Please try again.', 500);
  }
};

export const GET: APIRoute = () => methodNotAllowed('POST');
