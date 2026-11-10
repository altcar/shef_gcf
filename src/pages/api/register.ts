import type { APIRoute } from 'astro';
import { issueVisitorCookie } from '../../lib/auth';
import { createVisitor, getDb, takeRateLimit, visitorByEmail } from '../../lib/db';
import { sessionSecret } from '../../lib/env';
import { apiError, clientKey, isCrossSite, json, logError, methodNotAllowed, readJsonObject, str } from '../../lib/http';

export const prerender = false;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const POST: APIRoute = async ({ request, locals }) => {
  if (isCrossSite(request)) return apiError('Cross-site request blocked.', 403);

  const env = locals.runtime.env;
  try {
    const db = getDb(env);
    const secret = sessionSecret(env);

    if (!(await takeRateLimit(db, `register:${clientKey(request)}`, 10, 60))) {
      return apiError('Too many registration attempts from this device. Try again in a minute.', 429);
    }

    const body = await readJsonObject(request);
    if (!body) return apiError('Send a JSON object with name, email and course.', 400);

    const name = str(body.name);
    const email = str(body.email).toLowerCase();
    const course = str(body.course);
    const gradYearRaw = str(body.gradYear);

    const invalidFields: string[] = [];
    if (name.length < 2 || name.length > 80) invalidFields.push('name');
    if (!EMAIL_PATTERN.test(email) || email.length > 160) invalidFields.push('email');
    if (course.length < 2 || course.length > 120) invalidFields.push('course');

    let gradYear: number | null = null;
    if (gradYearRaw) {
      const parsed = Number.parseInt(gradYearRaw, 10);
      if (!Number.isFinite(parsed) || parsed < 2015 || parsed > 2100) invalidFields.push('gradYear');
      else gradYear = parsed;
    }

    if (invalidFields.length) {
      return apiError('Please check the highlighted fields.', 400, { invalidFields });
    }

    const existing = await visitorByEmail(db, email);
    if (existing) {
      const cookie = await issueVisitorCookie(request, existing.id, secret);
      return json(
        {
          ok: true,
          existing: true,
          message: 'You already have a pass on this email — welcome back.',
          visitor: { name: existing.name, email: existing.email, course: existing.course, gradYear: existing.grad_year },
        },
        200,
        { 'Set-Cookie': cookie },
      );
    }

    let visitor;
    try {
      visitor = await createVisitor(db, { name, email, course, gradYear });
    } catch (error) {
      // Two devices registering the same email at once: the unique index wins,
      // so fall back to the pass that was just created by the other request.
      const raced = await visitorByEmail(db, email);
      if (!raced) throw error;
      const cookie = await issueVisitorCookie(request, raced.id, secret);
      return json(
        {
          ok: true,
          existing: true,
          message: 'You already have a pass on this email — welcome back.',
          visitor: { name: raced.name, email: raced.email, course: raced.course, gradYear: raced.grad_year },
        },
        200,
        { 'Set-Cookie': cookie },
      );
    }

    const cookie = await issueVisitorCookie(request, visitor.id, secret);

    return json(
      {
        ok: true,
        existing: false,
        message: 'You are in. Your pass is ready.',
        visitor: { name: visitor.name, email: visitor.email, course: visitor.course, gradYear: visitor.grad_year },
      },
      201,
      { 'Set-Cookie': cookie },
    );
  } catch (error) {
    logError('register', error);
    return apiError('Could not save your registration. Please try again.', 500);
  }
};

export const GET: APIRoute = () => methodNotAllowed('POST');
