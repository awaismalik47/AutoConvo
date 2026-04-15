import {
  Component,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import type {
  Template,
  TemplateCategory,
  TemplateExample,
} from '../../../core/models';
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
  readonly examples = signal<TemplateExample[]>([]);
  readonly modalOpen = signal(false);
  readonly saving = signal(false);
  readonly syncing = signal(false);
  /** When set, create uses these components (BODY text synced from form). */
  private readonly activeExampleComponents = signal<unknown[] | null>(null);

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
    forkJoin({
      list: this.api.getTemplates().pipe(catchError(() => of([] as Template[]))),
      examples: this.api
        .getTemplateExamples()
        .pipe(catchError(() => of([] as TemplateExample[]))),
    }).subscribe(({ list, examples }) => {
      this.rows.set(list);
      this.examples.set(examples);
      this.loading.set(false);
    });
  }

  openModal(): void {
    this.activeExampleComponents.set(null);
    this.form.reset({
      name: '',
      category: 'UTILITY',
      language: 'en',
      body: '',
    });
    this.modalOpen.set(true);
  }

  /** Prefill create form from a server example (full components for POST). */
  useExample(ex: TemplateExample): void {
    this.activeExampleComponents.set(
      JSON.parse(JSON.stringify(ex.components)) as unknown[]
    );
    this.form.reset({
      name: ex.suggestedName,
      category: ex.category,
      language: ex.language,
      body: this.extractBodyFromComponents(ex.components),
    });
    this.modalOpen.set(true);
  }

  private extractBodyFromComponents(components: unknown[]): string {
    for (const c of components) {
      if (c && typeof c === 'object') {
        const o = c as Record<string, unknown>;
        if (String(o['type'] ?? '').toUpperCase() === 'BODY') {
          return String(o['text'] ?? '');
        }
      }
    }
    return '';
  }

  private patchBodyInComponents(
    components: unknown[],
    body: string
  ): unknown[] {
    const arr = JSON.parse(JSON.stringify(components)) as Record<
      string,
      unknown
    >[];
    let found = false;
    for (const c of arr) {
      if (String(c['type'] ?? '').toUpperCase() === 'BODY') {
        c['text'] = body;
        found = true;
        break;
      }
    }
    if (!found) arr.unshift({ type: 'BODY', text: body });
    return arr;
  }

  closeModal(): void {
    this.activeExampleComponents.set(null);
    this.modalOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.modalOpen()) this.closeModal();
  }

  /** GET /templates/sync — refresh approved list from Meta. */
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
          this.toast.success('Templates refreshed from Meta');
          this.reload();
        }
      });
  }

  create(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const fromExample = this.activeExampleComponents();
    const components = fromExample
      ? this.patchBodyInComponents(fromExample, v.body)
      : [{ type: 'BODY', text: v.body }];

    this.saving.set(true);
    this.api
      .createTemplate({
        name: v.name.trim(),
        category: v.category,
        language: v.language.trim() || undefined,
        components,
      })
      .pipe(
        catchError((err) => {
          this.toast.error(err?.error?.message || 'Could not create');
          return of(null);
        }),
        finalize(() => this.saving.set(false))
      )
      .subscribe((res) => {
        if (res) {
          this.toast.success(res.message || 'Template submitted');
          this.activeExampleComponents.set(null);
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
