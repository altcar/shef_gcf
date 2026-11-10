# Green Career Fair — visitor pass, booth scanner, chocolate counter

A production-ready QR pass system for a careers fair, running on **Cloudflare Workers** with **D1**.
Visitors register once, get a personal QR pass, and each employer scans it at their stand. When all
seven stands are ticked, the chocolate counter verifies the pass and hands over the reward.

Built with Astro 5 (SSR), the Cloudflare adapter, D1 and zero third-party CDNs — fonts, icons and the
QR scanner are all bundled.

---

## The flow

| Who | Where | What happens |
| --- | --- | --- |
| Visitor | `/` | Registers with name, university email, course, graduation year |
| Visitor | `/dashboard` | Sees their QR pass, live stand progress and chocolate status |
| Volunteer | `/staff` | Unlocks the staff area with the shared passcode |
| Volunteer | `/company/[slug]` | Booth scanner: logs the visit and shows name/course/email |
| Volunteer | `/chocolate` | Verifies all seven stands, marks the pass redeemed |

Employers live in [`src/lib/employers.ts`](src/lib/employers.ts) — add a stand there and every page,
checklist and API validates it automatically.

## Why it is safe to run at an event

- **Unguessable passes.** The QR contains a 144-bit random token (`gcf:v1:…`), never a visitor number,
  so passes cannot be enumerated or forged.
- **Signed sessions.** Visitor and staff cookies are HMAC-SHA256 signed (`SESSION_SECRET`) and
  `HttpOnly`/`SameSite=Lax`, so editing a cookie does not grant access.
- **Staff-gated scanners.** Booth and chocolate endpoints reject requests without a valid staff
  session. Volunteers unlock a device once per twelve-hour shift with `STAFF_CODE`.
- **Idempotent writes.** `visits` and `redemptions` are protected by primary keys, so a double scan
  or a queue rush cannot double-count a stand or hand out two bars.
- **Rate limits.** Registration, scanning and passcode attempts are throttled per IP in D1.
- **Hardened responses.** CSP, `X-Frame-Options`, `Permissions-Policy` (camera limited to self),
  HSTS and `no-store` on pass/API responses, set in [`src/middleware.ts`](src/middleware.ts).
- **Privacy by design.** Details are shown only on the stand that scans the pass, and staff can
  export and delete data at any time.

## Routes

```
/                     registration (redirects to the pass when signed in)
/dashboard            visitor QR pass + progress
/staff                staff sign-in, fair overview, CSV export, scanner links
/company/[slug]       booth scanner (staff only)
/chocolate            reward verification (staff only)

POST /api/register    create or resume a visitor pass
POST /api/visit       record a stand visit              (staff only)
POST /api/redeem      verify + redeem the chocolate     (staff only)
POST /api/staff/login unlock a device with the passcode
POST /api/staff/logout
POST /api/logout      visitor sign-out
GET  /api/visitor     pass progress for the signed-in visitor (dashboard polling)
GET  /api/export      CSV of registrations and visits   (staff only)
GET  /api/health      uptime + D1 probe
```

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars     # set STAFF_CODE + a random SESSION_SECRET
npm run db:migrate:local           # creates the local D1 schema
npm run dev                        # http://localhost:4321
```

`npm run preview` builds and serves the real Worker runtime (`wrangler dev`) with the local D1
database, which is the closest thing to production.

Useful checks:

```bash
npm run check      # astro check (TypeScript + templates)
npm run build      # production build
```

## Deploy

The Worker is **gcf** → <https://gcf.hheylau.workers.dev>.

```bash
# one-time
npx wrangler d1 create gcf         # copy database_id into wrangler.jsonc
npm run db:migrate                 # apply migrations to the remote database
npx wrangler secret put SESSION_SECRET   # openssl rand -hex 32
npx wrangler secret put STAFF_CODE       # the volunteer passcode

# every deploy
npm run deploy                     # astro build && wrangler deploy
```

### Continuous deployment (Workers Builds)

Pushing to `main` builds and deploys through Cloudflare Workers Builds:

| Setting | Value |
| --- | --- |
| Repository | `altcar/gcf` · branch `main` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Root directory | `/` |
| Build variable | `WRANGLER_VERSION=4.160.0` (pinned) |
| Node version | from `engines.node` (`>=20`) |

`package.json` pins `wrangler@4.160.0` exactly, so CI deploys with the same Wrangler as local
development. `.npmrc` allows the `esbuild`/`workerd` install scripts that npm 11 blocks by default.
Workers Builds installs dependencies before it runs the build command, so the build command is just
`npm run build`. Preview builds (non-`main` branches) use
`npx wrangler versions upload`.

## Deployment history

This app used to run on Vercel (`gcf-liart.vercel.app`) with a MySQL database. It now runs entirely
on Cloudflare: Workers for SSR, D1 for storage, Workers Builds for CI. The old Vercel project has been
deleted and the old database host is unreachable, so nothing outside this repository is still needed.

## Data

D1 schema lives in [`db/migrations`](db/migrations):

- `visitors` — one row per pass (unique lower-cased email, random QR token)
- `visits` — `(visitor_id, employer)` primary key
- `redemptions` — one row per collected chocolate
- `rate_limits` — short-lived counters for the throttles

Need the raw numbers for employers or a report? Sign in at `/staff` and use **Export CSV**.

The original MySQL schema from the Vercel deployment is kept for reference in
[`docs/legacy-mysql-schema.sql`](docs/legacy-mysql-schema.sql). The old database host is no longer
reachable, so the Worker now owns its data in D1.

## Project layout

```
src/
  components/     Brand, Icon, Scanner, shared UI
  layouts/        Base shell (head, top bar, footer)
  lib/            auth (signed cookies), db (D1 queries), employers, http, format
  middleware.ts   security headers
  pages/          index, dashboard, staff, chocolate, company/[slug], 404, api/*
  styles/         design tokens + shared CSS
db/migrations/    D1 schema
public/           favicon, manifest, robots
```
