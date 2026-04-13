/**
 * Single source of truth for integration (align with backend `.env`):
 * - `apiUrl` — API root (…/api/v1). Same idea as API_URL in docs.
 * - `frontendUrl` — must match backend FRONTEND_URL (scheme + host + port) for CORS + Stripe return URLs.
 *
 * Local dev: use `httpApiRoot()` from `http-api-root.ts` — it returns `/api/v1` so the browser stays same-origin
 * and `ng serve` proxies `/api` → `BASE` (see `proxy.conf.json`). Update the proxy target when ngrok changes.
 *
 * Meta OAuth requires **https** callback URLs. Use `npm run start:https`, open `https://localhost:4200`, and register
 * `https://localhost:4200/whatsapp` in Meta. Alternatively set `frontendUrl` to an **https** ngrok URL for the UI.
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
   * If set to `'true'`, every request sends `ngrok-skip-browser-warning` (helps some ngrok free flows).
   * That counts as a custom header → CORS preflight must list it:
   * `Access-Control-Allow-Headers` must include `ngrok-skip-browser-warning` (plus e.g. `Authorization`, `Content-Type`).
   * Leave `null` until the API allows that header, or login/XHR will fail with a CORS error.
   */
  ngrokSkipBrowserWarning: null as string | null,

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
};
