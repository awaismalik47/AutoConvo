import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { catchError, debounceTime, distinctUntilChanged, of } from 'rxjs';
import { DecimalPipe } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import type { Contact, ContactsPage } from '../../../core/models';
import { TimeagoPipe } from '../../../shared/pipes/pipes';
import { SkeletonTableComponent } from '../../../shared/components/skeleton/skeleton-table.component';

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe, TimeagoPipe, SkeletonTableComponent],
  templateUrl: './contacts.component.html',
  styleUrl: './contacts.component.scss',
})
export class ContactsComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly page = signal<ContactsPage | null>(null);
  readonly pageIndex = signal(1);
  readonly limit = 15;

  readonly searchForm = this.fb.nonNullable.group({ q: [''] });

  constructor() {
    this.load(this.pageIndex());
    this.searchForm.controls.q.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.pageIndex.set(1);
        this.load(1);
      });
  }

  load(p: number): void {
    this.loading.set(true);
    const q = this.searchForm.controls.q.value.trim();
    this.api
      .getContacts(p, this.limit, q)
      .pipe(catchError(() => of({ data: [], total: 0, page: 1, limit: this.limit })))
      .subscribe((res) => {
        this.page.set(res);
        this.loading.set(false);
      });
  }

  next(): void {
    const pg = this.page();
    if (!pg) return;
    const maxPage = Math.max(1, Math.ceil(pg.total / pg.limit));
    if (pg.page < maxPage) {
      const n = pg.page + 1;
      this.pageIndex.set(n);
      this.load(n);
    }
  }

  prev(): void {
    const pg = this.page();
    if (!pg || pg.page <= 1) return;
    const n = pg.page - 1;
    this.pageIndex.set(n);
    this.load(n);
  }

  onFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.api.importContacts(file).subscribe({
      next: (r) => {
        this.toast.success(`Imported ${r.imported} contacts`);
        this.load(this.pageIndex());
        input.value = '';
      },
      error: () => this.toast.error('Import failed'),
    });
  }

  remove(c: Contact): void {
    this.api.deleteContact(c.id).subscribe({
      next: () => {
        this.toast.success('Deleted');
        this.load(this.pageIndex());
      },
      error: () => this.toast.error('Could not delete'),
    });
  }

  sliceStart(pg: ContactsPage): number {
    return (pg.page - 1) * pg.limit + 1;
  }

  sliceEnd(pg: ContactsPage): number {
    return Math.min(pg.page * pg.limit, pg.total);
  }

  maxPage(pg: ContactsPage): number {
    return Math.max(1, Math.ceil(pg.total / pg.limit));
  }
}
