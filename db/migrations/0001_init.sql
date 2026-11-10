-- Green Career Fair: visitor passes, booth visits and chocolate redemptions.

CREATE TABLE IF NOT EXISTS visitors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  course TEXT NOT NULL,
  grad_year INTEGER,
  -- Random secret carried inside the visitor QR code. Not guessable, so a QR
  -- cannot be forged from a visitor number.
  token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS visitors_email_unique ON visitors (lower(email));

CREATE TABLE IF NOT EXISTS visits (
  visitor_id TEXT NOT NULL REFERENCES visitors (id) ON DELETE CASCADE,
  employer TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (visitor_id, employer)
);

CREATE INDEX IF NOT EXISTS visits_employer_idx ON visits (employer);
CREATE INDEX IF NOT EXISTS visits_created_idx ON visits (created_at);

CREATE TABLE IF NOT EXISTS redemptions (
  visitor_id TEXT PRIMARY KEY REFERENCES visitors (id) ON DELETE CASCADE,
  redeemed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS redemptions_created_idx ON redemptions (redeemed_at);

-- Lightweight per-IP counters so registration and scan endpoints cannot be
-- hammered from a single device.
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL
);
