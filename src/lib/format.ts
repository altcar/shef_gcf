const TIME_ZONE = 'Europe/London';

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIME_ZONE,
  }).format(date);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIME_ZONE,
  }).format(date);
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  const visible = user.slice(0, 2);
  return `${visible}${'•'.repeat(Math.max(1, user.length - 2))}@${domain}`;
}

export function percentage(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}
