import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';
import type {
  MetaConnectBody,
  MetaConnectResponse,
  MetaIntegration,
  MetaPhoneInfo,
  MetaStatus,
  WAConnection,
  WhatsappConnectionMode,
} from '../../../core/models';
import { SkeletonCardComponent } from '../../../shared/components/skeleton/skeleton-card.component';
import {
  buildMetaOAuthAuthorizeUrl,
  getMetaOAuthRedirectUri,
  validateMetaOAuthState,
} from '../../../core/utils/meta-oauth';
import { getApiErrorMessage } from '../../../core/utils/api-error';
import type { EmbeddedSignupDispatch } from '../../../core/services/whatsapp-embedded-signup.service';
import { WhatsappEmbeddedSignupService } from '../../../core/services/whatsapp-embedded-signup.service';

/** Meta docs — coexistence / Embedded Signup (verify periodically). */
export const META_WHATSAPP_COEXISTENCE_HELP_URL =
  'https://developers.facebook.com/docs/whatsapp/embedded-signup';

@Component({
  selector: 'app-whatsapp',
  standalone: true,
  imports: [FormsModule, SkeletonCardComponent],
  templateUrl: './whatsapp.component.html',
  styleUrl: './whatsapp.component.scss',
})
export class WhatsappComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly embeddedSignup = inject(WhatsappEmbeddedSignupService);

  readonly loading = signal(true);
  readonly conn = signal<WAConnection | null>(null);
  readonly codeInput = signal('');
  readonly submitting = signal(false);

  /** Meta “Valid OAuth redirect URIs” must include this exact URL (site root, trailing slash). */
  readonly redirectUriHint = getMetaOAuthRedirectUri();
  readonly coexistenceHelpUrl = META_WHATSAPP_COEXISTENCE_HELP_URL;

  constructor() {
    const stopEmbedded = this.embeddedSignup.subscribe((evt) =>
      this.onEmbeddedSignup(evt)
    );
    this.destroyRef.onDestroy(() => stopEmbedded());

    const qp = this.route.snapshot.queryParamMap;
    const metaOk = qp.get('meta_connected');
    const metaErr = qp.get('meta_error');

    if (metaOk === '1' || metaOk === 'true') {
      void this.router.navigate(['/whatsapp'], {
        replaceUrl: true,
        queryParams: {},
      });
      this.loading.set(false);
      this.toast.success('WhatsApp connected');
      this.refresh();
      return;
    }
    if (metaErr != null && metaErr.length > 0) {
      void this.router.navigate(['/whatsapp'], {
        replaceUrl: true,
        queryParams: {},
      });
      this.loading.set(false);
      this.toast.error(
        decodeURIComponent(metaErr.replace(/\+/g, ' '))
      );
      this.refresh();
      return;
    }

    const code = qp.get('code');
    const state = qp.get('state');

    if (code) {
      if (!validateMetaOAuthState(state)) {
        this.toast.error(
          'Could not verify the Meta login. Click Connect WhatsApp and try again.'
        );
        void this.router.navigate(['/whatsapp'], { replaceUrl: true });
        this.refresh();
        return;
      }
      this.loading.set(false);
      void this.router.navigate(['/whatsapp'], {
        replaceUrl: true,
        queryParams: {},
      });
      this.connectWithCode(code, false);
      return;
    }

    this.refresh();
  }

  private onEmbeddedSignup(evt: EmbeddedSignupDispatch): void {
    switch (evt.kind) {
      case 'cancel':
        this.toast.info('WhatsApp setup was cancelled.');
        return;
      case 'error':
        this.toast.error(evt.errorMessage);
        return;
      case 'finish':
        // Backend rejects connectionMode: 'standard' — omit; optional wabaId when Meta sends it.
        this.connectWithPayload({
          code: evt.code,
          redirectUri: getMetaOAuthRedirectUri(),
          ...(evt.wabaId ? { wabaId: evt.wabaId } : {}),
        });
        return;
      case 'finish_coexistence':
        this.connectWithPayload({
          code: evt.code,
          redirectUri: getMetaOAuthRedirectUri(),
          connectionMode: 'coexistence',
          ...(evt.wabaId ? { wabaId: evt.wabaId } : {}),
        });
        return;
      default:
        return;
    }
  }

  refresh(): void {
    this.loading.set(true);
    forkJoin({
      st: this.api.getMetaStatus().pipe(catchError(() => of(null))),
      ph: this.api.getMetaPhoneInfo().pipe(catchError(() => of(null))),
    }).subscribe(({ st, ph }) => {
      this.conn.set(this.mapConnection(st, ph));
      this.loading.set(false);
    });
  }

  /**
   * GET /meta/status: `coexistence.syncDeadlineAt` etc. are nested under `coexistence` (camelCase).
   * Falls back to top-level fields if the nested object is absent (older responses).
   */
  private readCoexistenceSyncFields(
    st: MetaStatus | null
  ): Pick<
    WAConnection,
    'syncDeadlineAt' | 'contactsSyncAt' | 'historySyncAt'
  > {
    if (!st) return {};
    const r = st as Record<string, unknown>;
    const cx = r['coexistence'];
    const block =
      cx && typeof cx === 'object' && !Array.isArray(cx)
        ? (cx as Record<string, unknown>)
        : null;
    const pick = (obj: Record<string, unknown>, keys: string[]): string | undefined => {
      for (const k of keys) {
        const v = obj[k];
        if (typeof v === 'string' && v.trim()) return v;
      }
      return undefined;
    };
    if (block) {
      return {
        syncDeadlineAt: pick(block, ['syncDeadlineAt']),
        contactsSyncAt: pick(block, ['contactsSyncAt']),
        historySyncAt: pick(block, ['historySyncAt']),
      };
    }
    return {
      syncDeadlineAt: pick(r, ['syncDeadlineAt', 'sync_deadline_at']),
      contactsSyncAt: pick(r, ['contactsSyncAt', 'contacts_sync_at']),
      historySyncAt: pick(r, ['historySyncAt', 'history_sync_at']),
    };
  }

  private mapConnection(
    st: MetaStatus | null,
    ph: MetaPhoneInfo | null
  ): WAConnection | null {
    const connected =
      st?.connected === true ||
      String(st?.status ?? '').toLowerCase() === 'connected';
    if (!connected) return null;

    const integ = st?.integration as MetaIntegration | undefined;
    const mode = st?.connectionMode as WhatsappConnectionMode | undefined;
    const policy =
      typeof integ?.policy === 'string' ? integ.policy : undefined;
    const sync = this.readCoexistenceSyncFields(st);
    const base: WAConnection = {
      status: 'connected',
      connectionMode: mode,
      coexistence: integ?.coexistence === true,
      integrationSummary:
        typeof integ?.summary === 'string' ? integ.summary : undefined,
      integrationPolicy: policy,
      ...sync,
    };

    const platformRaw = ph?.platformType ?? ph?.platform_type;
    const platformType =
      typeof platformRaw === 'string' && platformRaw.trim()
        ? platformRaw.trim()
        : undefined;
    const isOnBizApp =
      ph?.isOnBizApp === true || ph?.is_on_biz_app === true;

    const stWaba =
      st?.wabaId != null && String(st.wabaId).trim()
        ? String(st.wabaId).trim()
        : undefined;

    const wabaFromPhone = (
      wabaId?: string,
      waba_id?: string
    ): string | undefined => {
      const v = wabaId ?? waba_id;
      return v != null && String(v).trim() ? String(v).trim() : undefined;
    };

    if (ph) {
      return {
        ...base,
        displayName: String(ph.displayName ?? ph.display_name ?? ''),
        displayNumber: String(
          ph.displayNumber ?? ph.display_number ?? st?.phoneNumber ?? ''
        ),
        phoneNumberId: String(ph.phoneNumberId ?? ph.phone_number_id ?? ''),
        wabaId: wabaFromPhone(ph.wabaId, ph.waba_id) ?? stWaba,
        isOnBizApp,
        platformType,
      };
    }

    return {
      ...base,
      displayName: String(st?.displayName ?? st?.display_name ?? ''),
      displayNumber: String(
        st?.phoneNumber ?? st?.displayNumber ?? st?.display_number ?? ''
      ),
      wabaId: stWaba,
    };
  }

  /**
   * Primary connect entry point.
   * If a config ID is set, launches the FB JS SDK Embedded Signup popup.
   * Falls back to a full-page OAuth redirect when the SDK is unavailable.
   */
  startConnect(): void {
    const configId = environment.metaEmbeddedSignupConfigId?.trim();
    if (configId) {
      this.launchEmbeddedSignup(configId);
    } else {
      this.startOAuthRedirect();
    }
  }

  /** Loads the FB JS SDK (once) then opens the Embedded Signup popup with the given config. */
  private launchEmbeddedSignup(configId: string): void {
    this.loadFbSdk()
      .then(() => {
        const fb = (window as unknown as Record<string, unknown>)['FB'] as
          | { login: (cb: () => void, opts: unknown) => void }
          | undefined;
        if (!fb) {
          this.startOAuthRedirect();
          return;
        }
        fb.login(
          () => {
            // Result handled via postMessage in WhatsappEmbeddedSignupService
          },
          {
            config_id: configId,
            response_type: 'code',
            override_default_response_type: true,
            extras: {
              setup: {},
              featureType: '',
              sessionInfoVersion: '3',
            },
          }
        );
      })
      .catch(() => this.startOAuthRedirect());
  }

  /**
   * Lazily loads the Facebook JS SDK and initializes it with this app's ID.
   * Resolves immediately if the SDK is already present on the page.
   * Caches the in-flight Promise so concurrent calls share one load.
   */
  private fbSdkReady: Promise<void> | null = null;

  private loadFbSdk(): Promise<void> {
    const w = window as unknown as Record<string, unknown>;
    if (w['FB']) return Promise.resolve();
    if (this.fbSdkReady) return this.fbSdkReady;

    this.fbSdkReady = new Promise<void>((resolve) => {
      w['fbAsyncInit'] = () => {
        ((window as unknown as Record<string, unknown>)['FB'] as { init: (opts: object) => void }).init({
          appId: environment.metaAppId,
          autoLogAppEvents: true,
          xfbml: false,
          version: environment.metaGraphVersion,
        });
        resolve();
      };
      const script = document.createElement('script');
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    });

    return this.fbSdkReady;
  }

  /** Full-page OAuth redirect fallback (original flow). */
  private startOAuthRedirect(): void {
    this.api.getMetaOAuthState().subscribe({
      next: ({ state }) => {
        const url = buildMetaOAuthAuthorizeUrl({ state });
        if (!url) {
          this.toast.error(
            'Set metaAppId in environment and whitelist the redirect URI in your Meta app.'
          );
          return;
        }
        window.location.href = url;
      },
      error: () => {
        const url = buildMetaOAuthAuthorizeUrl();
        if (!url) {
          this.toast.error(
            'Set metaAppId in environment and whitelist the redirect URI in your Meta app.'
          );
          return;
        }
        window.location.href = url;
      },
    });
  }

  submitCode(): void {
    const code = this.codeInput().trim();
    if (!code || this.submitting()) return;
    this.connectWithCode(code, true);
  }

  private connectWithCode(code: string, clearInput: boolean): void {
    this.connectWithPayload(
      {
        code,
        redirectUri: getMetaOAuthRedirectUri(),
      },
      clearInput
    );
  }

  private applyCoexistenceSyncWarnings(res: MetaConnectResponse): void {
    const cs = res.coexistenceSync;
    if (!cs) return;
    const lines: string[] = [];
    if (cs.contacts?.ok === false) {
      lines.push(
        `Contacts sync did not finish${
          cs.contacts.error ? `: ${cs.contacts.error}` : ''
        }`
      );
    }
    if (cs.history?.ok === false) {
      lines.push(
        `History sync did not finish${
          cs.history.error ? `: ${cs.history.error}` : ''
        }`
      );
    }
    if (lines.length) {
      this.toast.warning(
        'Connected, but some coexistence steps failed. ' + lines.join(' ')
      );
    }
  }

  private connectWithPayload(body: MetaConnectBody, clearInput = false): void {
    if (this.submitting()) return;
    this.submitting.set(true);
    this.api
      .metaConnect(body)
      .pipe(
        catchError((err) => {
          this.toast.error(getApiErrorMessage(err, 'Connection failed'));
          return of(null);
        }),
        finalize(() => this.submitting.set(false))
      )
      .subscribe((res) => {
        if (res == null) return;
        const msg =
          typeof res.message === 'string' && res.message.trim()
            ? res.message.trim()
            : 'WhatsApp connected';
        this.toast.success(msg);
        this.applyCoexistenceSyncWarnings(res);
        if (clearInput) this.codeInput.set('');
        this.refresh();
      });
  }

  connectionModeLabel(
    mode?: WhatsappConnectionMode,
    integrationPolicy?: string
  ): string {
    if (mode === 'coexistence') return 'Coexistence';
    if (mode === 'standard') return 'Standard (legacy)';
    if (integrationPolicy === 'coexistence_only') return 'Coexistence';
    return '—';
  }

  disconnect(): void {
    this.api.metaDisconnect().subscribe({
      next: () => {
        this.conn.set(null);
        this.toast.success('Disconnected');
        this.refresh();
      },
      error: () => this.toast.error('Could not disconnect'),
    });
  }
}
