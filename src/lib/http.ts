/** Small helpers shared by the API endpoints. */

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...headers } });
}

export function apiError(
  message: string,
  status = 400,
  extra: Record<string, unknown> = {},
): Response {
  return json({ ok: false, error: message, ...extra }, status);
}

export function methodNotAllowed(allow: string): Response {
  return json({ ok: false, error: 'Method not allowed.' }, 405, { Allow: allow });
}

/** Reject cross-site form posts; cookies are SameSite=Lax on top of this. */
export function isCrossSite(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host !== new URL(request.url).host;
  } catch {
    return true;
  }
}

export function clientKey(request: Request): string {
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp;
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'local';
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Platform-aware error logging so failures show up in `wrangler tail`. */
export function logError(scope: string, error: unknown): void {
  console.error(`[gcf:${scope}]`, error instanceof Error ? error.stack ?? error.message : error);
}
