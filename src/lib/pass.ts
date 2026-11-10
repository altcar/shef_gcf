/** QR payload helpers. The QR carries a random token, never a visitor id. */

const PASS_PREFIX = 'gcf:v1:';

export function encodePass(token: string): string {
  return `${PASS_PREFIX}${token}`;
}

/** Accepts `gcf:v1:<token>` and bare tokens (handy for manual entry). */
export function passToken(value: string): string {
  return value.trim().replace(/^gcf:v\d+:/i, '');
}
