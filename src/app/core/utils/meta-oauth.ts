import { environment } from '../../../environments/environment';

const STATE_KEY = 'ac_meta_oauth_state';

function randomState(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Call before redirecting to Meta — value must match `state` on return. */
export function storeMetaOAuthState(): string {
  const s = randomState();
  try {
    sessionStorage.setItem(STATE_KEY, s);
  } catch {
    /* ignore */
  }
  return s;
}

/** Validates `state` from the OAuth redirect and clears stored value. */
export function validateMetaOAuthState(returned: string | null): boolean {
  if (!returned) return false;
  let expected: string | null = null;
  try {
    expected = sessionStorage.getItem(STATE_KEY);
    sessionStorage.removeItem(STATE_KEY);
  } catch {
    return false;
  }
  return !!expected && expected === returned;
}

/**
 * Facebook Login URL that returns an authorization `code` to
 * `{frontendUrl}/whatsapp?code=…&state=…`. Register that redirect URI in the Meta app.
 */
export function buildMetaOAuthAuthorizeUrl(): string | null {
  const appId = environment.metaAppId?.trim();
  if (!appId) return null;

  const redirectUri = `${environment.frontendUrl.replace(/\/$/, '')}/whatsapp`;
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state: storeMetaOAuthState(),
    scope: environment.metaOAuthScopes,
  });

  return `https://www.facebook.com/${environment.metaGraphVersion}/dialog/oauth?${params.toString()}`;
}
