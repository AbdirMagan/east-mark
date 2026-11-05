import { describe, expect, it, beforeEach } from 'vitest';

import { cached, clearCache, invalidate } from '../src/utils/cache.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  fromPostgrest,
} from '../src/utils/errors.js';
import { buildPageMeta } from '../src/utils/response.js';
import { asTranslations, translate } from '../src/utils/localize.js';
import { productSearchQuery } from '../src/validators/products.schema.js';
import { phone } from '../src/validators/common.js';

describe('error translation from PostgREST', () => {
  const pg = (code: string) => ({ code, message: 'raw postgres detail', details: '', hint: '', name: 'PostgrestError' });

  it('maps insufficient_privilege to 403, not 500', () => {
    // RLS and column grants make "permission denied" an expected outcome.
    // Returning 500 would bury real authorisation bugs in outage noise.
    const error = fromPostgrest(pg('42501') as never);
    expect(error).toBeInstanceOf(ForbiddenError);
    expect(error.status).toBe(403);
  });

  it('maps a missing row to 404', () => {
    expect(fromPostgrest(pg('PGRST116') as never).status).toBe(404);
    expect(fromPostgrest(pg('P0002') as never)).toBeInstanceOf(NotFoundError);
  });

  it('maps a unique violation to 409', () => {
    expect(fromPostgrest(pg('23505') as never)).toBeInstanceOf(ConflictError);
  });

  it('turns a rejected Supabase key into setup guidance, not a generic 500', () => {
    // A placeholder service-role key otherwise surfaces as "Something went
    // wrong on our side" on every moderation action, with no hint why.
    const error = fromPostgrest({ message: 'Invalid API key', details: '', hint: '', code: '', name: 'PostgrestError' } as never);
    expect(error.status).toBe(503);
    expect(error.expose).toBe(true);
    expect(error.message).toContain('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('never leaks the raw postgres message on a 500', () => {
    const error = fromPostgrest(pg('XX000') as never);
    expect(error.status).toBe(500);
    expect(error.expose).toBe(false);
    expect(error.message).not.toContain('raw postgres detail');
    // The original is kept for the logs.
    expect(error.cause).toMatchObject({ message: 'raw postgres detail' });
  });

  it('exposes 4xx messages to the caller', () => {
    expect(new ValidationError({ title: ['required'] }).expose).toBe(true);
  });
});

describe('search query validation', () => {
  it('applies defaults', () => {
    const result = productSearchQuery.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.sort).toBe('newest');
    expect(result.includeSubcategories).toBe(true);
  });

  it('coerces query-string values', () => {
    const result = productSearchQuery.parse({ page: '3', limit: '50', minPrice: '1000' });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(50);
    expect(result.minPrice).toBe(1000);
  });

  it('parses a comma-separated condition list', () => {
    expect(productSearchQuery.parse({ conditions: 'new,used' }).conditions).toEqual(['new', 'used']);
  });

  it('caps limit at 100', () => {
    expect(productSearchQuery.safeParse({ limit: '5000' }).success).toBe(false);
  });

  it('rejects an inverted price range', () => {
    const result = productSearchQuery.safeParse({ minPrice: 900, maxPrice: 100 });
    expect(result.success).toBe(false);
  });

  it('rejects sort=nearest without coordinates', () => {
    expect(productSearchQuery.safeParse({ sort: 'nearest' }).success).toBe(false);
    expect(productSearchQuery.safeParse({ sort: 'nearest', lat: 9.56, lng: 44.06 }).success).toBe(true);
  });

  it('rejects a radius without coordinates', () => {
    expect(productSearchQuery.safeParse({ radiusKm: 50 }).success).toBe(false);
  });
});

describe('phone validation', () => {
  it('accepts E.164 numbers for every launch market', () => {
    for (const value of ['+252634111111', '+251911234567', '+254722222222']) {
      expect(phone.safeParse(value).success).toBe(true);
    }
  });

  it('rejects local formats the database would refuse', () => {
    for (const value of ['0634111111', '252634111111', '+0634111111', 'not a phone']) {
      expect(phone.safeParse(value).success).toBe(false);
    }
  });
});

