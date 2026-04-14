import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import type {
  MetaConnectBody,
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

    const code = this.route.snapshot.queryParamMap.get('code');
    const state = this.route.snapshot.queryParamMap.get('state');

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
        this.connectWithPayload({
          code: evt.code,
          redirectUri: getMetaOAuthRedirectUri(),
          connectionMode: 'standard',
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
    const base: WAConnection = {
      status: 'connected',
      connectionMode: mode,
      coexistence: integ?.coexistence === true,
      integrationSummary:
        typeof integ?.summary === 'string' ? integ.summary : undefined,
    };

    if (ph) {
      return {
        ...base,
        displayName: String(ph.displayName ?? ph.display_name ?? ''),
        displayNumber: String(ph.displayNumber ?? ph.display_number ?? ''),
        phoneNumberId: String(ph.phoneNumberId ?? ph.phone_number_id ?? ''),
        wabaId: String(ph.wabaId ?? ph.waba_id ?? ''),
      };
    }

    return {
      ...base,
      displayName: String(st?.displayName ?? st?.display_name ?? ''),
      displayNumber: String(st?.displayNumber ?? st?.display_number ?? ''),
    };
  }

  /** Opens Meta OAuth; fetches `state` from API first, then Meta redirects with ?code=… */
  startConnect(): void {
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
        if (res != null) {
          this.toast.success('WhatsApp connected');
          if (clearInput) this.codeInput.set('');
          this.refresh();
        }
      });
  }

  connectionModeLabel(mode?: WhatsappConnectionMode): string {
    if (mode === 'coexistence') return 'Coexistence';
    if (mode === 'standard') return 'Standard';
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
