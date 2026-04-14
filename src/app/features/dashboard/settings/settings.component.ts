import { Component, inject, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import type { MetaStatus, WhatsappConnectionMode } from '../../../core/models';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [TitleCasePipe, RouterLink],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);

  readonly metaLoading = signal(true);
  readonly metaStatus = signal<MetaStatus | null>(null);

  constructor() {
    this.api
      .getMetaStatus()
      .pipe(catchError(() => of(null)))
      .subscribe((st) => {
        this.metaStatus.set(st);
        this.metaLoading.set(false);
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

  waConnected(st: MetaStatus): boolean {
    return (
      st.connected === true ||
      String(st.status ?? '').toLowerCase() === 'connected'
    );
  }
}
