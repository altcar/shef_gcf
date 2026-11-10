# Event-day runbook

A short guide for whoever is holding the iPad at the booth desk.

## Before the doors open

1. Open <https://gcf.hheylau.workers.dev/staff> on each scanner device (phone or tablet).
2. Enter the volunteer passcode. The session lasts **12 hours**, so do this once per shift.
3. Tap each stand in **Open a scanner** to pre-load its page and check the camera permission is granted.
4. Do a test scan with a spare pass, then delete that test registration (see below).
5. If a device's camera is blocked, open the site over HTTPS and allow camera access in
   Settings → Site permissions. The booth scanner also accepts an uploaded photo or a typed pass code.

## During the fair

- **Booth:** visitor opens `/dashboard`, volunteer scans the QR. The result card shows name, course,
  year and email (tap the email to copy it), plus how many stands are left.
- **Chocolate:** scan the pass at `/chocolate`. Green = hand over a bar. Amber = the visitor is
  missing stands, and the screen names them.
- Everything is idempotent: scanning twice never double-counts a stand or gives two bars.

## If something looks wrong

| Symptom | What to do |
| --- | --- |
| "Pass not recognised" | Visitor is signed out or on a different device. Ask them to open `/dashboard` again, or register again with the same email to restore the pass. |
| "Staff session expired" | Enter the passcode again on that device. |
| Camera will not start | Allow camera access, use **Upload photo**, or type the pass code under *Type a pass code instead*. |
| Wrong details on a pass | Register again with the same email? No — edit the row in D1 (see below) or ask the organiser. |

## Numbers and data

- `/staff` shows live registrations, scans, full laps, chocolates and per-stand coverage.
- **Export CSV** downloads every visitor with their visited stands, redemption time and registration time.
- Take a database backup before and after the event:

  ```bash
  npx wrangler d1 export gcf --remote --output gcf-backup-$(date +%F).sql
  ```

## Housekeeping

- **Rotate the passcode:** `npx wrangler secret put STAFF_CODE` (every device will need to unlock again).
- **Rotate the session secret:** `npx wrangler secret put SESSION_SECRET` (invalidates all passes and staff sessions).
- **Delete a test registration:**

  ```bash
  npx wrangler d1 execute gcf --remote --command \
    "DELETE FROM redemptions WHERE visitor_id IN (SELECT id FROM visitors WHERE email = 'test@example.com')"
  npx wrangler d1 execute gcf --remote --command \
    "DELETE FROM visits WHERE visitor_id IN (SELECT id FROM visitors WHERE email = 'test@example.com')"
  npx wrangler d1 execute gcf --remote --command \
    "DELETE FROM visitors WHERE email = 'test@example.com'"
  ```

- **Add or rename a stand:** edit `src/lib/employers.ts` and push. The checklist, booth routes and
  chocolate verification all follow automatically.
