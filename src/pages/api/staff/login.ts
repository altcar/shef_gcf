import type { APIRoute } from 'astro';
import { issueStaffCookie, safeEqual } from '../../../lib/auth';
import { getDb, takeRateLimit } from '../../../lib/db';
import { sessionSecret, staffCode } from '../../../lib/env';
import { apiError, clientKey, isCrossSite, json, logError, methodNotAllowed, readJsonObject, str } from '../../../lib/http';

export const prerender = false;

function safeNext(value: unknown): string {
  const next = str(value);
  if (!next.startsWith('/') || next.startsWith('//')) return '/staff';
  return next;
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (isCrossSite(request)) return apiError('Cross-site request blocked.', 403);

  const env = locals.runtime.env;
  try {
    const code = staffCode(env);
    if (!code) {
      return apiError('No staff passcode is configured for this deployment.', 503);
    }

    const db = getDb(env);
    if (!(await takeRateLimit(db, `staff-login:${clientKey(request)}`, 6, 300))) {
      return apiError('Too many attempts. Wait five minutes before trying again.', 429);
    }

    const body = await readJsonObject(request);
    const submitted = str(body?.code);
    if (!submitted) return apiError('Enter the staff passcode.', 400);

    if (!safeEqual(submitted, code)) {
      return apiError('That passcode is not right.', 401);
    }

    const cookie = await issueStaffCookie(request, sessionSecret(env));
    return json({ ok: true, redirect: safeNext(body?.next) }, 200, { 'Set-Cookie': cookie });
  } catch (error) {
    logError('staff-login', error);
    return apiError('Could not unlock the scanner. Please try again.', 500);
  }
};

export const GET: APIRoute = () => methodNotAllowed('POST');
