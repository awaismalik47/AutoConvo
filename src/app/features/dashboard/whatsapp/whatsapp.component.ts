import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import type { WAConnection } from '../../../core/models';
import { SkeletonCardComponent } from '../../../shared/components/skeleton/skeleton-card.component';
import {
  buildMetaOAuthAuthorizeUrl,
  validateMetaOAuthState,
} from '../../../core/utils/meta-oauth';
import { environment } from '../../../../environments/environment';

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

  readonly loading = signal(true);
  readonly conn = signal<WAConnection | null>(null);
  readonly codeInput = signal('');
  readonly submitting = signal(false);

  /** Shown so you can whitelist the same URI in Meta Developer → Facebook Login → Valid OAuth redirect URIs. */
  readonly redirectUriHint = `${environment.frontendUrl.replace(/\/$/, '')}/whatsapp`;

  constructor() {
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

  refresh(): void {
    this.loading.set(true);
    forkJoin({
      st: this.api.getMetaStatus().pipe(catchError(() => of(null))),
      ph: this.api.getMetaPhoneInfo().pipe(catchError(() => of(null))),
    }).subscribe(({ st, ph }) => {
      const connected =
        st?.connected === true ||
        String(st?.status ?? '').toLowerCase() === 'connected';
      if (connected && ph) {
        this.conn.set({
          status: 'connected',
          displayName: String(ph.displayName ?? ph.display_name ?? ''),
          displayNumber: String(ph.displayNumber ?? ph.display_number ?? ''),
          phoneNumberId: String(ph.phoneNumberId ?? ph.phone_number_id ?? ''),
          wabaId: String(ph.wabaId ?? ph.waba_id ?? ''),
        });
      } else if (connected) {
        this.conn.set({
          status: 'connected',
          displayName: String(st?.displayName ?? st?.display_name ?? ''),
          displayNumber: String(st?.displayNumber ?? st?.display_number ?? ''),
        });
      } else {
        this.conn.set(null);
      }
      this.loading.set(false);
    });
  }

  /** Opens Meta OAuth; after login Meta redirects here with ?code=… */
  startConnect(): void {
    const url = buildMetaOAuthAuthorizeUrl();
    if (!url) {
      this.toast.error(
        'Set metaAppId in environment and whitelist the redirect URI in your Meta app.'
      );
      return;
    }
    window.location.href = url;
  }

  submitCode(): void {
    const code = this.codeInput().trim();
    if (!code || this.submitting()) return;
    this.connectWithCode(code, true);
  }

  private connectWithCode(code: string, clearInput: boolean): void {
    if (this.submitting()) return;
    this.submitting.set(true);
    this.api
      .metaConnect({ code })
      .pipe(
        catchError((err) => {
          this.toast.error(err?.error?.message || 'Connection failed');
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
