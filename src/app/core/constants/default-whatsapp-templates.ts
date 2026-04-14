import type { WhatsAppTemplatePreset } from '../models';

/**
 * Client-side fallbacks when GET /messages/templates/defaults is empty or fails.
 * Names must match approved templates in Meta Business Manager for the tenant’s WABA.
 */
export const FALLBACK_WHATSAPP_TEMPLATE_PRESETS: WhatsAppTemplatePreset[] = [
  {
    label: 'Order confirmation',
    templateName: 'order_confirmation',
    languageCode: 'en',
  },
  {
    label: 'Product restock',
    templateName: 'product_restock_notify',
    languageCode: 'en',
  },
  {
    label: 'Shipping update',
    templateName: 'shipping_update',
    languageCode: 'en',
  },
];
