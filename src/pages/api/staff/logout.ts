import type { APIRoute } from 'astro';
import { clearCookie, STAFF_COOKIE } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = ({ request }) =>
  new Response(null, {
    status: 303,
    headers: {
      Location: '/staff',
      'Set-Cookie': clearCookie(request, STAFF_COOKIE),
      'Cache-Control': 'no-store',
    },
  });
