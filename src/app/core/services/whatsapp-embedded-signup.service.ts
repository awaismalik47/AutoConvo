import { Injectable } from '@angular/core';

/** Origins Meta may use for Embedded Signup postMessage — verify against current Meta docs. */
export const META_EMBEDDED_SIGNUP_ORIGINS = [
  'https://www.facebook.com',
  'https://web.facebook.com',
  'https://business.facebook.com',
] as const;

export type EmbeddedSignupDispatch =
  | { kind: 'finish'; code: string; wabaId?: string }
  | { kind: 'finish_coexistence'; code: string; wabaId?: string }
  | { kind: 'cancel' }
  | { kind: 'error'; errorMessage: string };

function parseDataObject(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

function pickCode(
  data: Record<string, unknown>,
  root: Record<string, unknown>
): string | undefined {
  const nested = parseDataObject(data['data']);
  const c =
    data['code'] ??
    data['authorization_code'] ??
    nested?.['code'] ??
    nested?.['authorization_code'] ??
    root['code'];
  return c != null && String(c).trim() ? String(c).trim() : undefined;
}

function pickWaba(data: Record<string, unknown>): string | undefined {
  const nested = parseDataObject(data['data']);
  const w =
    data['waba_id'] ??
    data['wabaId'] ??
    nested?.['waba_id'] ??
    nested?.['wabaId'];
  return w != null && String(w).trim() ? String(w).trim() : undefined;
}

/**
 * Listens for Meta Embedded Signup `postMessage` events (`WA_EMBEDDED_SIGNUP`).
 * @returns teardown function to remove the listener.
 */
@Injectable({ providedIn: 'root' })
export class WhatsappEmbeddedSignupService {
  subscribe(handler: (evt: EmbeddedSignupDispatch) => void): () => void {
    const onMessage = (event: MessageEvent) => {
      const allowed = META_EMBEDDED_SIGNUP_ORIGINS as readonly string[];
      if (!allowed.includes(event.origin)) {
        return;
      }

      let raw: unknown = event.data;
      if (typeof raw === 'string') {
        try {
          raw = JSON.parse(raw) as unknown;
        } catch {
          return;
        }
      }

      const root = parseDataObject(raw);
      if (!root) return;

      const type = String(root['type'] ?? '');
      if (type !== 'WA_EMBEDDED_SIGNUP') return;

      const ev = String(root['event'] ?? root['action'] ?? '');
      const data = parseDataObject(root['data']) ?? {};

      switch (ev) {
        case 'FINISH': {
          const code = pickCode(data, root);
          if (!code) return;
          const wabaId = pickWaba(data);
          handler({
            kind: 'finish',
            code,
            ...(wabaId ? { wabaId } : {}),
          });
          return;
        }
        case 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING': {
          const code = pickCode(data, root);
          if (!code) return;
          const wabaId = pickWaba(data);
          handler({
            kind: 'finish_coexistence',
            code,
            ...(wabaId ? { wabaId } : {}),
          });
          return;
        }
        case 'CANCEL':
          handler({ kind: 'cancel' });
          return;
        case 'ERROR': {
          const msg = String(
            data['error_message'] ??
              data['message'] ??
              root['error_message'] ??
              'Embedded Signup error'
          );
          handler({ kind: 'error', errorMessage: msg });
          return;
        }
        default:
          return;
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }
}
