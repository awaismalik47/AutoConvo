import { DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import type { Broadcast, Template } from '../../../core/models';
import { SkeletonTableComponent } from '../../../shared/components/skeleton/skeleton-table.component';

@Component({
  selector: 'app-broadcast',
  standalone: true,
  imports: [ReactiveFormsModule, SkeletonTableComponent, DecimalPipe],
  templateUrl: './broadcast.component.html',
  styleUrl: './broadcast.component.scss',
})
export class BroadcastComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly rows = signal<Broadcast[]>([]);
  readonly templates = signal<Template[]>([]);
  readonly modalOpen = signal(false);
  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    templateId: ['', Validators.required],
    scheduledAt: [''],
  });

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    forkJoin({
      list: this.api.getBroadcasts().pipe(catchError(() => of([] as Broadcast[]))),
      tpl: this.api.getTemplates().pipe(catchError(() => of([] as Template[]))),
    }).subscribe(({ list, tpl }) => {
      this.rows.set(list);
      this.templates.set(tpl);
      this.loading.set(false);
    });
  }

  openModal(): void {
    this.form.reset({ name: '', templateId: '', scheduledAt: '' });
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  create(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.api
      .createBroadcast({
        name: v.name,
        templateId: v.templateId,
        scheduledAt: v.scheduledAt || undefined,
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
          this.toast.success('Campaign created');
          this.closeModal();
          this.reload();
        }
      });
  }

  cancel(id: string): void {
    this.api.cancelBroadcast(id).subscribe({
      next: () => {
        this.toast.success('Cancelled');
        this.reload();
      },
      error: () => this.toast.error('Could not cancel'),
    });
  }

  statusClass(s: Broadcast['status']): string {
    const map: Record<Broadcast['status'], string> = {
      draft: 'st-draft',
      scheduled: 'st-scheduled',
      running: 'st-running',
      completed: 'st-done',
      failed: 'st-fail',
    };
    return map[s] ?? '';
  }
}
