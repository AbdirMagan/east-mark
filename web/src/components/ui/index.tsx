import { Link } from 'react-router-dom';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

import { CulturalPattern } from '../brand/CulturalPattern.js';
import { Icon, type IconName } from './Icon.js';

/* -------------------------------------------------------------------------- */
/* Button                                                                     */
/* -------------------------------------------------------------------------- */

type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Every variant carries a border, so the shape reads as a button even against
 * a busy photo or a coloured panel, and lifts with a tinted shadow on hover.
 */
const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'border-brand bg-brand text-white shadow-sm hover:bg-brand-hover hover:shadow-lg hover:shadow-brand/25 dark:text-ink-950',
  accent:
    'border-accent bg-accent text-white shadow-sm hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/25 dark:text-ink-950',
  secondary:
    'border-border-strong bg-surface-raised text-text-primary hover:border-brand hover:bg-surface-sunken hover:text-brand hover:shadow-md',
  ghost:
    'border-transparent text-text-secondary hover:border-border-subtle hover:bg-surface-sunken hover:text-text-primary',
  danger: 'border-(--color-danger) bg-(--color-danger) text-white hover:brightness-110 hover:shadow-lg',
};

/**
 * Shared interaction: pill corners, a press that presses, a hover lift, and a
 * focus ring a keyboard user can actually see. Movement is behind motion-safe,
 * so someone who asked for reduced motion gets the colour change only.
 */
const BUTTON_BASE =
  'group inline-flex items-center justify-center rounded-(--radius-pill) border font-semibold ' +
  'transition-[color,background-color,border-color,box-shadow,translate,scale] duration-200 ease-(--ease-out-soft) ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45 focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-surface active:scale-[0.97] motion-safe:hover:-translate-y-0.5 ' +
  'disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none disabled:hover:translate-y-0 disabled:active:scale-100';

const SIZES: Record<ButtonSize, string> = {
  // 44px minimum touch target on the two larger sizes: these are tapped on a
  // phone held one-handed in a market, not clicked with a mouse.
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`${BUTTON_BASE} ${VARIANTS[variant]} ${SIZES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {loading ? (
        <Spinner size={size === 'lg' ? 18 : 16} />
      ) : icon ? (
        <Icon name={icon} size={18} className="motion-safe:transition-transform motion-safe:group-hover:scale-110" />
      ) : null}
      {children}
      {iconRight && !loading ? (
        <Icon
          name={iconRight}
          size={18}
          className="motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5"
        />
      ) : null}
    </button>
  );
}

export function Spinner({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={`animate-spin ${className}`}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" fill="none" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Badge                                                                      */
/* -------------------------------------------------------------------------- */

type BadgeTone = 'neutral' | 'brand' | 'accent' | 'sun' | 'success' | 'info';

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-sunken text-text-secondary',
  brand: 'bg-brand-subtle text-brand',
  accent: 'bg-accent-subtle text-accent',
  sun: 'bg-sun-100 text-sun-800 dark:bg-sun-900/40 dark:text-sun-200',
  success: 'bg-acacia-100 text-acacia-800 dark:bg-acacia-900/40 dark:text-acacia-200',
  info: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200',
};

export function Badge({
  children,
  tone = 'neutral',
  icon,
  className = '',
}: {
  children: ReactNode;
  tone?: BadgeTone;
  icon?: IconName;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-(--radius-pill) px-2 py-0.5 text-[0.6875rem] font-semibold leading-5 ${BADGE_TONES[tone]} ${className}`}
    >
      {icon ? <Icon name={icon} size={12} strokeWidth={2.25} /> : null}
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Form fields                                                                */
/* -------------------------------------------------------------------------- */

const FIELD_BASE =
  'w-full rounded-(--radius-field) border border-border-subtle bg-surface-raised px-3 text-text-primary placeholder:text-text-muted transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 disabled:opacity-60';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function TextField({ label, hint, error, className = '', id, ...rest }: TextFieldProps) {
  const fieldId = id ?? rest.name ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1.5">
      {label ? (
        <label htmlFor={fieldId} className="block text-sm font-medium text-text-secondary">
          {label}
        </label>
      ) : null}
      <input
        {...rest}
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        className={`${FIELD_BASE} h-11 ${error ? 'border-(--color-danger) focus:border-(--color-danger) focus:ring-(--color-danger)/25' : ''} ${className}`}
      />
      {error ? (
        <p id={`${fieldId}-error`} className="text-sm text-(--color-danger)">
          {error}
        </p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="text-xs text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export function SelectField({ label, className = '', id, children, ...rest }: SelectFieldProps) {
  // Without this fallback a caller that passes only `label` renders a
  // <label for=undefined>, so the control has no accessible name and clicking
  // the label does not focus it.
  const fieldId = id ?? rest.name ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1.5">
      {label ? (
        <label htmlFor={fieldId} className="block text-sm font-medium text-text-secondary">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <select
          {...rest}
          id={fieldId}
          className={`${FIELD_BASE} h-11 appearance-none pr-9 ${className}`}
        >
          {children}
        </select>
        <Icon
          name="chevron-down"
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
        />
      </div>
    </div>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1 text-sm text-text-secondary">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 rounded border-border-strong text-brand accent-(--brand) focus:ring-brand"
      />
      {label}
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/* States                                                                     */
/* -------------------------------------------------------------------------- */

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`em-skeleton rounded-(--radius-field) ${className}`} />;
}

/**
 * Empty states carry a cultural pattern rather than an illustration.
 *
 * A pattern is a few hundred bytes of SVG against tens of kilobytes for a
 * drawing, it inherits the theme automatically, and it never looks like it
 * belongs to a different product than the one around it.
 */
export function EmptyState({
  icon = 'package',
  title,
  body,
  action,
}: {
  icon?: IconName;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-(--radius-card) border border-border-subtle bg-surface-raised px-6 py-14 text-center">
      <CulturalPattern variant="weave" scale={44} />
      <div className="relative mx-auto max-w-sm">
        <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-brand-subtle text-brand">
          <Icon name={icon} size={22} />
        </span>
        <h3 className="text-base font-semibold text-text-primary">{title}</h3>
        {body ? <p className="mt-1.5 text-sm text-text-secondary">{body}</p> : null}
        {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}

export function ErrorState({
  title,
  body,
  onRetry,
  retryLabel = 'Try again',
  offline = false,
}: {
  title: string;
  body?: string;
  onRetry?: () => void;
  retryLabel?: string;
  offline?: boolean;
}) {
  return (
    <EmptyState
      icon={offline ? 'offline' : 'alert'}
      title={title}
      body={body}
      action={
        onRetry ? (
          <Button variant="secondary" icon="arrow-right" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : undefined
      }
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Section heading with an optional "see all"                                 */
/* -------------------------------------------------------------------------- */

export function SectionHeading({
  title,
  action,
  to,
}: {
  title: string;
  action?: string;
  to?: string;
}) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <h2 className="font-display text-lg font-bold tracking-tight text-text-primary sm:text-xl">
        {title}
      </h2>
      {action && to ? (
        <Link
          to={to}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand hover:underline"
        >
          {action}
          <Icon name="chevron-right" size={15} />
        </Link>
      ) : null}
    </div>
  );
}
