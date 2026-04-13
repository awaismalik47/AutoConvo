import { HttpErrorResponse } from '@angular/common/http';

/**
 * Reads a user-facing message from API error bodies (your filter’s JSON shape).
 */
export function getApiErrorMessage(
  err: unknown,
  fallback = 'Something went wrong'
): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error;
    if (body && typeof body === 'object') {
      const o = body as Record<string, unknown>;
      const msg = o['message'];
      if (typeof msg === 'string' && msg.trim()) return msg;
      const nested = o['error'];
      if (nested && typeof nested === 'object') {
        const m = (nested as Record<string, unknown>)['message'];
        if (typeof m === 'string' && m.trim()) return m;
      }
      const code = o['statusCode'] ?? o['status'];
      if (typeof code === 'number' && err.status) {
        return `${fallback} (${err.status})`;
      }
    }
    if (typeof body === 'string' && body.trim()) return body;
    if (err.message) return err.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
