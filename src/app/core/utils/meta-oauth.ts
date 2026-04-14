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

/** Use state from `GET /api/v1/meta/oauth/state` so it matches server-side OAuth expectations. */
export function persistMetaOAuthState(state: string): void {
  try {
    sessionStorage.setItem(STATE_KEY, state);
  } catch {
    /* ignore */
  }
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
 * Exact `redirect_uri` used in the OAuth dialog and **must** be sent again unchanged when
 * exchanging `code` for an access token (`POST /meta/connect` on your API). Any mismatch
 * causes Meta’s “redirect_uri is identical to the one you used in the OAuth dialog” error.
 */
export function getMetaOAuthRedirectUri(): string {
  const base = environment.frontendUrl.replace(/\/$/, '');
  return `${base}/`;
}

/**
 * Facebook Login URL — redirect URI is **site root** (`{frontendUrl}/`) so static hosts
 * always serve `index.html` (no `/whatsapp` file → 404 on Render without a rewrite).
 * After load, the app forwards `?code=&state=` to `/whatsapp` client-side.
 * Register **exactly** this URI in Meta: `https://your-domain.com/` (trailing slash as built below).
 *
 * @param options.state — If set (e.g. from `GET /meta/oauth/state`), used instead of a random client state.
 */
export function buildMetaOAuthAuthorizeUrl(options?: {
  state?: string | null;
}): string | null {
  const appId = environment.metaAppId?.trim();
  if (!appId) return null;

  const redirectUri = getMetaOAuthRedirectUri();
  const serverState = options?.state?.trim();
  const state =
    serverState && serverState.length > 0
      ? (persistMetaOAuthState(serverState), serverState)
      : storeMetaOAuthState();
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
    scope: environment.metaOAuthScopes,
  });

  return `https://www.facebook.com/${environment.metaGraphVersion}/dialog/oauth?${params.toString()}`;
}
