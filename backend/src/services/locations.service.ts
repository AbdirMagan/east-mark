import { anon } from '../config/supabase.js';
import { FIVE_MINUTES, cached, invalidate } from '../utils/cache.js';
import { NotFoundError, fromPostgrest } from '../utils/errors.js';
import { asTranslations, translate } from '../utils/localize.js';
import type { LanguageCode } from '../validators/common.js';

export interface CountryDto {
  id: number;
  code: string;
  name: string;
  dialCode: string;
  flag: string | null;
  defaultCurrency: string | null;
  defaultLanguage: string | null;
  phoneLength: number | null;
}

export interface PlaceDto {
  id: number;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  isMajor?: boolean;
}

export interface CountryTreeDto extends CountryDto {
  regions: Array<PlaceDto & { cities: Array<PlaceDto & { districts: PlaceDto[] }> }>;
}

const TTL = FIVE_MINUTES;

/**
 * Every read here goes through the anonymous client. The location tables are
 * public reference data — `*_public_read` policies expose active rows to anon —
 * so there is no reason to reach for the service-role key.
 */

export async function listCountries(lang: LanguageCode): Promise<CountryDto[]> {
  const rows = await cached('locations:countries', TTL, async () => {
    const { data, error } = await anon
      .from('countries')
      .select(
        'id, code, name, translations, dial_code, flag_emoji, default_currency_code, default_language_code, phone_number_length',
      )
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw fromPostgrest(error, 'Countries');
    return data ?? [];
  });

  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: translate(asTranslations(row.translations), row.name, lang),
    dialCode: row.dial_code,
    flag: row.flag_emoji,
    defaultCurrency: row.default_currency_code,
    defaultLanguage: row.default_language_code,
    phoneLength: row.phone_number_length,
  }));
}

export async function listRegions(countryId: number, lang: LanguageCode): Promise<PlaceDto[]> {
  const rows = await cached(`locations:regions:${countryId}`, TTL, async () => {
    const { data, error } = await anon
      .from('regions')
      .select('id, name, translations')
      .eq('country_id', countryId)
      .eq('is_active', true)
      .order('sort_order')
      .order('name');
    if (error) throw fromPostgrest(error, 'Regions');
    return data ?? [];
  });

  return rows.map((row) => ({
    id: row.id,
    name: translate(asTranslations(row.translations), row.name, lang),
  }));
}

export async function listCities(
  filters: { regionId?: number; countryId?: number; majorOnly?: boolean; query?: string },
  lang: LanguageCode,
): Promise<PlaceDto[]> {
  // Free-text city lookup is not cached: the key space is unbounded.
  if (filters.query) {
    let builder = anon
      .from('cities')
      .select('id, name, translations, latitude, longitude, is_major')
      .eq('is_active', true)
      .ilike('name', `%${filters.query}%`)
      .order('is_major', { ascending: false })
      .order('sort_order')
      .limit(25);

    if (filters.countryId) builder = builder.eq('country_id', filters.countryId);
    if (filters.regionId) builder = builder.eq('region_id', filters.regionId);

    const { data, error } = await builder;
    if (error) throw fromPostgrest(error, 'Cities');
    return (data ?? []).map((row) => toPlace(row, lang));
  }

  const scope = filters.regionId
    ? `region:${filters.regionId}`
    : filters.countryId
      ? `country:${filters.countryId}${filters.majorOnly ? ':major' : ''}`
      : 'all';

  const rows = await cached(`locations:cities:${scope}`, TTL, async () => {
    let builder = anon
      .from('cities')
      .select('id, name, translations, latitude, longitude, is_major')
      .eq('is_active', true)
      .order('sort_order')
      .order('name');

    if (filters.regionId) builder = builder.eq('region_id', filters.regionId);
    if (filters.countryId) builder = builder.eq('country_id', filters.countryId);
    if (filters.majorOnly) builder = builder.eq('is_major', true);

    const { data, error } = await builder;
    if (error) throw fromPostgrest(error, 'Cities');
    return data ?? [];
  });

  return rows.map((row) => toPlace(row, lang));
}

export async function listDistricts(cityId: number, lang: LanguageCode): Promise<PlaceDto[]> {
  const rows = await cached(`locations:districts:${cityId}`, TTL, async () => {
    const { data, error } = await anon
      .from('districts')
      .select('id, name, translations, latitude, longitude')
      .eq('city_id', cityId)
      .eq('is_active', true)
      .order('sort_order')
      .order('name');
    if (error) throw fromPostgrest(error, 'Districts');
    return data ?? [];
  });

  return rows.map((row) => toPlace(row, lang));
}

export async function listNeighborhoods(
  districtId: number,
  lang: LanguageCode,
): Promise<PlaceDto[]> {
  const rows = await cached(`locations:neighborhoods:${districtId}`, TTL, async () => {
    const { data, error } = await anon
      .from('neighborhoods')
      .select('id, name, translations, latitude, longitude')
      .eq('district_id', districtId)
      .eq('is_active', true)
      .order('sort_order')
      .order('name');
    if (error) throw fromPostgrest(error, 'Neighborhoods');
    return data ?? [];
  });

  return rows.map((row) => toPlace(row, lang));
}

/**
 * The whole hierarchy for one country in a single response.
 *
 * The alternative is four sequential round trips while a user drills from
 * country to neighbourhood, each one a full latency penalty on a slow link.
 * Clients fetch this once, cache it, and drive the entire location picker
 * offline. One country is a few tens of kilobytes.
 */
