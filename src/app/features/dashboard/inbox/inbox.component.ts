import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, of, switchMap } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import type { Conversation, Message } from '../../../core/models';
import { TimeagoPipe } from '../../../shared/pipes/pipes';
import { TruncatePipe } from '../../../shared/pipes/pipes';
import { SkeletonRowComponent } from '../../../shared/components/skeleton/skeleton-row.component';

@Component({
  selector: 'app-inbox',
  standalone: true,
  imports: [FormsModule, TimeagoPipe, TruncatePipe, SkeletonRowComponent],
  templateUrl: './inbox.component.html',
  styleUrl: './inbox.component.scss',
})
export class InboxComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly loadingList = signal(true);
  readonly loadingMessages = signal(false);
  readonly conversations = signal<Conversation[]>([]);
  /** E.164 or API “to” phone for thread + send */
  readonly selectedPhone = signal<string | null>(null);
  readonly messages = signal<Message[]>([]);
  readonly draft = signal('');

  constructor() {
    this.api
      .getMessageConversations()
      .pipe(catchError(() => of([] as Conversation[])))
      .subscribe((rows) => {
        this.conversations.set(rows);
        this.loadingList.set(false);
        const first = rows[0];
        const phone = first?.phone ?? first?.contactPhone ?? null;
        if (phone && !this.selectedPhone()) {
          this.selectPhone(phone);
        }
      });
  }

  convKey(c: Conversation): string {
    return c.phone ?? c.contactPhone ?? c.id ?? '';
  }

  selectPhone(phone: string): void {
    if (!phone) return;
    this.selectedPhone.set(phone);
    this.loadingMessages.set(true);
    this.messages.set([]);
    this.api
      .getMessageThread(phone, 1, 80)
      .pipe(catchError(() => of([] as Message[])))
      .subscribe((msgs) => {
        this.messages.set(msgs);
        this.loadingMessages.set(false);
      });
  }

  send(): void {
    const phone = this.selectedPhone();
    const text = this.draft().trim();
    if (!phone || !text) return;
    this.api
      .sendTextMessage({ to: phone, text })
      .pipe(
        switchMap(() => this.api.getMessageThread(phone, 1, 80)),
        catchError((err) => {
          this.toast.error(err?.error?.message || 'Could not send');
          return of(null);
        })
      )
      .subscribe((msgs) => {
        if (msgs) {
          this.messages.set(msgs);
          this.draft.set('');
          this.toast.success('Sent');
        }
      });
  }
}