describe('localisation fallback', () => {
  it('returns the translation when present', () => {
    expect(translate({ so: 'Hargeysa' }, 'Hargeisa', 'so')).toBe('Hargeysa');
  });

  it('falls back to the canonical name rather than rendering blank', () => {
    // Seeding every city in four languages is ongoing; a half-translated row
    // must never show as an empty chip.
    expect(translate({ so: 'Hargeysa' }, 'Hargeisa', 'am')).toBe('Hargeisa');
    expect(translate(null, 'Hargeisa', 'sw')).toBe('Hargeisa');
    expect(translate({ so: '   ' }, 'Hargeisa', 'so')).toBe('Hargeisa');
  });

  it('narrows non-object jsonb safely', () => {
    expect(asTranslations('nope')).toBeNull();
    expect(asTranslations(['a'])).toBeNull();
    expect(asTranslations({ so: 'x' })).toEqual({ so: 'x' });
  });
});

describe('pagination metadata', () => {
  it('computes page counts', () => {
    expect(buildPageMeta(45, 1, 20)).toEqual({
      page: 1, limit: 20, total: 45, totalPages: 3, hasMore: true,
    });
    expect(buildPageMeta(45, 3, 20).hasMore).toBe(false);
    expect(buildPageMeta(0, 1, 20)).toEqual({
      page: 1, limit: 20, total: 0, totalPages: 0, hasMore: false,
    });
  });
});

describe('reference-data cache', () => {
  beforeEach(() => clearCache());

  it('serves the second read from memory', async () => {
    let calls = 0;
    const load = async () => { calls += 1; return 'value'; };
    expect(await cached('k', 1000, load)).toBe('value');
    expect(await cached('k', 1000, load)).toBe('value');
    expect(calls).toBe(1);
  });

  it('collapses concurrent cold reads into one load', async () => {
    // Without this, every app start after a TTL expiry stampedes the database.
    let calls = 0;
    const load = async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 20));
      return calls;
    };
    await Promise.all([cached('x', 1000, load), cached('x', 1000, load), cached('x', 1000, load)]);
    expect(calls).toBe(1);
  });

  it('re-loads once the ttl has passed', async () => {
    let calls = 0;
    const load = async () => { calls += 1; return calls; };
    await cached('t', 1, load);
    await new Promise((r) => setTimeout(r, 10));
    await cached('t', 1, load);
    expect(calls).toBe(2);
  });

  it('invalidates a whole prefix', async () => {
    let calls = 0;
    const load = async () => { calls += 1; return calls; };
    await cached('locations:countries', 10_000, load);
    await cached('locations:cities', 10_000, load);
    expect(calls).toBe(2);
    invalidate('locations:');
    await cached('locations:countries', 10_000, load);
    expect(calls).toBe(3);
  });
});


describe('promotion links', () => {
  it('builds internal routes and refuses anything that could leave the site unsafely', async () => {
    const { linkFor } = await import('../src/services/ads.service.js');
    expect(linkFor('category', 'electronics')).toBe('/browse?category=electronics');
    expect(linkFor('search', '')).toBe('/browse');
    expect(linkFor('product', '100013')).toBe('/product/100013');
    expect(linkFor('url', '/sell')).toBe('/sell');
    expect(linkFor('url', 'https://example.com/deal')).toBe('https://example.com/deal');
    expect(linkFor('url', '//evil.example')).toBeNull();
    expect(linkFor('url', 'javascript:alert(1)')).toBeNull();
    expect(linkFor('product', 'abc')).toBeNull();
  });
});


