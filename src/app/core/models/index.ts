// ── Auth ────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  plan?: 'free' | 'growth' | 'business' | 'enterprise' | string;
}

export interface LoginPayload {
  email: string;
  password: string;
}
export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}
export interface AuthResponse {
  access_token: string;
  user?: AuthUser;
}

// ── Meta (WhatsApp / Facebook) ─────────────────────────
/** From GET /meta/status — legacy rows may still report `standard`. */
export type WhatsappConnectionMode = 'standard' | 'coexistence';

export interface MetaIntegration {
  coexistence?: boolean;
  summary?: string;
  /** e.g. `coexistence_only` — align UI copy with backend policy */
  policy?: string;
  [key: string]: unknown;
}

export interface MetaStatus {
  connected?: boolean;
  status?: string;
  connectionMode?: WhatsappConnectionMode;
  displayNumber?: string;
  displayName?: string;
  display_number?: string;
  display_name?: string;
  integration?: MetaIntegration;
  [key: string]: unknown;
}

export interface MetaPhoneInfo {
  displayNumber?: string;
  displayName?: string;
  phoneNumberId?: string;
  wabaId?: string;
  display_number?: string;
  display_name?: string;
  phone_number_id?: string;
  waba_id?: string;
  [key: string]: unknown;
}

/** WhatsApp linked account — map from Meta DTOs + GET /meta/status */
export interface WAConnection {
  phoneNumberId?: string;
  wabaId?: string;
  displayNumber?: string;
  displayName?: string;
  status?: 'connected' | 'disconnected' | 'pending' | string;
  connectionMode?: WhatsappConnectionMode;
  coexistence?: boolean;
  integrationSummary?: string;
  integrationPolicy?: string;
}

/**
 * POST /meta/connect — send **`connectionMode` omitted** or **`coexistence` only**.
 * Never send `standard` (backend validation).
 */
export interface MetaConnectBody {
  code: string;
  redirectUri: string;
  connectionMode?: 'coexistence';
  wabaId?: string;
}

// ── Contacts ────────────────────────────────────────────
export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  tags: string[];
  createdAt: string;
  lastMessageAt?: string;
}

export interface ContactsPage {
  data: Contact[];
  total: number;
  page: number;
  limit: number;
}

// ── Templates ───────────────────────────────────────────
export type TemplateStatus = 'approved' | 'pending' | 'rejected';
export type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';

export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  language: string;
  status: TemplateStatus;
  body: string;
  header?: string;
  footer?: string;
  variables: string[];
  createdAt: string;
}

// ── Messages / Inbox ────────────────────────────────────
export interface Conversation {
  id?: string;
  contactName?: string;
  contactPhone?: string;
  /** Primary key for /messages/conversation */
  phone?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unread?: number;
  status?: 'open' | 'resolved' | 'pending';
}

export interface Message {
  id: string;
  conversationId?: string;
  direction: 'inbound' | 'outbound';
  type?: 'text' | 'template' | 'image';
  body: string;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
  createdAt: string;
}

export interface SendTextPayload {
  to: string;
  text: string;
}

export interface SendTemplatePayload {
  to: string;
  templateName: string;
  languageCode: string;
  components?: unknown;
}

/** Suggested templates from GET /messages/templates/defaults (or UI fallbacks). */
export interface WhatsAppTemplatePreset {
  label: string;
  templateName: string;
  languageCode: string;
}

// ── Broadcast ───────────────────────────────────────────
export type BroadcastStatus =
  | 'draft'
  | 'scheduled'
  | 'running'
  | 'completed'
  | 'failed';

export interface Broadcast {
  id: string;
  name: string;
  templateId: string;
  templateName: string;
  recipientCount: number;
  delivered: number;
  read: number;
  failed: number;
  status: BroadcastStatus;
  scheduledAt?: string;
  createdAt: string;
}

export interface CreateBroadcastPayload {
  name: string;
  templateId: string;
  contactIds?: string[];
  tags?: string[];
  scheduledAt?: string;
}

// ── Analytics (normalized for UI) ────────────────────────
export interface DashboardStats {
  totalSent: number;
  deliveryRate: number;
  totalConversations: number;
  totalContacts: number;
  sentDelta: number;
  deliveryDelta: number;
  conversationsDelta: number;
  contactsDelta: number;
}

export interface ChartDataPoint {
  label: string;
  sent: number;
  delivered: number;
}

// ── Billing ─────────────────────────────────────────────
export interface BillingPlan {
  id?: string;
  name?: string;
  price?: number;
  [key: string]: unknown;
}

export interface BillingCheckoutPayload {
  plan: string;
}

// ── Chatbot ─────────────────────────────────────────────
export interface ChatbotFlow {
  id: string;
  name?: string;
  active?: boolean;
  [key: string]: unknown;
}

// ── UI helpers ──────────────────────────────────────────
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

export interface PageMeta {
  title: string;
  breadcrumb?: string;
}
