import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { httpApiRoot } from '../../../environments/http-api-root';
import { AuthUser, LoginPayload, RegisterPayload, AuthResponse } from '../models';

/**
 * Backend should return a flat JSON body: `{ access_token, user? }`.
 * If you use a global wrapper `{ data: { access_token, user } }`, that is normalized here.
 */
function parseAuthResponse(raw: unknown): AuthResponse {
  if (raw === null || typeof raw !== 'object') {
    throw new Error('Invalid auth response');
  }
  const r = raw as Record<string, unknown>;
  const wrapped = r['data'];
  const src: Record<string, unknown> =
    wrapped !== null &&
    typeof wrapped === 'object' &&
    !Array.isArray(wrapped)
      ? (wrapped as Record<string, unknown>)
      : r;

  const access_token = String(
    src['access_token'] ?? src['token'] ?? src['accessToken'] ?? ''
  );
  if (!access_token) {
    throw new Error('Auth response missing access_token');
  }

  const userRaw = src['user'];
  const user =
    userRaw !== null && typeof userRaw === 'object' && !Array.isArray(userRaw)
      ? (userRaw as AuthUser)
      : undefined;

  return { access_token, user };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'wb_token';
  private readonly USER_KEY = 'wb_user';

  currentUser = signal<AuthUser | null>(this.loadUser());

  constructor(private http: HttpClient, private router: Router) {
    if (this.getToken()) {
      this.http
        .get<AuthUser>(`${httpApiRoot()}/users/me`)
        .pipe(catchError(() => of(null)))
        .subscribe((u) => {
          if (u) {
            localStorage.setItem(this.USER_KEY, JSON.stringify(u));
            this.currentUser.set(u);
          }
        });
    }
  }

  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http
      .post<unknown>(`${httpApiRoot()}/auth/login`, payload)
      .pipe(
        map((raw) => parseAuthResponse(raw)),
        tap((res) => this.persistTokenAndOptionalUser(res)),
        switchMap((res) => this.hydrateUserIfMissing(res))
      );
  }

  register(payload: RegisterPayload): Observable<AuthResponse> {
    return this.http
      .post<unknown>(`${httpApiRoot()}/auth/register`, payload)
      .pipe(
        map((raw) => parseAuthResponse(raw)),
        tap((res) => this.persistTokenAndOptionalUser(res)),
        switchMap((res) => this.hydrateUserIfMissing(res))
      );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
    void this.router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  private persistTokenAndOptionalUser(res: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, res.access_token);
    if (res.user) {
      localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
      this.currentUser.set(res.user);
    }
  }

  private hydrateUserIfMissing(
    res: AuthResponse
  ): Observable<AuthResponse> {
    if (res.user) return of(res);
    return this.http.get<AuthUser>(`${httpApiRoot()}/users/me`).pipe(
      tap((u) => {
        localStorage.setItem(this.USER_KEY, JSON.stringify(u));
        this.currentUser.set(u);
      }),
      map(() => res),
      catchError(() => of(res))
    );
  }

  private loadUser(): AuthUser | null {
    const raw = localStorage.getItem(this.USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  }
}
