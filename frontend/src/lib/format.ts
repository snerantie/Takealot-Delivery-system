export const formatCurrency = (value?: number | string | null): string => {
  const n = typeof value === 'string' ? parseFloat(value) : value ?? 0;
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(Number.isFinite(n as number) ? (n as number) : 0);
};

export const formatDateTime = (value?: string | null): string => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-ZA', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const statusLabel = (status: string): string =>
  status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
