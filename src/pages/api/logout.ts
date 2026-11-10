import type { APIRoute } from 'astro';
import { clearCookie, VISITOR_COOKIE } from '../../lib/auth';

export const prerender = false;

/** Sign out of the visitor pass on this device. */
export const POST: APIRoute = ({ request }) =>
  new Response(null, {
    status: 303,
    headers: {
      Location: '/',
      'Set-Cookie': clearCookie(request, VISITOR_COOKIE),
      'Cache-Control': 'no-store',
    },
  });
