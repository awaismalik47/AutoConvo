import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Sends ngrok’s bypass header on every HTTP request so the free-tier browser
 * warning interstitial does not break API calls. Backend CORS must allow
 * `ngrok-skip-browser-warning` in `Access-Control-Allow-Headers` when using
 * cross-origin requests.
 */
export const ngrokInterceptor: HttpInterceptorFn = (req, next) =>
  next(
    req.clone({
      setHeaders: {
        'ngrok-skip-browser-warning': 'true',
      },
    })
  );
