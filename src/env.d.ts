/// <reference types="astro/client" />

interface Env {
  DB: D1Database;
  /** Shared passcode volunteers type once per device to unlock the scanner pages. */
  STAFF_CODE?: string;
  /** HMAC key used to sign session cookies. */
  SESSION_SECRET?: string;
  PUBLIC_SITE_URL?: string;
}

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {}
}
