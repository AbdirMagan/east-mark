import { useMemo, useState } from 'react';

import { useT } from '../../i18n/index.js';
import type { Category, CategoryField, CategoryTree } from '../../lib/api.js';
import { Icon } from '../ui/Icon.js';
import { Checkbox, SelectField, TextField } from '../ui/index.js';

/* -------------------------------------------------------------------------- */
/* Category picker                                                            */
/* -------------------------------------------------------------------------- */

interface CategoryStepProps {
  categories: CategoryTree[];
  selected: { parent: CategoryTree; child: Category | null } | null;
  onSelect: (parent: CategoryTree, child: Category | null) => void;
}

/**
 * Two-level picker with a search box over both levels.
 *
 * Dozens of subcategories are too many to scroll on a phone, and someone selling a laptop
 * will type "laptop" rather than reason about whether it lives under
 * Electronics or Computers. Search matches subcategories too and shows the
 * parent alongside, so the answer is one tap either way.
 */
export function CategoryStep({ categories, selected, onSelect }: CategoryStepProps) {
  const t = useT();
  const [query, setQuery] = useState('');
  const [openParent, setOpenParent] = useState<number | null>(selected?.parent.id ?? null);

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return null;

    const results: Array<{ parent: CategoryTree; child: Category | null }> = [];
    for (const parent of categories) {
      if (parent.name.toLowerCase().includes(term)) results.push({ parent, child: null });
      for (const child of parent.children) {
        if (child.name.toLowerCase().includes(term)) results.push({ parent, child });
      }
    }
    return results.slice(0, 40);
  }, [categories, query]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-bold text-text-primary">
          {t('sell.chooseCategory')}
        </h2>
        <p className="mt-1 text-sm text-text-secondary">{t('sell.chooseCategoryHint')}</p>
      </div>

      <div className="relative">
        <Icon
          name="search"
          size={17}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('sell.searchCategory')}
          aria-label={t('sell.searchCategory')}
          className="h-11 w-full rounded-[--radius-field] border border-border-subtle bg-surface-raised pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
        />
      </div>

      {matches ? (
        matches.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">{t('sell.noCategoryMatch')}</p>
        ) : (
          <ul className="divide-y divide-border-subtle overflow-hidden rounded-[--radius-card] border border-border-subtle">
            {matches.map(({ parent, child }) => (
              <li key={`${parent.id}-${child?.id ?? 'self'}`}>
                <button
                  type="button"
                  onClick={() => onSelect(parent, child)}
                  className="flex w-full items-center gap-3 bg-surface-raised px-4 py-3 text-left transition-colors hover:bg-surface-sunken"
                >
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-[--radius-field] text-white"
                    style={{ backgroundColor: parent.accentColor ?? 'var(--brand)' }}
                    aria-hidden="true"
                  >
                    <Icon name="package" size={15} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-text-primary">
                      {child?.name ?? parent.name}
                    </span>
                    {child ? (
                      <span className="block truncate text-xs text-text-muted">{parent.name}</span>
                    ) : null}
                  </span>
                  <Icon name="chevron-right" size={16} className="ml-auto text-text-muted" />
                </button>
              </li>
            ))}
          </ul>
        )
      ) : (
        <ul className="space-y-2">
          {categories.map((parent) => {
            const expanded = openParent === parent.id;
            return (
              <li
                key={parent.id}
                className="overflow-hidden rounded-[--radius-card] border border-border-subtle bg-surface-raised"
              >
                <button
                  type="button"
                  onClick={() =>
                    parent.children.length === 0
                      ? onSelect(parent, null)
                      : setOpenParent(expanded ? null : parent.id)
                  }
                  aria-expanded={parent.children.length > 0 ? expanded : undefined}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-sunken"
                >
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-[--radius-field] text-white"
                    style={{ backgroundColor: parent.accentColor ?? 'var(--brand)' }}
                    aria-hidden="true"
                  >
                    <Icon name="package" size={15} />
                  </span>
                  <span className="flex-1 truncate text-sm font-medium text-text-primary">
                    {parent.name}
                  </span>
                  <Icon
                    name={parent.children.length ? 'chevron-down' : 'chevron-right'}
                    size={16}
                    className={`text-text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
                  />
                </button>

                {expanded && parent.children.length > 0 ? (
                  <ul className="border-t border-border-subtle bg-surface-sunken/50">
                    <li>
                      <button
                        type="button"
                        onClick={() => onSelect(parent, null)}
                        className="w-full px-4 py-2.5 pl-15 text-left text-sm text-text-secondary transition-colors hover:bg-surface-sunken"
                      >
                        {parent.name}
                      </button>
                    </li>
                    {parent.children.map((child) => (
                      <li key={child.id}>
                        <button
                          type="button"
                          onClick={() => onSelect(parent, child)}
                          className="w-full px-4 py-2.5 pl-15 text-left text-sm text-text-secondary transition-colors hover:bg-surface-sunken"
                        >
                          {child.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Category-driven attribute fields                                           */
/* -------------------------------------------------------------------------- */

export type AttributeValues = Record<string, string | number | boolean | null>;

/**
 * Renders the `extra` fields from the chosen category's field schema.
 *
 * Nothing here knows what a car is. The schema comes from the database, so
 * "Mileage / Fuel / Transmission" appears on Cars and "Breed / Age / Sex" on
 * Livestock, and adding a field to a category is an admin edit rather than a
 * release of four clients.
 */
export function AttributeFields({
  fields,
  values,
  onChange,
}: {
  fields: CategoryField[];
  values: AttributeValues;
  onChange: (values: AttributeValues) => void;
}) {
  if (fields.length === 0) return null;

  const set = (key: string, value: string | number | boolean | null) =>
    onChange({ ...values, [key]: value });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => {
        const label = humanise(field.key);
        const value = values[field.key];

        if (field.type === 'boolean') {
          return (
            <div key={field.key} className="flex items-end">
              <Checkbox
                label={label}
                checked={value === true}
                onChange={(checked) => set(field.key, checked)}
              />
            </div>
          );
        }

        if (field.type === 'enum') {
          return (
            <SelectField
              key={field.key}
              name={`attr-${field.key}`}
              label={label}
              value={typeof value === 'string' ? value : ''}
              onChange={(event) => set(field.key, event.target.value || null)}
            >
              <option value="">—</option>
              {(field.options ?? []).map((option) => (
                <option key={option} value={option}>
                  {humanise(option)}
                </option>
              ))}
            </SelectField>
          );
        }

        return (
          <TextField
            key={field.key}
            name={`attr-${field.key}`}
            label={label}
            type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
            inputMode={field.type === 'number' ? 'numeric' : undefined}
            value={value == null ? '' : String(value)}
            onChange={(event) => {
              const raw = event.target.value;
              if (raw === '') {
                set(field.key, null);
              } else {
                set(field.key, field.type === 'number' ? Number(raw) : raw);
              }
            }}
          />
        );
      })}
    </div>
  );
}

/** mileage_km -> Mileage km, 4wd -> 4wd. Good enough for schema-driven labels. */
function humanise(key: string): string {
  return key.replace(/_/g, ' ').replace(/^\w/, (char) => char.toUpperCase());
}
