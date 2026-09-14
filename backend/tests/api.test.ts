import type { Express } from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * Contract tests for the public API surface.
 *
 * These run against the configured Supabase project rather than a mock. The
 * value of this suite is catching a drift between the schema and the API —
 * a renamed column, a changed RLS policy, an RPC signature that moved — and a
 * mock would be rewritten to match the code rather than the database, which is
 * exactly the bug class these are meant to find.
 */

let app: Express;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  const { createApp } = await import('../src/app.js');
  app = createApp();
});

describe('health', () => {
  it('reports liveness without touching the database', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });

  it('reports readiness by querying the database', async () => {
    const res = await request(app).get('/health/ready').expect(200);
    expect(res.body.data.database).toBe('ok');
  });
});

describe('response envelope', () => {
  it('wraps success in { success, data, message }', async () => {
    const res = await request(app).get('/api/v1/locations/countries').expect(200);
    expect(res.body).toMatchObject({ success: true, message: expect.any(String) });
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('wraps failure in { success, message, code } with a request id', async () => {
    const res = await request(app).get('/api/v1/products/not-a-uuid').expect(422);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('validation_failed');
    expect(res.body.errors).toBeDefined();
    expect(res.body.requestId).toEqual(expect.any(String));
  });

  it('echoes the correlation id in a header', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.headers['x-request-id']).toEqual(expect.any(String));
  });
});

describe('locations', () => {
  it('lists the four launch countries', async () => {
    const res = await request(app).get('/api/v1/locations/countries').expect(200);
    const codes = res.body.data.map((c: { code: string }) => c.code).sort();
    expect(codes).toEqual(['ET', 'KE', 'SO', 'XA']);
  });

  it('carries the dial code each country needs for phone entry', async () => {
    const res = await request(app).get('/api/v1/locations/countries').expect(200);
    const byCode = Object.fromEntries(
      res.body.data.map((c: { code: string; dialCode: string }) => [c.code, c.dialCode]),
    );
    expect(byCode.XA).toBe('+252');
    expect(byCode.SO).toBe('+252');
    expect(byCode.ET).toBe('+251');
    expect(byCode.KE).toBe('+254');
  });

  it('returns the whole hierarchy for one country in a single request', async () => {
    const res = await request(app).get('/api/v1/locations/countries/XA/tree').expect(200);
    expect(res.body.data.regions.length).toBeGreaterThan(0);
    const cities = res.body.data.regions.flatMap((r: { cities: unknown[] }) => r.cities);
    expect(cities.length).toBeGreaterThan(0);
    expect(cities.some((c: { name: string }) => c.name === 'Hargeisa')).toBe(true);
  });

  it('resolves a GPS fix to the nearest city', async () => {
    const res = await request(app)
      .get('/api/v1/locations/nearest?lat=9.56&lng=44.065')
      .expect(200);
    expect(res.body.data.name).toBe('Hargeisa');
    expect(res.body.data.distanceKm).toBeLessThan(5);
  });

  it('marks reference data as cacheable', async () => {
    const res = await request(app).get('/api/v1/locations/countries').expect(200);
    expect(res.headers['cache-control']).toContain('max-age');
  });
});

describe('categories', () => {
  it('returns 25 top-level categories with children nested', async () => {
    const res = await request(app).get('/api/v1/categories').expect(200);
    expect(res.body.data).toHaveLength(25);
    const cars = res.body.data.find((c: { slug: string }) => c.slug === 'cars');
    expect(cars.children.map((c: { slug: string }) => c.slug)).toContain('cars-sale');
  });

  it('localises names into all four languages', async () => {
    const expected: Record<string, string> = {
      en: 'Cars',
      so: 'Baabuur',
      am: 'መኪኖች',
      sw: 'Magari',
    };
    for (const [lang, name] of Object.entries(expected)) {
      const res = await request(app).get(`/api/v1/categories?lang=${lang}`).expect(200);
      const cars = res.body.data.find((c: { slug: string }) => c.slug === 'cars');
      expect(cars.name, `category name in ${lang}`).toBe(name);
    }
  });

  it('carries the field schema that drives the listing form', async () => {
    // This is what keeps "Year / Mileage / Transmission" on Cars and off
    // Livestock without any client hard-coding a category.
    const cars = (await request(app).get('/api/v1/categories/cars').expect(200)).body.data;
    expect(cars.fieldSchema.core).toContain('year');
    const keys = cars.fieldSchema.extra.map((f: { key: string }) => f.key);
    expect(keys).toContain('mileage_km');
    expect(keys).toContain('transmission');

    const livestock = (await request(app).get('/api/v1/categories/livestock').expect(200)).body.data;
    expect(livestock.fieldSchema.core).not.toContain('year');
    expect(livestock.fieldSchema.extra.map((f: { key: string }) => f.key)).toContain('breed');
  });

  it('404s an unknown category', async () => {
    await request(app).get('/api/v1/categories/does-not-exist').expect(404);
  });
});

describe('products', () => {
  it('returns a paginated feed', async () => {
    const res = await request(app).get('/api/v1/products?limit=5').expect(200);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 5 });
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('rejects an unknown sort option', async () => {
    const res = await request(app).get('/api/v1/products?sort=cheapest').expect(422);
    expect(res.body.errors.sort).toBeDefined();
  });

  it('404s a listing that does not exist', async () => {
    await request(app).get('/api/v1/products/ref/999999999').expect(404);
    await request(app)
      .get('/api/v1/products/00000000-0000-0000-0000-000000000000')
      .expect(404);
  });
});

describe('authentication boundary', () => {
  const protectedRoutes: Array<[string, string]> = [
    ['get', '/api/v1/users/me'],
    ['get', '/api/v1/users/me/favorites'],
    ['get', '/api/v1/products/mine'],
    ['get', '/api/v1/products/recommended'],
    ['post', '/api/v1/products'],
  ];

  it.each(protectedRoutes)('rejects %s %s without a token', async (method, path) => {
    const res = await (request(app) as never as Record<string, (p: string) => request.Test>)[method]!(path);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('unauthorized');
  });

  it('rejects a forged token', async () => {
    await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJoYWNrZXIifQ.nope')
      .expect(401);
  });

  it('ignores a bad token on an optional-auth route instead of failing', async () => {
    // Browsing must keep working when a session quietly expires mid-scroll.
    await request(app)
      .get('/api/v1/products')
      .set('Authorization', 'Bearer garbage')
      .expect(200);
  });
});

describe('config', () => {
  it('exposes public settings, languages and currencies', async () => {
    const res = await request(app).get('/api/v1/config').expect(200);
    expect(res.body.data.languages.map((l: { code: string }) => l.code).sort()).toEqual([
      'am', 'en', 'so', 'sw',
    ]);
    expect(res.body.data.currencies.map((c: { code: string }) => c.code)).toContain('SLSH');
    // Remote feature flags let a capability be turned off without an app release.
    expect(res.body.data.settings.features).toBeDefined();
    expect(res.body.data.settings.media.format).toBe('webp');
  });

  it('never exposes a private setting', async () => {
    const res = await request(app).get('/api/v1/config').expect(200);
    // `moderation` is flagged is_public = false in the database.
    expect(res.body.data.settings.moderation).toBeUndefined();
  });
});
