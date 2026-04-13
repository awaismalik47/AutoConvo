import { environment } from './environment';

/**
 * Base URL for HttpClient API calls.
 * In local dev (`!production` + `devUseSameOriginApi`), always uses same-origin `/api/v1`
 * so `ng serve` + `proxy.conf.json` can forward to your API and avoid browser CORS.
 * Ignores a mistaken absolute `apiUrl` in `environment.ts`.
 */
export function httpApiRoot(): string {
  if (!environment.production && environment.devUseSameOriginApi) {
    return '/api/v1';
  }
  return environment.apiUrl;
}
