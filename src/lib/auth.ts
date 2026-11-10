/**
 * Session signing + cookie helpers.
 *
 * Two kinds of session exist:
 *  - visitors: signed reference to their registration (so the dashboard can be
 *    rendered on the server without trusting a raw id from the browser)
 *  - staff: volunteers who unlocked the booth/chocolate scanners with the
 *    shared passcode
 *
 * Everything is signed with HMAC-SHA256 using SESSION_SECRET, so a cookie
 * cannot be forged by editing its value.
 */

const encoder = new TextEncoder();

export interface SessionPayload {
  kind: 'visitor' | 'staff';
  id?: string;
  exp: number;
}

export const VISITOR_COOKIE = 'gcf_pass';
export const STAFF_COOKIE = 'gcf_staff';

const VISITOR_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const STAFF_MAX_AGE = 60 * 60 * 12; // 12 hours – one shift

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function randomToken(byteLength = 18): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

export function randomId(): string {
  return crypto.randomUUID();
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return toBase64Url(new Uint8Array(signature));
}

/** Constant-time-ish comparison for secrets of equal length. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSession(
  payload: Omit<SessionPayload, 'exp'>,
  secret: string,
  ttlSeconds: number,
): Promise<string> {
  const full: SessionPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const body = toBase64Url(encoder.encode(JSON.stringify(full)));
  const signature = await hmac(secret, body);
  return `v1.${body}.${signature}`;
}

export async function readSession(value: string | undefined, secret: string): Promise<SessionPayload | null> {
  if (!value) return null;
  const [version, body, signature] = value.split('.');
  if (version !== 'v1' || !body || !signature) return null;
  const expected = await hmac(secret, body);
  if (!safeEqual(expected, signature)) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as SessionPayload;
    if (!payload || typeof payload.exp !== 'number') return null;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('cookie');
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

function cookieFlags(maxAge: number, secure: boolean): string {
  return `Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
}

export function visitorCookie(request: Request, value: string, maxAge = VISITOR_MAX_AGE): string {
  return `${VISITOR_COOKIE}=${encodeURIComponent(value)}; ${cookieFlags(maxAge, isHttps(request))}`;
}

export function staffCookie(request: Request, value: string, maxAge = STAFF_MAX_AGE): string {
  return `${STAFF_COOKIE}=${encodeURIComponent(value)}; ${cookieFlags(maxAge, isHttps(request))}`;
}

export function clearCookie(request: Request, name: string): string {
  return `${name}=; ${cookieFlags(0, isHttps(request))}`;
}

function isHttps(request: Request): boolean {
  try {
    return new URL(request.url).protocol === 'https:';
  } catch {
    return true;
  }
}

export async function issueVisitorCookie(request: Request, visitorId: string, secret: string): Promise<string> {
  const value = await createSession({ kind: 'visitor', id: visitorId }, secret, VISITOR_MAX_AGE);
  return visitorCookie(request, value);
}

export async function issueStaffCookie(request: Request, secret: string): Promise<string> {
  const value = await createSession({ kind: 'staff' }, secret, STAFF_MAX_AGE);
  return staffCookie(request, value);
}

export async function currentVisitorId(request: Request, secret: string): Promise<string | null> {
  const payload = await readSession(readCookie(request, VISITOR_COOKIE), secret);
  if (!payload || payload.kind !== 'visitor' || !payload.id) return null;
  return payload.id;
}

export async function isStaff(request: Request, secret: string): Promise<boolean> {
  const payload = await readSession(readCookie(request, STAFF_COOKIE), secret);
  return Boolean(payload && payload.kind === 'staff');
}
