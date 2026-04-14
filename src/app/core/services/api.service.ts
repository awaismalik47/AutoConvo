import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { httpApiRoot } from '../../../environments/http-api-root';
import type {
  AuthUser,
  BillingCheckoutPayload,
  BillingPlan,
  Broadcast,
  ChartDataPoint,
  ChatbotFlow,
  Contact,
  ContactsPage,
  Conversation,
  CreateBroadcastPayload,
  DashboardStats,
  Message,
  MetaConnectBody,
  MetaPhoneInfo,
  MetaStatus,
  SendTemplatePayload,
  SendTextPayload,
  Template,
  WhatsAppTemplatePreset,
} from '../models';

function normalizeWhatsAppTemplatePresets(raw: unknown): WhatsAppTemplatePreset[] {
  let rows: unknown[] = [];
  if (Array.isArray(raw)) rows = raw;
  else if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    const a = o['defaults'] ?? o['data'] ?? o['presets'] ?? o['templates'];
    if (Array.isArray(a)) rows = a;
  }
  const out: WhatsAppTemplatePreset[] = [];
  for (const item of rows) {
    const r = (item ?? {}) as Record<string, unknown>;
    const templateName = String(
      r['templateName'] ?? r['template_name'] ?? r['name'] ?? ''
    ).trim();
    if (!templateName) continue;
    const label = String(
      r['label'] ?? r['title'] ?? templateName
    ).trim();
    const languageCode = String(
      r['languageCode'] ?? r['language_code'] ?? r['language'] ?? 'en'
    ).trim();
    out.push({
      label: label || templateName,
      templateName,
      languageCode: languageCode || 'en',
    });
  }
  return out;
}

/** Maps arbitrary API JSON to {@link DashboardStats}. */
function normalizeDashboard(raw: unknown): DashboardStats {
  const r = (raw ?? {}) as Record<string, unknown>;
  const n = (...keys: string[]) => {
    for (const k of keys) {
      const v = r[k];
      if (typeof v === 'number' && !Number.isNaN(v)) return v;
      if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v)))
        return Number(v);
    }
    return 0;
  };
  return {
    totalSent: n('totalSent', 'total_sent', 'messagesSent', 'messages_sent'),
    deliveryRate: n('deliveryRate', 'delivery_rate'),
    totalConversations: n(
      'totalConversations',
      'total_conversations',
      'conversations'
    ),
    totalContacts: n('totalContacts', 'total_contacts', 'contacts'),
    sentDelta: n('sentDelta', 'sent_delta'),
    deliveryDelta: n('deliveryDelta', 'delivery_delta'),
    conversationsDelta: n('conversationsDelta', 'conversations_delta'),
    contactsDelta: n('contactsDelta', 'contacts_delta'),
  };
}

function normalizeChart(raw: unknown): ChartDataPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, i) => {
    const o = (item ?? {}) as Record<string, unknown>;
    const label = String(
      o['label'] ?? o['day'] ?? o['date'] ?? o['name'] ?? `Day ${i + 1}`
    );
    const sent = Number(o['sent'] ?? o['outbound'] ?? o['total'] ?? 0) || 0;
    const delivered =
      Number(
        o['delivered'] ??
          o['inbound'] ??
          o['received'] ??
          o['delivered_count'] ??
          0
      ) || 0;
    return { label, sent, delivered };
  });
}

function normalizeConversations(raw: unknown): Conversation[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const o = (item ?? {}) as Record<string, unknown>;
    const phone = String(
      o['phone'] ?? o['contactPhone'] ?? o['contact_phone'] ?? o['to'] ?? ''
    );
    return {
      id: String(o['id'] ?? phone),
      phone,
      contactPhone: phone,
      contactName: String(
        o['contactName'] ??
          o['contact_name'] ??
          o['name'] ??
          o['displayName'] ??
          phone
      ),
      lastMessage: String(
        o['lastMessage'] ?? o['last_message'] ?? o['preview'] ?? ''
      ),
      lastMessageAt: String(
        o['lastMessageAt'] ?? o['last_message_at'] ?? o['updatedAt'] ?? ''
      ),
      unread: Number(o['unread'] ?? o['unreadCount'] ?? 0) || 0,
      status: (o['status'] as Conversation['status']) ?? 'open',
    };
  });
}

