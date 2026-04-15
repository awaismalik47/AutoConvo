import { HttpInterceptorFn } from '@angular/common/http';

/**
 * ngrok free tier may inject an HTML interstitial unless this header is present.
 * Send it on every request to `*.ngrok-free.dev` / `*.ngrok-free.app` (the browser’s
 * OPTIONS preflight will list it in `Access-Control-Request-Headers` when required).
 *
 * Backend CORS must allow `ngrok-skip-browser-warning` in `Access-Control-Allow-Headers`
 * and your frontend origin in `Access-Control-Allow-Origin`.
 */
export const ngrokInterceptor: HttpInterceptorFn = (req, next) => {
  const url = req.url;
  if (url.includes('ngrok-free.dev') || url.includes('ngrok-free.app')) {
    return next(
      req.clone({
        setHeaders: { 'ngrok-skip-browser-warning': 'true' },
      })
    );
  }
  return next(req);
};
