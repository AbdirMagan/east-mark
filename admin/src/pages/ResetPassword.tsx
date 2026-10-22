import { useState, type FormEvent } from 'react';

import { auth } from '../lib/api.js';
import { Button, Card, Icon } from '../components/ui.js';

/**
 * Where a password-reset email lands.
 *
 * The link has already signed this person in -- that is what proves they can
 * read the inbox the account belongs to -- so the form asks for the new
 * password and nothing else. There is no old password to confirm, because not
 * knowing it is the reason they are here.
 *
 * It is shown before the staff check. Someone whose role was removed should
 * still be able to finish setting their password and then be told plainly that
 * the dashboard is not for them, rather than meeting a refusal in the middle of
 * a half-finished reset.
 */
export function ResetPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }

    setBusy(true);
    try {
      const { error: updateError } = await auth.updateUser({ password });
      if (updateError) throw new Error(updateError.message);
      onDone();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not set the password');
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
          <h1 className="text-lg font-bold text-text-primary">Set a new password</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Choose something you have not used here before.
          </p>

          <form onSubmit={submit} className="mt-5 space-y-4">
            {error ? (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-(--radius-field) bg-(--color-danger)/10 px-3 py-2 text-sm text-(--color-danger)"
              >
                <Icon name="alert" size={15} className="mt-0.5" />
                {error}
              </p>
            ) : null}

            <div className="space-y-1.5">
              <label htmlFor="new-password" className="block text-sm font-medium text-text-secondary">
                New password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={visible ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-10 w-full rounded-(--radius-field) border border-border-subtle bg-surface-raised px-3 pr-11 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
                />
                <button
                  type="button"
                  onClick={() => setVisible((previous) => !previous)}
                  aria-label={visible ? 'Hide password' : 'Show password'}
                  aria-pressed={visible}
                  className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center rounded-(--radius-field) text-text-muted transition-colors hover:text-text-primary"
                >
                  <Icon name={visible ? 'eye-off' : 'eye'} size={16} />
                </button>
              </div>
              <p className="text-xs text-text-muted">At least 8 characters.</p>
            </div>

            <Button type="submit" loading={busy} className="w-full">
              Save password
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
