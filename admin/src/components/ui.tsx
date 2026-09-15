import type { ButtonHTMLAttributes, ReactNode } from 'react';

/* -------------------------------------------------------------------------- */
/* Icons — the handful this dashboard needs, drawn inline                     */
/* -------------------------------------------------------------------------- */

export type IconName =
  | 'dashboard' | 'listings' | 'users' | 'reports' | 'verified' | 'audit'
  | 'check' | 'close' | 'ban' | 'search' | 'chevron-left' | 'chevron-right'
  | 'sun' | 'moon' | 'logout' | 'alert' | 'external' | 'clock'
  | 'megaphone' | 'plus' | 'edit' | 'trash';

const PATHS: Record<IconName, string> = {
  dashboard: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  listings: 'M21 8v8l-9 5-9-5V8l9-5 9 5ZM3.3 7.3 12 12l8.7-4.7M12 12v9',
  users: 'M17 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM22 20v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  reports: 'M12 8v5M12 17h.01M12 3 2 20h20L12 3Z',
  verified: 'm9 12 2 2 4-4M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Z',
  audit: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h6',
  check: 'm20 6-11 11-5-5',
  close: 'M18 6 6 18M6 6l12 12',
  ban: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM5.6 5.6l12.8 12.8',
  search: 'M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM21 21l-4.35-4.35',
  'chevron-left': 'm15 18-6-6 6-6',
  'chevron-right': 'm9 18 6-6-6-6',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  alert: 'M12 8v5M12 17h.01M12 3 2 20h20L12 3Z',
  external: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2',
  megaphone: 'M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1ZM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13',
  plus: 'M12 5v14M5 12h14',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6',
};

