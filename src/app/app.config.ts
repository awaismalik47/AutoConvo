import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, Router } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { ngrokInterceptor } from './core/interceptors/ngrok.interceptor';

/**
 * Meta / WhatsApp OAuth
 * - Server callback (Pattern A): API redirect_uri → user lands with `?meta_connected=1` or `?meta_error=…`
 *   → funnel to `/whatsapp` so the page can toast + refresh status.
 * - SPA code (Pattern B): `redirect_uri` = `{frontendUrl}/` → `?code=&state=` on `/` → forward to `/whatsapp`.
 */
const metaOAuthRedirectInitializer = () => {
  if (typeof window === 'undefined') return;
  const router = inject(Router);
  const sp = new URLSearchParams(window.location.search);
  const metaConnected = sp.get('meta_connected');
  const metaError = sp.get('meta_error');
  const hasServerMetaResult =
    metaConnected === '1' ||
    metaConnected === 'true' ||
    (metaError != null && metaError.length > 0);

  if (hasServerMetaResult) {
    const rawPath = window.location.pathname || '/';
    const pathNorm = rawPath.replace(/\/$/, '') || '/';
    if (pathNorm !== '/whatsapp') {
      void router.navigate(['/whatsapp'], {
        queryParams: {
          ...(metaConnected ? { meta_connected: metaConnected } : {}),
          ...(metaError != null && metaError.length > 0
            ? { meta_error: metaError }
            : {}),
        },
        replaceUrl: true,
      });
    }
    return;
  }

  const path = window.location.pathname;
  if (path !== '/' && path !== '') return;
  const code = sp.get('code');
  if (!code) return;
  const state = sp.get('state');
  void router.navigate(['/whatsapp'], {
    queryParams: { code, state: state ?? undefined },
    replaceUrl: true,
  });
};

/** App-wide providers: HTTP (JWT + ngrok bypass header), router, zone optimization. */
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    // Integration: `Authorization` + `ngrok-skip-browser-warning` (standalone apps use app.config, not main.ts).
    provideHttpClient(withInterceptors([ngrokInterceptor, authInterceptor])),
    provideRouter(routes, withComponentInputBinding()),
    provideAppInitializer(metaOAuthRedirectInitializer),
  ],
};
