import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();

  let headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (environment.ngrokSkipBrowserWarning) {
    headers['ngrok-skip-browser-warning'] = String(environment.ngrokSkipBrowserWarning);
  }

  const cloned =
    Object.keys(headers).length > 0
      ? req.clone({ setHeaders: headers })
      : req;

  return next(cloned).pipe(
    catchError((err: HttpErrorResponse) => {
      // Only clear session when a token was sent (avoid logout on failed login/register).
      if (err.status === 401 && token) auth.logout();
      return throwError(() => err);
    })
  );
};