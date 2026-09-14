import { useState, type FormEvent } from 'react';

import { auth } from '../lib/api.js';
import { Button, Card, Icon } from '../components/ui.js';

/**
 * Staff sign-in. The role check lives in StaffGate (App.tsx), which runs
 * before the dashboard mounts; `notice` carries its refusal back here, since
 * this component is remounted when that gate signs a non-staff user out.
 */
export function SignIn({ onSignedIn, notice }: { onSignedIn: () => void; notice?: string | null }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const { error: signInError } = await auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) throw new Error(signInError.message);
      onSignedIn();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not sign in');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white dark:text-ink-950">
            EM
          </span>
          <div>
            <p className="font-bold leading-tight text-text-primary">East-Market</p>
            <p className="text-xs leading-tight text-text-muted">Admin</p>
          </div>
        </div>

        <Card className="p-6">
          <h1 className="text-lg font-bold text-text-primary">Staff sign in</h1>
          <p className="mt-1 text-sm text-text-secondary">This dashboard is for admins and moderators.</p>

          <form onSubmit={submit} className="mt-5 space-y-4">
            {error || notice ? (
              <p role="alert" className="flex items-start gap-2 rounded-[--radius-field] bg-[--color-danger]/10 px-3 py-2 text-sm text-[--color-danger]">
                <Icon name="alert" size={15} className="mt-0.5" />
                {error ?? notice}
              </p>
            ) : null}

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-text-secondary">Email</label>
              <input
                id="email" type="email" required autoComplete="email" value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-10 w-full rounded-[--radius-field] border border-border-subtle bg-surface-raised px-3 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-text-secondary">Password</label>
              <input
                id="password" type="password" required autoComplete="current-password" value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-10 w-full rounded-[--radius-field] border border-border-subtle bg-surface-raised px-3 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
              />
            </div>

            <Button type="submit" loading={busy} className="w-full">Sign in</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
