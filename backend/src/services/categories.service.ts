import { anon } from '../config/supabase.js';
import { FIVE_MINUTES, cached, invalidate } from '../utils/cache.js';
import { NotFoundError, fromPostgrest } from '../utils/errors.js';
import { DEFAULT_LANGUAGE, type LanguageCode } from '../validators/common.js';

export interface CategoryDto {
  id: number;
  slug: string;
  name: string;
  icon: string | null;
  imageUrl: string | null;
  accentColor: string | null;
  parentId: number | null;
  /** Which optional listing fields this category shows. See below. */
  fieldSchema: CategoryFieldSchema;
}

export interface CategoryTreeDto extends CategoryDto {
  children: CategoryDto[];
}

/**
 * Drives the dynamic part of the "post a listing" form.
 *
 * `core` names columns that already exist on products (brand, model, year...).
 * `extra` describes free-form attributes stored in products.attributes jsonb.
 *
 * This is why "Year / Mileage / Transmission" appears on Cars and
 * "Breed / Age / Sex" on Livestock without any client hard-coding a category.
 * Adding a field to a category is an admin edit, not an app release.
 */
export interface CategoryFieldSchema {
  core: string[];
  extra: CategoryExtraField[];
}

export interface CategoryExtraField {
  key: string;
  type: 'text' | 'number' | 'boolean' | 'enum' | 'date';
  options?: string[];
}

const TTL = FIVE_MINUTES;

interface CategoryRow {
  id: number;
  parent_id: number | null;
  slug: string;
  icon: string | null;
  image_url: string | null;
  accent_color: string | null;
  sort_order: number;
  field_schema: unknown;
}

async function loadAll(): Promise<{
  categories: CategoryRow[];
  namesByLang: Map<string, Map<number, string>>;
}> {
  return cached('categories:all', TTL, async () => {
    const [categories, translations] = await Promise.all([
      anon
        .from('categories')
        .select('id, parent_id, slug, icon, image_url, accent_color, sort_order, field_schema')
        .eq('is_active', true)
        .order('sort_order')
        .order('id'),
      anon.from('category_translations').select('category_id, language_code, name'),
    ]);

    if (categories.error) throw fromPostgrest(categories.error, 'Categories');
    if (translations.error) throw fromPostgrest(translations.error, 'Categories');

    const namesByLang = new Map<string, Map<number, string>>();
    for (const row of translations.data ?? []) {
      const bucket = namesByLang.get(row.language_code) ?? new Map<number, string>();
      bucket.set(row.category_id, row.name);
      namesByLang.set(row.language_code, bucket);
    }

    return { categories: (categories.data ?? []) as CategoryRow[], namesByLang };
  });
}

function nameFor(
  id: number,
  slug: string,
  lang: LanguageCode,
  namesByLang: Map<string, Map<number, string>>,
): string {
  // Requested language, then English, then the slug. A category with a missing
  // translation still renders as something a person can read.
  return (
    namesByLang.get(lang)?.get(id) ??
    namesByLang.get(DEFAULT_LANGUAGE)?.get(id) ??
    slug.replace(/-/g, ' ')
  );
}

function parseFieldSchema(value: unknown): CategoryFieldSchema {
  if (!value || typeof value !== 'object') return { core: [], extra: [] };
  const raw = value as { core?: unknown; extra?: unknown };
  return {
    core: Array.isArray(raw.core) ? raw.core.filter((v): v is string => typeof v === 'string') : [],
    extra: Array.isArray(raw.extra) ? (raw.extra as CategoryExtraField[]) : [],
  };
}

function toDto(
  row: CategoryRow,
  lang: LanguageCode,
  namesByLang: Map<string, Map<number, string>>,
): CategoryDto {
  return {
    id: row.id,
    slug: row.slug,
    name: nameFor(row.id, row.slug, lang, namesByLang),
    icon: row.icon,
    imageUrl: row.image_url,
    accentColor: row.accent_color,
    parentId: row.parent_id,
    fieldSchema: parseFieldSchema(row.field_schema),
  };
}

/** Top-level categories with their children nested. One request per app start. */
export async function categoryTree(lang: LanguageCode): Promise<CategoryTreeDto[]> {
  const { categories, namesByLang } = await loadAll();

  const childrenByParent = new Map<number, CategoryRow[]>();
  for (const row of categories) {
    if (row.parent_id == null) continue;
    const bucket = childrenByParent.get(row.parent_id) ?? [];
    bucket.push(row);
    childrenByParent.set(row.parent_id, bucket);
  }

  return categories
    .filter((row) => row.parent_id == null)
    .map((row) => ({
      ...toDto(row, lang, namesByLang),
      children: (childrenByParent.get(row.id) ?? []).map((child) =>
        toDto(child, lang, namesByLang),
      ),
    }));
}

/** Flat list, for filter dropdowns and admin pickers. */
export async function listCategories(lang: LanguageCode): Promise<CategoryDto[]> {
  const { categories, namesByLang } = await loadAll();
  return categories.map((row) => toDto(row, lang, namesByLang));
}

export async function getCategoryBySlug(slug: string, lang: LanguageCode): Promise<CategoryTreeDto> {
  const { categories, namesByLang } = await loadAll();
  const row = categories.find((category) => category.slug === slug);
  if (!row) throw new NotFoundError('Category');

  return {
    ...toDto(row, lang, namesByLang),
    children: categories
      .filter((child) => child.parent_id === row.id)
      .map((child) => toDto(child, lang, namesByLang)),
  };
}

export async function getCategoryById(id: number, lang: LanguageCode): Promise<CategoryDto> {
  const { categories, namesByLang } = await loadAll();
  const row = categories.find((category) => category.id === id);
  if (!row) throw new NotFoundError('Category');
  return toDto(row, lang, namesByLang);
}

/** Resolves a slug to an id without shipping the whole tree to the caller. */
export async function resolveCategoryId(slugOrId: string | number): Promise<number> {
  const { categories } = await loadAll();
  if (typeof slugOrId === 'number') {
    const byId = categories.find((category) => category.id === slugOrId);
    if (!byId) throw new NotFoundError('Category');
    return byId.id;
  }
  const numeric = Number(slugOrId);
  if (Number.isInteger(numeric) && numeric > 0) {
    return resolveCategoryId(numeric);
  }
  const bySlug = categories.find((category) => category.slug === slugOrId);
  if (!bySlug) throw new NotFoundError('Category');
  return bySlug.id;
}

export function invalidateCategoryCache(): void {
  invalidate('categories:');
}
