import { randomToken } from './auth';
import type { Employer } from './employers';
import { employerName, employerSlugs, employers, totalEmployers } from './employers';

export interface Visitor {
  id: string;
  name: string;
  email: string;
  course: string;
  grad_year: number | null;
  token: string;
  created_at: string;
}

export interface VisitorProgress {
  visitor: Visitor;
  visited: string[];
  remaining: Employer[];
  completed: boolean;
  redeemedAt: string | null;
}

export function getDb(env: Env): D1Database {
  if (!env.DB) throw new Error('D1 binding "DB" is missing from the Worker environment.');
  return env.DB;
}

export async function visitorById(db: D1Database, id: string): Promise<Visitor | null> {
  return (await db.prepare('SELECT * FROM visitors WHERE id = ? LIMIT 1').bind(id).first<Visitor>()) ?? null;
}

export async function visitorByToken(db: D1Database, token: string): Promise<Visitor | null> {
  return (await db.prepare('SELECT * FROM visitors WHERE token = ? LIMIT 1').bind(token).first<Visitor>()) ?? null;
}

export async function visitorByEmail(db: D1Database, email: string): Promise<Visitor | null> {
  return (
    (await db
      .prepare('SELECT * FROM visitors WHERE lower(email) = lower(?) LIMIT 1')
      .bind(email)
      .first<Visitor>()) ?? null
  );
}

export async function createVisitor(
  db: D1Database,
  input: { name: string; email: string; course: string; gradYear: number | null },
): Promise<Visitor> {
  const id = crypto.randomUUID();
  const token = randomToken();
  await db
    .prepare(
      'INSERT INTO visitors (id, name, email, course, grad_year, token) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .bind(id, input.name, input.email, input.course, input.gradYear, token)
    .run();
  const created = await visitorById(db, id);
  if (!created) throw new Error('Visitor insert succeeded but the row could not be read back.');
  return created;
}

export async function visitedEmployers(db: D1Database, visitorId: string): Promise<string[]> {
  const { results } = await db
    .prepare('SELECT employer FROM visits WHERE visitor_id = ? ORDER BY created_at')
    .bind(visitorId)
    .all<{ employer: string }>();
  return (results ?? []).map((row) => row.employer);
}

export async function redemptionFor(db: D1Database, visitorId: string): Promise<string | null> {
  const row = await db
    .prepare('SELECT redeemed_at FROM redemptions WHERE visitor_id = ? LIMIT 1')
    .bind(visitorId)
    .first<{ redeemed_at: string }>();
  return row?.redeemed_at ?? null;
}

export async function progressFor(db: D1Database, visitorId: string): Promise<VisitorProgress | null> {
  const visitor = await visitorById(db, visitorId);
  if (!visitor) return null;
  const visited = await visitedEmployers(db, visitorId);
  const redeemedAt = await redemptionFor(db, visitorId);
  const remaining = employers.filter((employer) => !visited.includes(employer.slug));
  return {
    visitor,
    visited,
    remaining,
    completed: remaining.length === 0,
    redeemedAt,
  };
}

export async function recordVisit(
  db: D1Database,
  visitorId: string,
  employerSlug: string,
): Promise<{ already: boolean }> {
  const result = await db
    .prepare('INSERT INTO visits (visitor_id, employer) VALUES (?, ?) ON CONFLICT DO NOTHING')
    .bind(visitorId, employerSlug)
    .run();
  return { already: (result.meta.changes ?? 0) === 0 };
}

export async function redeem(
  db: D1Database,
  visitorId: string,
): Promise<{ already: boolean; redeemedAt: string | null }> {
  const existing = await redemptionFor(db, visitorId);
  if (existing) return { already: true, redeemedAt: existing };

  await db
    .prepare('INSERT INTO redemptions (visitor_id) VALUES (?) ON CONFLICT DO NOTHING')
    .bind(visitorId)
    .run();
  return { already: false, redeemedAt: await redemptionFor(db, visitorId) };
}

export interface FairStats {
  visitors: number;
  visits: number;
  redemptions: number;
  completedVisitors: number;
  todayVisits: number;
  todayRedemptions: number;
  perEmployer: { slug: string; name: string; visits: number }[];
  recent: {
    id: string;
    name: string;
    email: string;
    course: string;
    visited: number;
    redeemed: boolean;
    created_at: string;
  }[];
}

export async function fairStats(db: D1Database): Promise<FairStats> {
  const count = async (sql: string, ...binds: unknown[]) => {
    const row = await db
      .prepare(sql)
      .bind(...binds)
      .first<{ n: number }>();
    return Number(row?.n ?? 0);
  };

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const dayStart = startOfDay.toISOString();

  const perEmployerRows = await db
    .prepare('SELECT employer, COUNT(*) AS n FROM visits GROUP BY employer')
    .all<{ employer: string; n: number }>();
  const visitCounts = new Map((perEmployerRows.results ?? []).map((row) => [row.employer, Number(row.n)]));

  const recentRows = await db
    .prepare(
      `SELECT v.id, v.name, v.email, v.course, v.created_at,
              (SELECT COUNT(*) FROM visits WHERE visitor_id = v.id) AS visited,
              EXISTS (SELECT 1 FROM redemptions WHERE visitor_id = v.id) AS redeemed
         FROM visitors v
        ORDER BY v.created_at DESC
        LIMIT 12`,
    )
    .all<{
      id: string;
      name: string;
      email: string;
      course: string;
      created_at: string;
      visited: number;
      redeemed: number;
    }>();

  return {
    visitors: await count('SELECT COUNT(*) AS n FROM visitors'),
    visits: await count('SELECT COUNT(*) AS n FROM visits'),
    redemptions: await count('SELECT COUNT(*) AS n FROM redemptions'),
    completedVisitors: await count(
      'SELECT COUNT(*) AS n FROM (SELECT visitor_id FROM visits GROUP BY visitor_id HAVING COUNT(DISTINCT employer) >= ?)',
      totalEmployers,
    ),
    todayVisits: await count('SELECT COUNT(*) AS n FROM visits WHERE created_at >= ?', dayStart),
    todayRedemptions: await count('SELECT COUNT(*) AS n FROM redemptions WHERE redeemed_at >= ?', dayStart),
    perEmployer: employerSlugs.map((slug) => ({
      slug,
      name: employerName(slug),
      visits: visitCounts.get(slug) ?? 0,
    })),
    recent: (recentRows.results ?? []).map((row) => ({
      ...row,
      visited: Number(row.visited),
      redeemed: Number(row.redeemed) === 1,
    })),
  };
}

/** Small per-key rate limiter backed by D1 (survives isolates/restarts). */
export async function takeRateLimit(
  db: D1Database,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const windowStart = Math.floor(Date.now() / 1000 / windowSeconds) * windowSeconds;
  const row = await db
    .prepare('SELECT window_start, count FROM rate_limits WHERE key = ? LIMIT 1')
    .bind(key)
    .first<{ window_start: number; count: number }>();

  if (!row || Number(row.window_start) !== windowStart) {
    await db
      .prepare(
        `INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)
         ON CONFLICT (key) DO UPDATE SET window_start = excluded.window_start, count = 1`,
      )
      .bind(key, windowStart)
      .run();
    return true;
  }

  if (Number(row.count) >= limit) return false;
  await db.prepare('UPDATE rate_limits SET count = count + 1 WHERE key = ?').bind(key).run();
  return true;
}
