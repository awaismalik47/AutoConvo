const BASE = 'https://intromissive-unspontaneously-deanna.ngrok-free.dev';

export const environment = {
  production: true,
  devUseSameOriginApi: false,
  frontendUrl: 'https://autoconvo.onrender.com',
  baseUrl: BASE,
  apiUrl: `${BASE}/api/v1`,
  socketUrl: BASE,
  ngrokSkipBrowserWarning: null as string | null,

  metaAppId: '2393789204474392',
  metaGraphVersion: 'v21.0',
  metaOAuthScopes:
    'whatsapp_business_management,business_management,whatsapp_business_messaging',
};