export async function countryTree(countryCode: string, lang: LanguageCode): Promise<CountryTreeDto> {
  const key = `locations:tree:${countryCode.toUpperCase()}`;

  const tree = await cached(key, TTL, async () => {
    const { data: country, error: countryError } = await anon
      .from('countries')
      .select(
        'id, code, name, translations, dial_code, flag_emoji, default_currency_code, default_language_code, phone_number_length',
      )
      .eq('code', countryCode.toUpperCase())
      .eq('is_active', true)
      .maybeSingle();

    if (countryError) throw fromPostgrest(countryError, 'Country');
    if (!country) throw new NotFoundError('Country');

    // Three flat queries, assembled in memory. Nested PostgREST embedding
    // would work, but it returns a deeply nested payload that is slower to
    // parse and harder to page if a country ever grows very large.
    const [regions, cities, districts] = await Promise.all([
      anon
        .from('regions')
        .select('id, name, translations')
        .eq('country_id', country.id)
        .eq('is_active', true)
        .order('sort_order'),
      anon
        .from('cities')
        .select('id, region_id, name, translations, latitude, longitude, is_major')
        .eq('country_id', country.id)
        .eq('is_active', true)
        .order('sort_order'),
      anon
        .from('districts')
        .select('id, city_id, name, translations, latitude, longitude')
        .eq('is_active', true)
        .order('sort_order'),
    ]);

    if (regions.error) throw fromPostgrest(regions.error, 'Regions');
    if (cities.error) throw fromPostgrest(cities.error, 'Cities');
    if (districts.error) throw fromPostgrest(districts.error, 'Districts');

    const cityIds = new Set((cities.data ?? []).map((city) => city.id));
    const districtsByCity = new Map<number, typeof districts.data>();
    for (const district of districts.data ?? []) {
      if (!cityIds.has(district.city_id)) continue;
      const bucket = districtsByCity.get(district.city_id) ?? [];
      bucket.push(district);
      districtsByCity.set(district.city_id, bucket);
    }

    const citiesByRegion = new Map<number, typeof cities.data>();
    for (const city of cities.data ?? []) {
      const bucket = citiesByRegion.get(city.region_id) ?? [];
      bucket.push(city);
      citiesByRegion.set(city.region_id, bucket);
    }

    return { country, regions: regions.data ?? [], citiesByRegion, districtsByCity };
  });

  const { country, regions, citiesByRegion, districtsByCity } = tree;

  return {
    id: country.id,
    code: country.code,
    name: translate(asTranslations(country.translations), country.name, lang),
    dialCode: country.dial_code,
    flag: country.flag_emoji,
    defaultCurrency: country.default_currency_code,
    defaultLanguage: country.default_language_code,
    phoneLength: country.phone_number_length,
    regions: regions.map((region) => ({
      id: region.id,
      name: translate(asTranslations(region.translations), region.name, lang),
      cities: (citiesByRegion.get(region.id) ?? []).map((city) => ({
        ...toPlace(city, lang),
        districts: (districtsByCity.get(city.id) ?? []).map((district) =>
          toPlace(district, lang),
        ),
      })),
    })),
  };
}

/**
 * Nearest city to a coordinate, for "use my location" during onboarding and
 * when creating a listing.
 *
 * Uses the same haversine helper as search_products' distance sort, so a GPS
 * fix and a "sort by nearest" result agree about what nearby means.
 */
export async function nearestCity(
  lat: number,
  lng: number,
  lang: LanguageCode,
): Promise<(PlaceDto & { distanceKm: number; countryCode: string; regionId: number }) | null> {
  const rows = await cached('locations:cities:geo', TTL, async () => {
    const { data, error } = await anon
      .from('cities')
      .select('id, region_id, country_id, name, translations, latitude, longitude, is_major')
      .eq('is_active', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);
    if (error) throw fromPostgrest(error, 'Cities');
    return data ?? [];
  });

  const countries = await cached('locations:country-codes', TTL, async () => {
    const { data, error } = await anon.from('countries').select('id, code');
    if (error) throw fromPostgrest(error, 'Countries');
    return new Map((data ?? []).map((row) => [row.id, row.code]));
  });

  let best: { row: (typeof rows)[number]; distance: number } | null = null;
  for (const row of rows) {
    if (row.latitude == null || row.longitude == null) continue;
    const distance = haversineKm(lat, lng, row.latitude, row.longitude);
    if (!best || distance < best.distance) best = { row, distance };
  }

  if (!best) return null;

  return {
    ...toPlace(best.row, lang),
    distanceKm: Math.round(best.distance * 10) / 10,
    countryCode: countries.get(best.row.country_id) ?? '',
    regionId: best.row.region_id,
  };
}

/** Called by the admin controller after any location edit. */
export function invalidateLocationCache(): void {
  invalidate('locations:');
}

interface PlaceRow {
  id: number;
  name: string;
  translations: unknown;
  latitude?: number | null;
  longitude?: number | null;
  is_major?: boolean;
}

function toPlace(row: PlaceRow, lang: LanguageCode): PlaceDto {
  const place: PlaceDto = {
    id: row.id,
    name: translate(asTranslations(row.translations), row.name, lang),
  };
  if (row.latitude != null) place.latitude = row.latitude;
  if (row.longitude != null) place.longitude = row.longitude;
  if (row.is_major !== undefined) place.isMajor = row.is_major;
  return place;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}