export function Icon({ name, size = 18, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" className={`shrink-0 ${className}`}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" fill="none" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Button                                                                     */
/* -------------------------------------------------------------------------- */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

const VARIANTS: Record<Variant, string> = {
  primary: 'border-brand bg-brand text-white shadow-sm hover:bg-brand-hover hover:shadow-md dark:text-ink-950',
  secondary: 'border-border-strong bg-surface-raised text-text-primary hover:border-brand hover:bg-surface-sunken hover:text-brand',
  ghost: 'border-transparent text-text-secondary hover:border-border-subtle hover:bg-surface-sunken hover:text-text-primary',
  danger: 'border-(--color-danger) bg-(--color-danger) text-white hover:brightness-110 hover:shadow-md',
  success: 'border-(--color-success) bg-(--color-success) text-white hover:brightness-110 hover:shadow-md',
};

/** Matches the marketplace's buttons: pill, border, lift, press, focus ring. */
const BASE =
  'group inline-flex items-center justify-center gap-1.5 rounded-(--radius-pill) border font-semibold ' +
  'transition-[color,background-color,border-color,box-shadow,translate,scale] duration-200 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45 focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-surface active:scale-[0.97] motion-safe:hover:-translate-y-0.5 ' +
  'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0 disabled:active:scale-100';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  size?: 'sm' | 'md';
}

export function Button({
  variant = 'primary', icon, loading, size = 'md', className = '', children, disabled, ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`${BASE} ${size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm'} ${VARIANTS[variant]} ${className}`}
    >
      {loading ? (
        <Spinner size={14} />
      ) : icon ? (
        <Icon name={icon} size={15} className="motion-safe:transition-transform motion-safe:group-hover:scale-110" />
      ) : null}
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Status pills                                                               */
/* -------------------------------------------------------------------------- */

const STATUS_TONES: Record<string, string> = {
  active: 'bg-acacia-100 text-acacia-800 dark:bg-acacia-900 dark:text-acacia-200',
  pending_approval: 'bg-sun-100 text-sun-800 dark:bg-sun-900 dark:text-sun-300',
  rejected: 'bg-clay-100 text-clay-900 dark:bg-clay-900 dark:text-clay-300',
  suspended: 'bg-clay-100 text-clay-900 dark:bg-clay-900 dark:text-clay-300',
  sold: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-300',
  draft: 'bg-surface-sunken text-text-muted',
  expired: 'bg-surface-sunken text-text-muted',
  open: 'bg-sun-100 text-sun-800 dark:bg-sun-900 dark:text-sun-300',
  under_review: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-300',
  actioned: 'bg-acacia-100 text-acacia-800 dark:bg-acacia-900 dark:text-acacia-200',
  dismissed: 'bg-surface-sunken text-text-muted',
  pending: 'bg-sun-100 text-sun-800 dark:bg-sun-900 dark:text-sun-300',
  verified: 'bg-acacia-100 text-acacia-800 dark:bg-acacia-900 dark:text-acacia-200',
  unverified: 'bg-surface-sunken text-text-muted',
  admin: 'bg-clay-100 text-clay-900 dark:bg-clay-900 dark:text-clay-300',
  moderator: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-300',
  seller: 'bg-acacia-100 text-acacia-800 dark:bg-acacia-900 dark:text-acacia-200',
  business: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-300',
  buyer: 'bg-surface-sunken text-text-muted',
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${
        STATUS_TONES[status] ?? 'bg-surface-sunken text-text-muted'
      }`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Layout helpers                                                             */
/* -------------------------------------------------------------------------- */

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-(--radius-card) border border-border-subtle bg-surface-raised ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-text-primary">{title}</h1>
        {description ? <p className="mt-0.5 text-sm text-text-secondary">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`em-skeleton rounded-(--radius-field) ${className}`} />;
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="font-semibold text-text-primary">{title}</p>
      {body ? <p className="mt-1 text-sm text-text-secondary">{body}</p> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="px-6 py-14 text-center">
      <span className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-(--color-danger)/10 text-(--color-danger)">
        <Icon name="alert" size={20} />
      </span>
      <p className="font-semibold text-text-primary">{message}</p>
      {onRetry ? (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

/**
 * A failed moderation action must say so. Without this the button simply does
 * nothing on failure, which reads as a broken dashboard rather than a missing
 * key or a permission problem — and the server's message is the whole
 * diagnosis.
 */
export function MutationError({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : 'That action failed.';
  return (
    <div
      role="alert"
      className="mb-3 flex items-start gap-2 rounded-(--radius-field) bg-(--color-danger)/10 px-3 py-2.5 text-sm text-(--color-danger)"
    >
      <Icon name="alert" size={15} className="mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

export function Pagination({
  page, totalPages, onChange,
}: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-border-subtle px-4 py-3">
      <Button variant="secondary" size="sm" icon="chevron-left" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </Button>
      <span className="text-xs text-text-muted">Page {page} of {totalPages}</span>
      <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Next
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Formatting                                                                 */
/* -------------------------------------------------------------------------- */

const SYMBOLS: Record<string, string> = { USD: '$', SLSH: 'SL', SOS: 'Sh.So.', ETB: 'Br', KES: 'KSh', DJF: 'Fdj' };

export function formatPrice(amount: number, currency: string): string {
  const zeroDecimal = currency === 'SLSH' || currency === 'SOS' || currency === 'DJF';
  const number = new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: zeroDecimal || amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: zeroDecimal || amount % 1 === 0 ? 0 : 2,
  }).format(amount);
  const symbol = SYMBOLS[currency] ?? currency;
  return symbol.length <= 1 ? `${symbol}${number}` : `${symbol} ${number}`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export function formatRelative(iso: string | null): string {
  if (!iso) return '—';
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['minute', 60_000], ['hour', 3_600_000], ['day', 86_400_000], ['month', 2_592_000_000],
  ];
  let unit: Intl.RelativeTimeFormatUnit = 'minute';
  let divisor = 60_000;
  for (const [candidate, ms] of units) {
    if (abs >= ms) { unit = candidate; divisor = ms; }
  }
  return new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto' }).format(Math.round(diff / divisor), unit);
}
