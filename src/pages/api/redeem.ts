import type { APIRoute } from 'astro';
import { isStaff } from '../../lib/auth';
import { getDb, progressFor, redeem, takeRateLimit, visitorByToken } from '../../lib/db';
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
      return apiError('Staff session expired. Unlock the chocolate counter again.', 401, { reason: 'staff' });
    }

    const body = await readJsonObject(request);
    if (!body) return apiError('Send a JSON object with the pass data.', 400);

    if (!(await takeRateLimit(db, `choc:${clientKey(request)}`, 40, 60))) {
      return apiError('Scanning too quickly. Wait a moment.', 429);
    }

    const token = passToken(str(body.data));
    if (!token) return apiError('No pass code in that QR.', 400);

    const visitor = await visitorByToken(db, token);
    if (!visitor) return apiError('That pass is not recognised.', 404);

    const progress = await progressFor(db, visitor.id);
    if (!progress) return apiError('Visitor record disappeared while checking visits.', 500);

    const visitorPayload = {
      name: visitor.name,
      email: visitor.email,
      course: visitor.course,
      gradYear: visitor.grad_year,
    };

    if (!progress.completed) {
      return json(
        {
          ok: false,
          completed: false,
          already: false,
          message: `${visitor.name} is missing ${progress.remaining.length} stand${progress.remaining.length === 1 ? '' : 's'}.`,
          visitor: visitorPayload,
          visitedCount: progress.visited.length,
          total: progress.visited.length + progress.remaining.length,
          remaining: progress.remaining.map((item) => ({ slug: item.slug, name: item.name })),
          redeemedAt: null,
        },
        200,
      );
    }

    const result = await redeem(db, visitor.id);
    return json({
      ok: true,
      completed: true,
      already: result.already,
      message: result.already
        ? `${visitor.name} already collected their chocolate.`
        : `All stands complete — chocolate unlocked for ${visitor.name}.`,
      visitor: visitorPayload,
      visitedCount: progress.visited.length,
      total: progress.visited.length + progress.remaining.length,
      remaining: [],
      redeemedAt: result.redeemedAt,
    });
  } catch (error) {
    logError('redeem', error);
    return apiError('Could not check that pass. Please try again.', 500);
  }
};

export const GET: APIRoute = () => methodNotAllowed('POST');
