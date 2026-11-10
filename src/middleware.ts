import { defineMiddleware } from 'astro:middleware';

/**
 * Security headers for every response. The CSP still allows inline scripts
 * because Astro hydrates small islands inline, but locks down framing, fonts,
 * camera scope and outbound connections.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ');

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  const headers = new Headers(response.headers);

  headers.set('Content-Security-Policy', CSP);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'same-origin');
  headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), payment=(), usb=()');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  headers.set('Cross-Origin-Resource-Policy', 'same-origin');

  if (new URL(context.request.url).protocol === 'https:') {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Never let a QR pass or a staff session be cached by a shared proxy.
  if (context.url.pathname.startsWith('/api/') || context.url.pathname === '/dashboard') {
    headers.set('Cache-Control', 'no-store');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});
