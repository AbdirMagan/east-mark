import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import { CulturalPattern } from '../components/brand/CulturalPattern.js';
import { Logo, Tagline } from '../components/brand/Logo.js';
import { Button, PasswordField, TextField } from '../components/ui/index.js';
import { Icon } from '../components/ui/Icon.js';
import { useSeo } from '../hooks/useSeo.js';
import { useT } from '../i18n/index.js';
import { useAuth } from '../store/auth.js';

function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  /** The way out of this screen. Omitted where there isn't one worth offering. */
  footer?: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-12">
      <CulturalPattern variant="weave" scale={72} />

      <div className="relative w-full max-w-sm">
        <div className="mb-7 text-center">
          <Link to="/" className="inline-block">
            <Logo size={56} responsive={false} />
          </Link>
          <Tagline className="mt-2 block" />
        </div>

        <div className="rounded-(--radius-card) border border-border-subtle bg-surface-raised p-6 shadow-(--shadow-card)">
          <h1 className="font-display text-xl font-bold tracking-tight text-text-primary">{title}</h1>
          <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>

        {footer ? (
          <p className="mt-5 text-center text-sm text-text-secondary">{footer}</p>
        ) : null}
      </div>
    </div>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-(--radius-field) bg-(--color-danger)/10 px-3 py-2.5 text-sm text-(--color-danger)"
    >
      <Icon name="alert" size={16} className="mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

export function SignInPage() {
  const t = useT();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const session = useAuth((state) => state.session);
  const signIn = useAuth((state) => state.signIn);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useSeo({ title: t('auth.signInTitle'), noIndex: true, path: '/signin' });

  const next = params.get('next') ?? '/';
  if (session) return <Navigate to={next} replace />;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      navigate(next, { replace: true });
    } catch (caught) {
      // Supabase returns "Invalid login credentials" for both a wrong password
      // and an unknown address, which is the right call: distinguishing them
      // tells an attacker which emails have accounts.
      setError(caught instanceof Error ? caught.message : t('error.generic'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title={t('auth.signInTitle')}
      subtitle={t('auth.signInSubtitle')}
      footer={
        <>
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="font-semibold text-brand hover:underline">
            {t('auth.register')}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? <FormError message={error} /> : null}

        <TextField
          label={t('auth.email')}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <PasswordField
          label={t('auth.password')}
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          showLabel={t('auth.showPassword')}
          hideLabel={t('auth.hidePassword')}
        />

        <div className="flex justify-end">
          <Link
            to={`/forgot-password${email ? `?email=${encodeURIComponent(email.trim())}` : ''}`}
            className="text-sm font-semibold text-brand hover:underline"
          >
            {t('auth.forgotPassword')}
          </Link>
        </div>

        <Button type="submit" fullWidth size="lg" loading={busy}>
          {t('auth.signIn')}
        </Button>
      </form>
    </AuthLayout>
  );
}

export function RegisterPage() {
  const t = useT();
  const navigate = useNavigate();
  const session = useAuth((state) => state.session);
  const signUp = useAuth((state) => state.signUp);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState(false);
  const [busy, setBusy] = useState(false);

  useSeo({ title: t('auth.registerTitle'), noIndex: true, path: '/register' });

  if (session) return <Navigate to="/" replace />;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(t('auth.passwordHint'));
      return;
    }

    setBusy(true);
    try {
      const result = await signUp(email.trim(), password, fullName.trim());
      if (result.needsConfirmation) setConfirmation(true);
      else navigate('/onboarding', { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('error.generic'));
    } finally {
      setBusy(false);
    }
  };

  if (confirmation) {
    return (
      <AuthLayout
        title={t('auth.registerTitle')}
        subtitle={t('auth.checkEmail')}
        footer={
          <Link to="/signin" className="font-semibold text-brand hover:underline">
            {t('auth.signIn')}
          </Link>
        }
      >
        <div className="flex items-center gap-3 rounded-(--radius-field) bg-brand-subtle px-4 py-3 text-sm text-brand">
          <Icon name="check" size={18} />
          {t('auth.checkEmail')}
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t('auth.registerTitle')}
      subtitle={t('auth.registerSubtitle')}
      footer={
        <>
          {t('auth.haveAccount')}{' '}
          <Link to="/signin" className="font-semibold text-brand hover:underline">
            {t('auth.signIn')}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? <FormError message={error} /> : null}

        <TextField
          label={t('auth.fullName')}
          name="name"
          autoComplete="name"
          required
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
        />

        <TextField
          label={t('auth.email')}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <PasswordField
          label={t('auth.password')}
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          hint={t('auth.passwordHint')}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          showLabel={t('auth.showPassword')}
          hideLabel={t('auth.hidePassword')}
        />

        <Button type="submit" fullWidth size="lg" loading={busy}>
          {t('auth.register')}
        </Button>
      </form>
    </AuthLayout>
  );
}

/**
 * Where the link in a confirmation email lands.
 *
 * Both clients send people here, and the two arrive in different states. On
 * the web the link usually opens in the same browser that signed up, so the
 * auth client reads the token out of the URL and the account is simply ready.
 * From the Android app the link opens in the phone's browser instead, which
 * has no app session to hand back -- the account is confirmed all the same,
 * and what that person needs is to be told to go back to the app.
 *
 * So this page says what happened rather than quietly redirecting, which is
 * also the honest thing to show if the link has already been used.
 */
