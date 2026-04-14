import {
  Component,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import type { Template, TemplateCategory } from '../../../core/models';
import { TruncatePipe } from '../../../shared/pipes/pipes';
import { SkeletonTableComponent } from '../../../shared/components/skeleton/skeleton-table.component';

@Component({
  selector: 'app-templates',
  standalone: true,
  imports: [ReactiveFormsModule, TruncatePipe, SkeletonTableComponent],
  templateUrl: './templates.component.html',
  styleUrl: './templates.component.scss',
})
export class TemplatesComponent {
  readonly bodyPlaceholder = 'Hi {{1}}, your order is ready.';

  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly rows = signal<Template[]>([]);
  readonly modalOpen = signal(false);
  readonly saving = signal(false);
  readonly syncing = signal(false);

  readonly categories: TemplateCategory[] = [
    'MARKETING',
    'UTILITY',
    'AUTHENTICATION',
  ];

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    category: ['UTILITY' as TemplateCategory, Validators.required],
    language: ['en', Validators.required],
    body: ['', [Validators.required, Validators.minLength(3)]],
  });

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.api
      .getTemplates()
      .pipe(catchError(() => of([] as Template[])))
      .subscribe((list) => {
        this.rows.set(list);
        this.loading.set(false);
      });
  }

  openModal(): void {
    this.form.reset({
      name: '',
      category: 'UTILITY',
      language: 'en',
      body: '',
    });
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.modalOpen()) this.closeModal();
  }

  /** Pulls approved templates from Meta into this app (primary workflow for many WABAs). */
  syncFromWhatsApp(): void {
    if (this.syncing()) return;
    this.syncing.set(true);
    this.api
      .syncTemplates()
      .pipe(
        catchError((err) => {
          this.toast.error(err?.error?.message || 'Sync failed');
          return of(null);
        }),
        finalize(() => this.syncing.set(false))
      )
      .subscribe((res) => {
        if (res !== null) {
          this.toast.success('Templates synced');
          this.reload();
        }
      });
  }

  create(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.api
      .createTemplate(this.form.getRawValue())
      .pipe(
        catchError((err) => {
          this.toast.error(err?.error?.message || 'Could not create');
          return of(null);
        }),
        finalize(() => this.saving.set(false))
      )
      .subscribe((res) => {
        if (res) {
          this.toast.success('Template submitted');
          this.closeModal();
          this.reload();
        }
      });
  }

  remove(id: string): void {
    this.api.deleteTemplate(id).subscribe({
      next: () => {
        this.toast.success('Removed');
        this.reload();
      },
      error: () => this.toast.error('Could not delete'),
    });
  }

  statusClass(s: Template['status']): string {
    return s === 'approved'
      ? 'pill--ok'
      : s === 'pending'
        ? 'pill--pending'
        : 'pill--bad';
  }
}