function normalizeMessages(raw: unknown): Message[] {
  let rows: unknown[] = [];
  if (Array.isArray(raw)) rows = raw;
  else if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o['data'])) rows = o['data'] as unknown[];
    else if (Array.isArray(o['messages'])) rows = o['messages'] as unknown[];
  }
  return rows.map((item, i) => {
    const o = (item ?? {}) as Record<string, unknown>;
    const dir = String(o['direction'] ?? o['type'] ?? 'outbound').toLowerCase();
    return {
      id: String(o['id'] ?? `m-${i}`),
      conversationId: o['conversationId']
        ? String(o['conversationId'])
        : undefined,
      direction:
        dir === 'inbound' || dir === 'in'
          ? 'inbound'
          : ('outbound' as Message['direction']),
      type: (o['type'] as Message['type']) ?? 'text',
      body: String(o['body'] ?? o['text'] ?? o['content'] ?? ''),
      status: (o['status'] as Message['status']) ?? 'sent',
      createdAt: String(
        o['createdAt'] ?? o['created_at'] ?? o['timestamp'] ?? ''
      ),
    };
  });
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private get base(): string {
    return httpApiRoot();
  }

  constructor(private readonly http: HttpClient) {}

  // ── Auth (public) ─────────────────────────────────────
  /** Nest may return `{ user }` or a flat user — normalize to {@link AuthUser}. */
  getAuthMe(): Observable<AuthUser> {
    return this.http.get<unknown>(`${this.base}/auth/me`).pipe(
      map((raw) => {
        if (raw && typeof raw === 'object' && 'user' in raw) {
          return (raw as { user: AuthUser }).user;
        }
        return raw as AuthUser;
      })
    );
  }

  // ── Users ───────────────────────────────────────────────
  getUserMe(): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${this.base}/users/me`);
  }

  patchUserMe(body: Partial<AuthUser>): Observable<AuthUser> {
    return this.http.patch<AuthUser>(`${this.base}/users/me`, body);
  }

  // ── Meta (WhatsApp) ───────────────────────────────────
  /** Server OAuth state for Facebook Login — use in `buildMetaOAuthAuthorizeUrl({ state })`. */
  getMetaOAuthState(): Observable<{ state: string }> {
    return this.http.get<{ state: string }>(`${this.base}/meta/oauth/state`);
  }

  /** `connectionMode` / `wabaId` optional — Embedded Signup + coexistence flows. */
  metaConnect(body: MetaConnectBody): Observable<unknown> {
    return this.http.post(`${this.base}/meta/connect`, body);
  }

  metaDisconnect(): Observable<unknown> {
    return this.http.delete(`${this.base}/meta/disconnect`);
  }

  getMetaStatus(): Observable<MetaStatus> {
    return this.http.get<MetaStatus>(`${this.base}/meta/status`);
  }

  getMetaPhoneInfo(): Observable<MetaPhoneInfo> {
    return this.http.get<MetaPhoneInfo>(`${this.base}/meta/phone-info`);
  }

  // ── Messages ────────────────────────────────────────────
  /** Suggested template names/languages for inbox quick-picks (see `default-whatsapp-templates.ts` fallback). */
  getMessageTemplateDefaults(): Observable<WhatsAppTemplatePreset[]> {
    return this.http
      .get<unknown>(`${this.base}/messages/templates/defaults`)
      .pipe(map(normalizeWhatsAppTemplatePresets));
  }

  sendTextMessage(payload: SendTextPayload): Observable<unknown> {
    return this.http.post(`${this.base}/messages/send/text`, payload);
  }

  sendTemplateMessage(payload: SendTemplatePayload): Observable<unknown> {
    return this.http.post(`${this.base}/messages/send/template`, payload);
  }

  getMessageConversations(): Observable<Conversation[]> {
    return this.http
      .get<unknown>(`${this.base}/messages/conversations`)
      .pipe(map(normalizeConversations));
  }

  getMessageThread(
    phone: string,
    page = 1,
    limit = 50
  ): Observable<Message[]> {
    const params = new HttpParams()
      .set('phone', phone)
      .set('page', String(page))
      .set('limit', String(limit));
    return this.http
      .get<unknown>(`${this.base}/messages/conversation`, { params })
      .pipe(map(normalizeMessages));
  }

  // ── Templates ─────────────────────────────────────────
  getTemplates(): Observable<Template[]> {
    return this.http.get<Template[]>(`${this.base}/templates`);
  }

  getTemplate(id: string): Observable<Template> {
    return this.http.get<Template>(`${this.base}/templates/${id}`);
  }

  createTemplate(data: Partial<Template>): Observable<Template> {
    return this.http.post<Template>(`${this.base}/templates`, data);
  }

  deleteTemplate(id: string): Observable<unknown> {
    return this.http.delete(`${this.base}/templates/${id}`);
  }

  syncTemplates(): Observable<unknown> {
    return this.http.get(`${this.base}/templates/sync`);
  }

  // ── Contacts ────────────────────────────────────────────
  getContacts(
    page = 1,
    limit = 20,
    search = '',
    tag = ''
  ): Observable<ContactsPage> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('limit', String(limit));
    if (search) params = params.set('search', search);
    if (tag) params = params.set('tag', tag);
    return this.http.get<ContactsPage>(`${this.base}/contacts`, { params });
  }

  getContact(id: string): Observable<Contact> {
    return this.http.get<Contact>(`${this.base}/contacts/${id}`);
  }

  createContact(data: Partial<Contact>): Observable<Contact> {
    return this.http.post<Contact>(`${this.base}/contacts`, data);
  }

  updateContact(id: string, data: Partial<Contact>): Observable<Contact> {
    return this.http.put<Contact>(`${this.base}/contacts/${id}`, data);
  }

  deleteContact(id: string): Observable<unknown> {
    return this.http.delete(`${this.base}/contacts/${id}`);
  }

  importContacts(file: File): Observable<{ imported: number }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ imported: number }>(
      `${this.base}/contacts/import`,
      form
    );
  }

  getContactTags(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/contacts/tags`);
  }

  // ── Broadcasts ─────────────────────────────────────────
  getBroadcasts(): Observable<Broadcast[]> {
    return this.http.get<Broadcast[]>(`${this.base}/broadcasts`);
  }

  getBroadcast(id: string): Observable<Broadcast> {
    return this.http.get<Broadcast>(`${this.base}/broadcasts/${id}`);
  }

  createBroadcast(data: CreateBroadcastPayload): Observable<Broadcast> {
    return this.http.post<Broadcast>(`${this.base}/broadcasts`, data);
  }

  sendBroadcast(id: string): Observable<unknown> {
    return this.http.post(`${this.base}/broadcasts/${id}/send`, {});
  }

  cancelBroadcast(id: string): Observable<unknown> {
    return this.http.patch(`${this.base}/broadcasts/${id}/cancel`, {});
  }

  deleteBroadcast(id: string): Observable<unknown> {
    return this.http.delete(`${this.base}/broadcasts/${id}`);
  }

  // ── Chatbot flows ───────────────────────────────────────
  getChatbotFlows(): Observable<ChatbotFlow[]> {
    return this.http.get<ChatbotFlow[]>(`${this.base}/chatbot/flows`);
  }

  getChatbotFlow(id: string): Observable<ChatbotFlow> {
    return this.http.get<ChatbotFlow>(`${this.base}/chatbot/flows/${id}`);
  }

  createChatbotFlow(data: Partial<ChatbotFlow>): Observable<ChatbotFlow> {
    return this.http.post<ChatbotFlow>(`${this.base}/chatbot/flows`, data);
  }

  updateChatbotFlow(id: string, data: Partial<ChatbotFlow>): Observable<ChatbotFlow> {
    return this.http.put<ChatbotFlow>(`${this.base}/chatbot/flows/${id}`, data);
  }

  toggleChatbotFlow(id: string): Observable<unknown> {
    return this.http.patch(`${this.base}/chatbot/flows/${id}/toggle`, {});
  }

  deleteChatbotFlow(id: string): Observable<unknown> {
    return this.http.delete(`${this.base}/chatbot/flows/${id}`);
  }

  // ── Analytics ───────────────────────────────────────────
  getAnalyticsDashboard(): Observable<DashboardStats> {
    return this.http
      .get<unknown>(`${this.base}/analytics/dashboard`)
      .pipe(map(normalizeDashboard));
  }

  getAnalyticsMessagesChart(days = 7): Observable<ChartDataPoint[]> {
    const params = new HttpParams().set('days', String(days));
    return this.http
      .get<unknown>(`${this.base}/analytics/messages/chart`, { params })
      .pipe(map(normalizeChart));
  }

  getAnalyticsContactsTop(): Observable<unknown> {
    return this.http.get(`${this.base}/analytics/contacts/top`);
  }

  getAnalyticsBroadcasts(): Observable<unknown> {
    return this.http.get(`${this.base}/analytics/broadcasts`);
  }

  // ── Billing ───────────────────────────────────────────
  getBillingPlans(): Observable<BillingPlan[]> {
    return this.http.get<BillingPlan[]>(`${this.base}/billing/plans`);
  }

  postBillingCheckout(body: BillingCheckoutPayload): Observable<unknown> {
    return this.http.post(`${this.base}/billing/checkout`, body);
  }

  postBillingPortal(): Observable<unknown> {
    return this.http.post(`${this.base}/billing/portal`, {});
  }
}
