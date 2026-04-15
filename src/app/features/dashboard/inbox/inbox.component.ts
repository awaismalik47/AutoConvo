import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, finalize, forkJoin, of, switchMap } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { FALLBACK_WHATSAPP_TEMPLATE_PRESETS } from '../../../core/constants/default-whatsapp-templates';
import { getApiErrorMessage } from '../../../core/utils/api-error';
import type {
  Conversation,
  Message,
  Template,
  WhatsAppTemplatePreset,
} from '../../../core/models';
import { TimeagoPipe } from '../../../shared/pipes/pipes';
import { TruncatePipe } from '../../../shared/pipes/pipes';
import { SkeletonRowComponent } from '../../../shared/components/skeleton/skeleton-row.component';

/** Digits only, for WhatsApp `to` (E.164 without +). */
function normalizeWaTo(value: string): string {
  return String(value ?? '').replace(/\D/g, '');
}

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
  readonly loadingTemplates = signal(true);
  readonly conversations = signal<Conversation[]>([]);
  readonly templates = signal<Template[]>([]);
  /** API defaults or {@link FALLBACK_WHATSAPP_TEMPLATE_PRESETS} — quick-pick chips. */
  readonly templatePresets = signal<WhatsAppTemplatePreset[]>([]);
  /** E.164 digits for thread + send */
  readonly selectedPhone = signal<string | null>(null);
  readonly messages = signal<Message[]>([]);
  readonly draft = signal('');

  /** True → main panel shows “first contact” template composer (Meta HSM). */
  readonly newMessageMode = signal(false);
  readonly newPhone = signal('');
  readonly templateName = signal('');
  readonly templateLang = signal('en');
  /** Optional JSON array for template components; empty → []. */
  readonly templateComponentsJson = signal('');
  readonly sendingTemplate = signal(false);
  readonly sendingText = signal(false);

  constructor() {
    forkJoin({
      tpl: this.api
        .getTemplatesApproved()
        .pipe(catchError(() => of([] as Template[]))),
      defaults: this.api
        .getMessageTemplateDefaults()
        .pipe(catchError(() => of([] as WhatsAppTemplatePreset[]))),
    }).subscribe(({ tpl, defaults }) => {
      this.templates.set(tpl);
      const presets =
        defaults.length > 0 ? defaults : FALLBACK_WHATSAPP_TEMPLATE_PRESETS;
      this.templatePresets.set(presets);
      this.loadingTemplates.set(false);
    });

    this.api
      .getMessageConversations()
      .pipe(catchError(() => of([] as Conversation[])))
      .subscribe((rows) => {
        this.conversations.set(rows);
        this.loadingList.set(false);
        if (rows.length === 0) {
          this.newMessageMode.set(true);
          return;
        }
        const first = rows[0];
        const phone = first?.phone ?? first?.contactPhone ?? null;
        if (phone) {
          this.selectPhone(phone);
        }
      });
  }

  convKey(c: Conversation): string {
    return c.phone ?? c.contactPhone ?? c.id ?? '';
  }

  openNewMessage(): void {
    this.selectedPhone.set(null);
    this.messages.set([]);
    this.newMessageMode.set(true);
  }

  selectPhone(phone: string): void {
    if (!phone) return;
    this.newMessageMode.set(false);
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

  onTemplateSelect(ev: Event): void {
    const id = (ev.target as HTMLSelectElement).value;
    if (!id) return;
    const t = this.templates().find((x) => x.id === id);
    if (t) {
      this.templateName.set(t.name);
      this.templateLang.set(t.language || 'en');
    }
  }

  applyPreset(p: WhatsAppTemplatePreset): void {
    this.templateName.set(p.templateName);
    this.templateLang.set(p.languageCode || 'en');
  }

  sendTemplateFirst(): void {
    const rawTo = normalizeWaTo(this.newPhone());
    const name = this.templateName().trim();
    if (!rawTo || !name || this.sendingTemplate()) return;

    let components: unknown = [];
    const raw = this.templateComponentsJson().trim();
    if (raw) {
      try {
        components = JSON.parse(raw) as unknown;
        if (!Array.isArray(components)) {
          this.toast.error('Template components must be a JSON array');
          return;
        }
      } catch {
        this.toast.error('Invalid JSON in template components');
        return;
      }
    }

    this.sendingTemplate.set(true);
    this.api
      .sendTemplateMessage({
        to: rawTo,
        templateName: name,
        languageCode: this.templateLang().trim() || 'en',
        components,
      })
      .pipe(
        switchMap(() =>
          this.api.getMessageConversations().pipe(catchError(() => of([])))
        ),
        catchError((err) => {
          this.toast.error(
            getApiErrorMessage(err, 'Could not send template (check Meta policy)')
          );
          return of(null);
        }),
        finalize(() => this.sendingTemplate.set(false))
      )
      .subscribe((list) => {
        if (!list) return;
        this.conversations.set(list as Conversation[]);
        this.toast.success('Template sent');
        this.newPhone.set('');
        this.templateComponentsJson.set('');
        this.newMessageMode.set(false);
        this.selectPhone(rawTo);
      });
  }

  send(): void {
    const phone = this.selectedPhone();
    const text = this.draft().trim();
    if (!phone || !text || this.sendingText()) return;
    this.sendingText.set(true);
    this.api
      .sendTextMessage({ to: normalizeWaTo(phone), text })
      .pipe(
        switchMap(() => this.api.getMessageThread(phone, 1, 80)),
        catchError((err) => {
          this.toast.error(getApiErrorMessage(err, 'Could not send'));
          return of(null);
        }),
        finalize(() => this.sendingText.set(false))
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
