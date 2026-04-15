/**
 * Meta Cloud API template locales — backend defaults omitted `language` to `en_US`.
 * Bare `en` may be rejected; normalize before POST /templates and message template sends.
 */
export function normalizeMetaTemplateLocale(code: string): string {
  const t = String(code ?? '').trim();
  if (!t) return 'en_US';
  if (t === 'en') return 'en_US';
  return t;
}
