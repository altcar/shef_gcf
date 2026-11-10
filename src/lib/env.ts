/** Runtime configuration. Secrets are set with `wrangler secret put`. */

export function sessionSecret(env: Env): string {
  const value = env.SESSION_SECRET;
  if (!value || value.length < 16) {
    throw new Error('SESSION_SECRET is not configured for this Worker (see README › Secrets).');
  }
  return value;
}

export function staffCode(env: Env): string | null {
  const value = env.STAFF_CODE;
  return value && value.trim() ? value.trim() : null;
}