export function ConfirmedPage() {
  const t = useT();
  const session = useAuth((state) => state.session);

  useSeo({ title: t('auth.confirmedTitle'), noIndex: true, path: '/auth/confirmed' });

  return (
    <AuthLayout
      title={t('auth.confirmedTitle')}
      subtitle={session ? t('auth.confirmedSignedIn') : t('auth.confirmedSubtitle')}
      footer={
        session ? null : (
          <>
            {t('auth.confirmedInApp')}{' '}
            <Link to="/signin" className="font-semibold text-brand hover:underline">
              {t('auth.signIn')}
            </Link>
          </>
        )
      }
    >
      <div className="flex items-center gap-3 rounded-(--radius-field) bg-brand-subtle px-4 py-3 text-sm text-brand">
        <Icon name="check" size={18} />
        {t('auth.confirmedBody')}
      </div>

      <Link to={session ? '/' : '/signin'} className="block">
        <Button type="button" className="w-full">
          {session ? t('auth.confirmedBrowse') : t('auth.signIn')}
        </Button>
      </Link>
    </AuthLayout>
  );
}

/**
 * Asks for the address and sends the reset link.
 *
 * The reply is the same whether or not that address has an account. It reads
 * as unhelpful for a moment -- "we have sent it, check your inbox" when there
 * may be nothing to check -- but the alternative is a form that tells anyone
 * who asks which addresses are registered, which is the first half of an
 * attack on the people behind them.
 */
export function ForgotPasswordPage() {
  const t = useT();
  const [params] = useSearchParams();
  const requestPasswordReset = useAuth((state) => state.requestPasswordReset);

  // Carried over from the sign-in form, so nobody types it twice.
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useSeo({ title: t('auth.forgotTitle'), noIndex: true, path: '/forgot-password' });

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (caught) {
      // Only a real failure to send reaches here -- an unknown address does
      // not, because Supabase does not treat it as an error either.
      setError(caught instanceof Error ? caught.message : t('error.generic'));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout
        title={t('auth.forgotTitle')}
        subtitle={t('auth.forgotSentSubtitle')}
        footer={
          <Link to="/signin" className="font-semibold text-brand hover:underline">
            {t('auth.backToSignIn')}
          </Link>
        }
      >
        <div className="flex items-start gap-3 rounded-(--radius-field) bg-brand-subtle px-4 py-3 text-sm text-brand">
          <Icon name="check" size={18} className="mt-0.5 shrink-0" />
          {t('auth.forgotSent')}
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t('auth.forgotTitle')}
      subtitle={t('auth.forgotSubtitle')}
      footer={
        <Link to="/signin" className="font-semibold text-brand hover:underline">
          {t('auth.backToSignIn')}
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? <FormError message={error} /> : null}

        <TextField
          label={t('auth.email')}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <Button type="submit" fullWidth size="lg" loading={busy}>
          {t('auth.sendResetLink')}
        </Button>
      </form>
    </AuthLayout>
  );
}

/**
 * Where the reset link lands: set the new password.
 *
 * The link signs the person in before this page renders -- that is how
 * Supabase recovery works, and it is what proves they can read the inbox the
 * account belongs to. So the form asks for the new password and nothing else;
 * there is no old password to confirm, because not knowing it is why they are
 * here.
 *
 * A link that has expired or been used leaves no session behind, and the page
 * says so rather than showing a form that cannot work.
 */
export function ResetPasswordPage() {
  const t = useT();
  const navigate = useNavigate();
  const session = useAuth((state) => state.session);
  const initialising = useAuth((state) => state.initialising);
  const updatePassword = useAuth((state) => state.updatePassword);

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useSeo({ title: t('auth.resetTitle'), noIndex: true, path: '/reset-password' });

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(t('auth.passwordHint'));
      return;
    }

    setBusy(true);
    try {
      await updatePassword(password);
      navigate('/', { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('error.generic'));
    } finally {
      setBusy(false);
    }
  };

  // The token is read out of the URL asynchronously, so an empty session is
  // only meaningful once that has finished.
  if (initialising) {
    return (
      <AuthLayout title={t('auth.resetTitle')} subtitle={t('common.loading')}>
        <div />
      </AuthLayout>
    );
  }

  if (!session) {
    return (
      <AuthLayout
        title={t('auth.resetTitle')}
        subtitle={t('auth.resetExpiredSubtitle')}
        footer={
          <Link to="/forgot-password" className="font-semibold text-brand hover:underline">
            {t('auth.forgotPassword')}
          </Link>
        }
      >
        <FormError message={t('auth.resetExpired')} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t('auth.resetTitle')} subtitle={t('auth.resetSubtitle')}>
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? <FormError message={error} /> : null}

        <PasswordField
          label={t('auth.newPassword')}
          name="new-password"
          autoComplete="new-password"
          required
          minLength={8}
          hint={t('auth.passwordHint')}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          showLabel={t('auth.showPassword')}
          hideLabel={t('auth.hidePassword')}
        />

        <Button type="submit" fullWidth size="lg" loading={busy}>
          {t('auth.savePassword')}
        </Button>
      </form>
    </AuthLayout>
  );
}