describe('push gating', () => {
  it('reads a quiet-hours window that wraps midnight', async () => {
    const { inQuietHours } = await import('../src/services/push.service.js');
    const at = (hour: number, minute = 0) => new Date(2026, 0, 1, hour, minute);

    // The ordinary case: 22:00 to 07:00 is one window, not two.
    expect(inQuietHours('22:00', '07:00', at(23))).toBe(true);
    expect(inQuietHours('22:00', '07:00', at(3))).toBe(true);
    expect(inQuietHours('22:00', '07:00', at(7))).toBe(false);
    expect(inQuietHours('22:00', '07:00', at(12))).toBe(false);

    // A daytime window stays a daytime window.
    expect(inQuietHours('09:00', '17:00', at(12))).toBe(true);
    expect(inQuietHours('09:00', '17:00', at(20))).toBe(false);

    // Unset, or a zero-length window, silences nothing.
    expect(inQuietHours(null, '07:00', at(3))).toBe(false);
    expect(inQuietHours('22:00', '22:00', at(22))).toBe(false);
  });

  it('respects the switch, the per-type override and the quiet window', async () => {
    const { shouldPush } = await import('../src/services/push.service.js');
    const noon = new Date(2026, 0, 1, 12);
    const base = { push_enabled: true, type_overrides: null, quiet_hours_start: null, quiet_hours_end: null };

    // No row yet: the schema's default is on, so a new account still hears.
    expect(shouldPush(null, 'new_message', noon)).toBe(true);
    expect(shouldPush(base, 'new_message', noon)).toBe(true);
    expect(shouldPush({ ...base, push_enabled: false }, 'new_message', noon)).toBe(false);

    // An override is per type: silencing one does not silence the rest.
    const muted = { ...base, type_overrides: { new_message: false } };
    expect(shouldPush(muted, 'new_message', noon)).toBe(false);
    expect(shouldPush(muted, 'listing_approved', noon)).toBe(true);

    const night = { ...base, quiet_hours_start: '22:00', quiet_hours_end: '07:00' };
    expect(shouldPush(night, 'new_message', new Date(2026, 0, 1, 23))).toBe(false);
    expect(shouldPush(night, 'new_message', noon)).toBe(true);
  });

  it('tells an Expo token from a browser subscription', async () => {
    const { isExpoToken, parseWebSubscription } = await import('../src/services/push.service.js');

    expect(isExpoToken('ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]')).toBe(true);
    expect(isExpoToken('ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx]')).toBe(true);
    expect(isExpoToken('fcm-looking-token-0123456789')).toBe(false);

    const subscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
      keys: { p256dh: 'key', auth: 'auth' },
    };
    expect(parseWebSubscription(JSON.stringify(subscription))?.endpoint).toBe(subscription.endpoint);

    // Half a subscription is no subscription: sending to it would throw
    // inside web-push on every notification until the row was cleaned up.
    expect(parseWebSubscription(JSON.stringify({ endpoint: 'https://x' }))).toBeNull();
    expect(parseWebSubscription('ExponentPushToken[xxx]')).toBeNull();
  });
});


describe('phone numbers as credentials', () => {
  it('reads the same number however it was typed', async () => {
    const { normalizePhone } = await import('../src/services/phoneAuth.service.js');

    // Somaliland and Somalia, dial code 252. All of these are one number.
    expect(normalizePhone('0634400000', '252')).toBe('+252634400000');
    expect(normalizePhone('063 440 0000', '252')).toBe('+252634400000');
    expect(normalizePhone('+252 63 440 0000', '252')).toBe('+252634400000');
    expect(normalizePhone('00252634400000', '252')).toBe('+252634400000');
    expect(normalizePhone('634400000', '252')).toBe('+252634400000');

    // Kenya, Ethiopia, Djibouti.
    expect(normalizePhone('0712345678', '254')).toBe('+254712345678');
    expect(normalizePhone('0911234567', '251')).toBe('+251911234567');
    expect(normalizePhone('77123456', '253')).toBe('+25377123456');
  });

  it('refuses what is not a phone number', async () => {
    const { normalizePhone } = await import('../src/services/phoneAuth.service.js');
    expect(() => normalizePhone('', '252')).toThrow();
    expect(() => normalizePhone('12', '252')).toThrow();
    expect(() => normalizePhone('abc', '252')).toThrow();
  });

  it('derives an address that is stable, unique and not guessable', async () => {
    process.env.PHONE_IDENTITY_SECRET ??= 'a'.repeat(48);
    const { addressFor, isPhoneAddress } = await import('../src/services/phoneAuth.service.js');

    const address = addressFor('+252634400000');
    // Stable, or everyone with a phone account is locked out on the next call.
    expect(addressFor('+252634400000')).toBe(address);
    // Distinct per number, which is what makes Supabase's unique index on the
    // address do the "one number, one account" work for us.
    expect(addressFor('+252634400001')).not.toBe(address);
    // The number itself must not be readable from the address: that is what
    // stops someone claiming a number by signing up for its address.
    expect(address).not.toContain('252634400000');
    expect(address.endsWith('@phone.invalid')).toBe(true);

    expect(isPhoneAddress(address)).toBe(true);
    expect(isPhoneAddress('someone@example.com')).toBe(false);
    expect(isPhoneAddress(null)).toBe(false);
  });
});
