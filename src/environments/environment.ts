/**
 * Single source of truth for integration (align with backend `.env`):
 * - `apiUrl` — Nest API root (…/api/v1). HttpClient uses this (or same-origin `/api/v1` in dev via `httpApiRoot()`).
 * - `frontendUrl` — must match backend FRONTEND_URL so CORS allows the browser; also Stripe/Meta return URLs.
 *
 * Auth: `Authorization: Bearer <jwt>` is added by `auth.interceptor.ts` for protected routes.
 *
 * Local dev: `httpApiRoot()` returns `/api/v1` + `proxy.conf.json` → your API (e.g. ngrok). Update proxy when BASE changes.
 *
 * Meta OAuth: use **https** callback URLs (`npm run start:https` or ngrok). Register the exact `redirect_uri`:
 * - Pattern B (this SPA): `{frontendUrl}/` — see `getMetaOAuthRedirectUri()` and Meta “Valid OAuth redirect URIs”.
 * - Pattern A (server): `META_OAUTH_REDIRECT_URI` on the API; SPA handles `/?meta_connected=1` or `?meta_error=…`.
 *
 * CORS: the API must allow this origin explicitly (backend may use a fixed allowlist — add new deploy hosts there).
 */
const BASE = 'https://intromissive-unspontaneously-deanna.ngrok-free.dev';

export const environment = {
  production: false,
  /** When true, {@link httpApiRoot} uses `/api/v1` (proxied) regardless of `apiUrl`. Set false for a custom staging env. */
  devUseSameOriginApi: true,
  /**
   * Exact origin you open in the browser — must match Meta OAuth / Stripe / backend CORS.
   * Use `npm run start:https` so this https URL is real. Plain `npm start` is http-only and will not match this.
   */
  frontendUrl: 'https://localhost:4200',
  /** Public host without path — optional socket / links */
  baseUrl: BASE,
  /**
   * Logical API root when not using same-origin dev proxy. Overridden by {@link httpApiRoot} when `devUseSameOriginApi` is true.
   */
  apiUrl: `${BASE}/api/v1`,
  socketUrl: BASE,

  /**
   * Meta (Facebook) App ID — required for “Connect WhatsApp”.
   * In Meta Developer: App settings → Basic → App Domains: **host only** (`localhost` or your ngrok host).
   * Facebook Login → Valid OAuth Redirect URIs: exact `https://localhost:4200/whatsapp` (or your `frontendUrl` + `/whatsapp`).
   */
  metaAppId: '2393789204474392',
  /** Graph API version segment in the OAuth URL (e.g. v21.0). */
  metaGraphVersion: 'v21.0',
  /**
   * Comma-separated OAuth scopes — must match your Meta app and WhatsApp product setup.
   * Adjust per Embedded Signup / Login for Business docs.
   */
  metaOAuthScopes:
    'whatsapp_business_management,business_management,whatsapp_business_messaging',
  /**
   * WhatsApp Embedded Signup configuration ID (Meta Developer → Embedded Signup → Configurations).
   * When set, "Connect WhatsApp" launches the FB JS SDK popup instead of a full-page OAuth redirect.
   */
  metaEmbeddedSignupConfigId: '1325832982697087',
};
