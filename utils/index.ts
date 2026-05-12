// ============================================================
// SODALIS — Utilities
// ============================================================
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'd MMMM yyyy', { locale: it });
}

export function formatDateShort(dateStr: string): string {
  return format(parseISO(dateStr), 'd MMM', { locale: it });
}

export function formatRelative(dateStr: string): string {
  return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: it });
}

export function formatEventDate(dateStr: string): string {
  return format(parseISO(dateStr), 'EEEE d MMMM', { locale: it });
}

/** Restituisce le iniziali di un display name (max 2 chars) */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/** Genera un codice invito lato client (fallback — il server ha la funzione ufficiale) */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

/** Tronca un testo a maxLength caratteri con ellipsis */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}

/** Controlla se una stringa è un hex color valido */
export function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

/** Restituisce il plural italiano semplice */
export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
