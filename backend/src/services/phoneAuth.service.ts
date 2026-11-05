import { createHmac } from 'node:crypto';

import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { admin, anon, hasServiceRole } from '../config/supabase.js';
import { AppError, BadRequestError, ConflictError, UnauthorizedError } from '../utils/errors.js';

/**
 * Signing up and signing in with a phone number and a password.
 *
 * There is no SMS provider behind this project, so a phone number here is a
 * credential, not something that gets verified: no code is sent and none is
 * asked for. What makes that workable is that the account underneath is an
 * ordinary email+password account -- the phone number is turned into an
 * internal address and Supabase Auth does everything else, including hashing
 * the password, issuing the tokens and refreshing them.
 *
 * The address is an HMAC of the number under a server-side secret, at
 * `@phone.invalid` -- a domain RFC 2606 reserves so that it can never resolve
 * and nobody can receive mail at one. Two properties follow:
 *
 *   - Nobody can take a number that is not theirs. A derivable address like
 *     252634400000@phone.invalid could be claimed by signing up for it by
 *     email before its owner arrived; this one cannot be computed without
 *     the secret.
 *   - One number is one account, enforced by Supabase's own unique index on
 *     the address, with no bookkeeping of our own to drift.
 *
 * Both calls here run the password grant server-side and hand back the
 * session. That keeps a wrong number and a wrong password indistinguishable
 * from the outside: a client that could look up "is there an account for this
 * number" would be a way to test which numbers are registered.
 *
 * What this design costs: a phone account cannot be sent a password reset,
 * because there is nowhere to send it. Whoever answers support has to do it.
 */

const PHONE_DOMAIN = 'phone.invalid';

export interface PhoneSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
  userId: string;
}

/**
 * A typed number, canonicalised.
 *
 * People write the same number several ways -- "063 4400000", "0634400000",
 * "+252 63 440 0000", "00252634400000" -- and all of them have to land on one
 * string or one person ends up with three accounts. The national trunk zero
 * goes, the country's dial code goes in front, and what comes out is E.164.
 */
export function normalizePhone(raw: string, dialCode?: string | null): string {
  const digits = (raw ?? '').replace(/[^0-9]/g, '');
  const dial = (dialCode ?? '').replace(/[^0-9]/g, '');

  if (!digits) throw new BadRequestError('Enter your phone number');

  let e164: string;
  if (digits.startsWith('00')) {
    e164 = `+${digits.slice(2)}`;
  } else if (dial && digits.startsWith(dial) && digits.length > dial.length + 5) {
    // Already carries the country code. The length test keeps a local number
    // that happens to start with the same digits -- 252... in Somalia -- from
    // being read as international.
    e164 = `+${digits}`;
  } else if (dial) {
    e164 = `+${dial}${digits.replace(/^0+/, '')}`;
  } else {
    e164 = `+${digits.replace(/^0+/, '')}`;
  }

  if (!/^\+[1-9][0-9]{6,14}$/.test(e164)) {
    throw new BadRequestError('That does not look like a phone number');
  }
  return e164;
}

function secret(): string {
  const value = env.PHONE_IDENTITY_SECRET;
  if (!value) {
    throw new AppError(503, 'Phone sign-in is not available yet. Use your email address for now.', {
      code: 'phone_auth_unconfigured',
      expose: true,
    });
  }
  return value;
}

/**
 * The address a phone number signs in as.
 *
 * Stable for the life of the secret, which must therefore never be rotated:
 * every phone account is reachable only through its own address. If it ever
 * is lost, the numbers themselves are still in user_contacts.phone, so the
 * accounts can be matched up again by hand -- unpleasant, not fatal.
 */
export function addressFor(e164: string): string {
  const digest = createHmac('sha256', secret()).update(e164).digest('base64url').slice(0, 32);
  return `p${digest.toLowerCase()}@${PHONE_DOMAIN}`;
}

/** True for an account that signs in with a phone number. */
export function isPhoneAddress(email: string | null | undefined): boolean {
  return Boolean(email && email.endsWith(`@${PHONE_DOMAIN}`));
}

async function passwordGrant(email: string, password: string): Promise<PhoneSession> {
  const { data, error } = await anon.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    // Deliberately the same answer whether the number is unknown or the
    // password is wrong.
    throw new UnauthorizedError('Wrong phone number or password');
  }

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at ?? null,
    userId: data.session.user.id,
  };
}

export interface RegisterInput {
  phone: string;
  /** The country's dial code, e.g. "252". Clients read it from /locations. */
  dialCode?: string | null;
  password: string;
  fullName: string;
  languageCode?: string | null;
  currencyCode?: string | null;
}

export async function register(input: RegisterInput): Promise<PhoneSession & { phone: string }> {
  if (!hasServiceRole) {
    throw new AppError(503, 'Phone sign-up is not available yet. Use your email address for now.', {
      code: 'phone_auth_unconfigured',
      expose: true,
    });
  }

  const phone = normalizePhone(input.phone, input.dialCode);
  const email = addressFor(phone);

  const { error } = await admin().auth.admin.createUser({
    email,
    password: input.password,
    // Nothing to confirm: there is no inbox and no handset to send to. The
    // account is usable the moment it exists, which is the point.
    email_confirm: true,
    user_metadata: {
      full_name: input.fullName.trim(),
      // Picked up by handle_new_user() and written to user_contacts in E.164,
      // so the number is on the profile and reachable for support.
      phone,
      language_code: input.languageCode ?? 'en',
      currency_code: input.currencyCode ?? 'USD',
    },
    // Only the admin API can set this, which is what marks the account as one
    // of ours rather than an ordinary email sign-up.
    app_metadata: { identity: 'phone', phone },
  });

  if (error) {
    const message = error.message ?? '';
    if (/already|registered|exists/i.test(message)) {
      throw new ConflictError('An account already uses that phone number');
    }
    if (/password/i.test(message)) {
      throw new BadRequestError(message);
    }
    logger.warn({ err: error }, 'phone register failed');
    throw new AppError(502, 'Could not create that account', { code: 'signup_failed' });
  }

  const session = await passwordGrant(email, input.password);
  return { ...session, phone };
}

export interface SignInInput {
  phone: string;
  dialCode?: string | null;
  password: string;
}

export async function signIn(input: SignInInput): Promise<PhoneSession & { phone: string }> {
  const phone = normalizePhone(input.phone, input.dialCode);
  const session = await passwordGrant(addressFor(phone), input.password);
  return { ...session, phone };
}
