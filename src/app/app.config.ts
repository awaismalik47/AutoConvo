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

/** Meta OAuth uses redirect `{frontendUrl}/` — forward `?code=` to `/whatsapp` before first route activates. */
const metaOAuthRedirectInitializer = () => {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname;
  if (path !== '/' && path !== '') return;
  const sp = new URLSearchParams(window.location.search);
  const code = sp.get('code');
  if (!code) return;
  const state = sp.get('state');
  const router = inject(Router);
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
