/** API host — must match deployed Nest; `frontendUrl` must be allowed in CORS (FRONTEND_URL). */
const BASE = 'https://intromissive-unspontaneously-deanna.ngrok-free.dev';

export const environment = {
  production: true,
  devUseSameOriginApi: false,
  /** Exact origin users open — align with backend FRONTEND_URL. */
  frontendUrl: 'https://autoconvo-lgpj.onrender.com',
  baseUrl: BASE,
  apiUrl: `${BASE}/api/v1`,
  socketUrl: BASE,

  metaAppId: '2393789204474392',
  metaGraphVersion: 'v21.0',
  metaOAuthScopes:
    'whatsapp_business_management,business_management,whatsapp_business_messaging',
};
