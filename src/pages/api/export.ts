import type { APIRoute } from 'astro';
import { isStaff } from '../../lib/auth';
import { getDb } from '../../lib/db';
import { sessionSecret } from '../../lib/env';
import { logError } from '../../lib/http';

export const prerender = false;

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Staff-only CSV export of every registration and its visit trail. */
export const GET: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  try {
    if (!(await isStaff(request, sessionSecret(env)))) {
      return new Response('Staff sign-in required.', { status: 401, headers: { 'Content-Type': 'text/plain' } });
    }

    const { results } = await getDb(env)
      .prepare(
        `SELECT v.name, v.email, v.course, v.grad_year, v.created_at,
                (SELECT COUNT(*) FROM visits WHERE visitor_id = v.id) AS visit_count,
                (SELECT group_concat(employer, ' ') FROM visits WHERE visitor_id = v.id) AS employers,
                (SELECT redeemed_at FROM redemptions WHERE visitor_id = v.id) AS redeemed_at
           FROM visitors v
          ORDER BY v.created_at DESC`,
      )
      .all<{
        name: string;
        email: string;
        course: string;
        grad_year: number | null;
        created_at: string;
        visit_count: number;
        employers: string | null;
        redeemed_at: string | null;
      }>();

    const header = [
      'name',
      'email',
      'course',
      'graduation_year',
      'stands_visited',
      'stands',
      'chocolate_redeemed_at',
      'registered_at',
    ];

    const rows = (results ?? []).map((row) =>
      [
        row.name,
        row.email,
        row.course,
        row.grad_year ?? '',
        row.visit_count,
        row.employers ?? '',
        row.redeemed_at ?? '',
        row.created_at,
      ]
        .map(csvCell)
        .join(','),
    );

    const csv = [header.join(','), ...rows].join('\r\n');
    const stamp = new Date().toISOString().slice(0, 10);

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="green-career-fair-${stamp}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    logError('export', error);
    return new Response('Could not build the export.', { status: 500, headers: { 'Content-Type': 'text/plain' } });
  }
};
