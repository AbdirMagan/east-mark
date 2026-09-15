import { anon } from '../config/supabase.js';
import { FIVE_MINUTES, cached, invalidate } from '../utils/cache.js';
import { fromPostgrest } from '../utils/errors.js';
import { DEFAULT_LANGUAGE, type LanguageCode } from '../validators/common.js';

/**
 * Advertisements served to the apps. Today that is the home carousel
 * (placement 'home_hero'): the same slides, in the same order, on the web and
 * in the Android app, so a promotion is set up once in the admin dashboard and
 * shows everywhere.
 *
 * Reads go through the anon client. The 0009 policy only exposes ads that are
 * running and inside their date window, so a draft or an expired promotion
 * cannot leak through this endpoint whatever the query says.
 */

export const AD_THEMES = ['night', 'acacia', 'clay', 'sun', 'navy'] as const;
export type AdTheme = (typeof AD_THEMES)[number];

export const AD_PLACEMENTS = [
  'home_hero',
  'home_banner',
  'search_inline',
  'category_banner',
  'product_detail',
  'sponsored_product',
] as const;
export type AdPlacement = (typeof AD_PLACEMENTS)[number];

export const AD_TARGET_TYPES = ['url', 'product', 'business', 'category', 'search'] as const;

export interface AdDto {
  id: string;
  title: string;
  subtitle: string | null;
  /** Short sticker text, e.g. "UP TO 60% OFF". */
  badge: string | null;
  ctaLabel: string | null;
  theme: AdTheme;
  /** Glyph name shared by the web Icon set and Android's ic_cat_* drawables. */
  icon: string | null;
  imageUrl: string | null;
  targetType: string;
  targetValue: string | null;
  /** Where a tap goes inside the web app; null when the slide is not a link. */
  link: string | null;
  /** For category targets, the category id the Android app filters by. */
  categoryId: number | null;
}

interface AdRow {
  id: string;
  title: string;
  subtitle: string | null;
  badge: string | null;
  cta_label: string | null;
  theme: string;
  icon: string | null;
  image_url: string | null;
  target_type: string;
  target_value: string | null;
  translations: unknown;
  country_ids: number[] | null;
  language_codes: string[] | null;
}

type SlideCopy = Partial<Record<'title' | 'subtitle' | 'badge' | 'cta_label', string>>;

// Short, because staff expect an edited promotion to show up promptly.
const TTL = 60_000;

export function invalidateAdsCache(): void {
  invalidate('ads:');
}

async function loadRunning(placement: AdPlacement): Promise<AdRow[]> {
  return cached(`ads:${placement}`, TTL, async () => {
    const now = new Date().toISOString();
    const { data, error } = await anon
      .from('advertisements')
      .select(
        'id, title, subtitle, badge, cta_label, theme, icon, image_url, target_type, target_value, translations, country_ids, language_codes',
      )
      .eq('placement', placement)
      .eq('status', 'running')
      .lte('starts_at', now)
      .or(`ends_at.is.null,ends_at.gt.${now}`)
      .order('priority', { ascending: false })
      .order('starts_at', { ascending: false })
      .limit(12);

    if (error) throw fromPostgrest(error, 'Advertisements');
    return (data ?? []) as unknown as AdRow[];
  });
}

async function categoryIdsBySlug(): Promise<Map<string, number>> {
  return cached('ads:category-ids', FIVE_MINUTES, async () => {
    const { data, error } = await anon.from('categories').select('id, slug');
    if (error) throw fromPostgrest(error, 'Categories');
    return new Map((data ?? []).map((row) => [row.slug, row.id]));
  });
}

/**
 * Turns a target into a web route. Only internal paths and https URLs are
 * accepted: a promotion must never be able to send someone to javascript: or
 * a protocol-relative //other-site link.
 */
export function linkFor(type: string, value: string | null): string | null {
  const v = value?.trim() ?? '';
  switch (type) {
    case 'category':
      return v ? `/browse?category=${encodeURIComponent(v)}` : '/browse';
    case 'search':
      return v ? `/browse?q=${encodeURIComponent(v)}` : '/browse';
    case 'product':
      return /^\d+$/.test(v) ? `/product/${v}` : null;
    case 'url':
      if (v.startsWith('/') && !v.startsWith('//')) return v;
      return /^https:\/\/[^\s]+$/i.test(v) ? v : null;
    default:
      return null;
  }
}

function copyFor(translations: unknown, lang: LanguageCode): SlideCopy {
  if (lang === DEFAULT_LANGUAGE || !translations || typeof translations !== 'object') return {};
  const entry = (translations as Record<string, unknown>)[lang];
  if (!entry || typeof entry !== 'object') return {};

  const copy: SlideCopy = {};
  for (const key of ['title', 'subtitle', 'badge', 'cta_label'] as const) {
    const value = (entry as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim()) copy[key] = value;
  }
  return copy;
}

function asTheme(value: string): AdTheme {
  return (AD_THEMES as readonly string[]).includes(value) ? (value as AdTheme) : 'night';
}

export async function listAds(options: {
  placement: AdPlacement;
  lang: LanguageCode;
  countryId?: number;
}): Promise<AdDto[]> {
  const [rows, categoryIds] = await Promise.all([loadRunning(options.placement), categoryIdsBySlug()]);

  return rows
    .filter((row) => {
      // Empty targeting arrays mean "everywhere" / "every language".
      const countries = row.country_ids ?? [];
      const languages = row.language_codes ?? [];
      const countryOk = !options.countryId || countries.length === 0 || countries.includes(options.countryId);
      const languageOk = languages.length === 0 || languages.includes(options.lang);
      return countryOk && languageOk;
    })
    .map((row) => {
      const copy = copyFor(row.translations, options.lang);
      return {
        id: row.id,
        title: copy.title ?? row.title,
        subtitle: copy.subtitle ?? row.subtitle,
        badge: copy.badge ?? row.badge,
        ctaLabel: copy.cta_label ?? row.cta_label,
        theme: asTheme(row.theme),
        icon: row.icon,
        imageUrl: row.image_url,
        targetType: row.target_type,
        targetValue: row.target_value,
        link: linkFor(row.target_type, row.target_value),
        categoryId:
          row.target_type === 'category' && row.target_value
            ? (categoryIds.get(row.target_value) ?? null)
            : null,
      };
    });
}

/** Best effort: a failed click counter must never break the tap. */
export async function recordClick(id: string): Promise<void> {
  const { error } = await anon.rpc('record_ad_click', { p_ad_id: id });
  if (error) console.warn('[ads] could not record click on %s: %s', id, error.message);
}
