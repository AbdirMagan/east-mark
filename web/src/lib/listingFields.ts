/**
 * Labels, option names and example text for schema-driven listing fields.
 *
 * Categories carry their own `field_schema` in the database, so the clients
 * never hard-code what a car is. The cost of that is cosmetic: the only name a
 * client has for a field is its column key, and `key.replace(/_/g, ' ')` turns
 * `ram_gb` into "Ram gb" and `dual_sim` into "Dual sim". A seller filling in
 * the form reads that as sloppiness, and they are right.
 *
 * So the schema stays in the database and the wording lives here, in one place
 * that both the sell form and the listing page read. A key with no entry still
 * falls back to the mechanical version -- adding a field to a category remains
 * an admin edit, and the worst that happens before someone writes a line here
 * is the label we already shipped.
 *
 * These are deliberately English-only, which is what the schema-driven fields
 * have always been. Translating them means a key per attribute in four
 * dictionaries, and that is worth doing as its own piece of work rather than
 * smuggling half of it in here.
 */

/** Field keys whose mechanical label reads badly: units, acronyms, jargon. */
const LABELS: Record<string, string> = {
  age_months: 'Age (months)',
  area_sqm: 'Area (sqm)',
  battery_health: 'Battery health (%)',
  bike_type: 'Bike type',
  body_type: 'Body type',
  cpu: 'Processor',
  dual_sim: 'Dual SIM',
  engine_cc: 'Engine (cc)',
  land_use: 'Land use',
  listing_type: 'For sale or for rent',
  mileage_km: 'Mileage (km)',
  plot_size: 'Plot size',
  ram_gb: 'RAM (GB)',
  screen_inches: 'Screen size (inches)',
  size_unit: 'Measured in',
  storage_gb: 'Storage (GB)',
  title_deed: 'Has a title deed',
  warranty_months: 'Warranty (months)',
};

/**
 * Option values that are not ordinary words. Keyed by field first, because
 * "left" means left-hand drive on a car and nothing of the sort elsewhere.
 */
const OPTIONS: Record<string, string> = {
  'drive.2wd': '2WD',
  'drive.4wd': '4WD',
  'drive.awd': 'AWD',
  'steering.left': 'Left-hand drive',
  'steering.right': 'Right-hand drive',
  'body_type.suv': 'SUV',
  'size_unit.sqm': 'Square metres',
  'size_unit.hectare': 'Hectares',
  'size_unit.acre': 'Acres',
  'listing_type.sale': 'For sale',
  'listing_type.rent': 'For rent',
  'fuel.gas': 'Gas (LPG/CNG)',
  'sex.mixed': 'Mixed herd',
};

/**
 * Example values for the fields a seller types into. A number field with no
 * example leaves them guessing at the unit -- is mileage in kilometres or
 * miles, is a plot in square metres or acres -- and the label can only say so
 * much before it stops being a label.
 */
const PLACEHOLDERS: Record<string, string> = {
  age_months: '10',
  area_sqm: '120',
  bathrooms: '2',
  battery_health: '89',
  bedrooms: '3',
  breed: 'Somali, Boran, Blackhead',
  cpu: 'Core i5, 11th generation',
  engine_cc: '1500',
  material: 'Mahogany, steel, glass',
  mileage_km: '120000',
  plot_size: '600',
  ram_gb: '8',
  screen_inches: '15.6',
  storage_gb: '512',
  warranty_months: '12',
};

/** `ram_gb` -> "RAM (GB)"; an unlisted key -> "Some new field". */
export function attributeLabel(key: string): string {
  return LABELS[key] ?? sentenceCase(key);
}

/** `drive` + `4wd` -> "4WD"; an unlisted option -> "Petrol". */
export function attributeOptionLabel(key: string, option: string): string {
  return OPTIONS[`${key}.${option}`] ?? sentenceCase(option);
}

/** The example shown in an empty attribute box, or '' when none fits. */
export function attributePlaceholder(key: string): string {
  return PLACEHOLDERS[key] ?? '';
}

/**
 * Examples for the fixed fields every category draws from -- brand, model and
 * the rest. A phone seller and a car seller need different ones, so these are
 * keyed by the category group the listing belongs to.
 *
 * Proper nouns and numerals only: "Toyota" and "2018" read the same in all
 * four languages, so these stay out of the dictionaries. Anything that would
 * need translating (a colour, a size) is a translation key in the form.
 */
const CORE_EXAMPLES: Record<CategoryGroup, Partial<Record<string, string>>> = {
  phones: { brand: 'Samsung', model: 'Galaxy A54' },
  computers: { brand: 'HP', model: 'EliteBook 840 G8' },
  electronics: { brand: 'Hisense', model: '43A6K' },
  cars: { brand: 'Toyota', model: 'Corolla', year: '2018' },
  houses: {},
  land: {},
  livestock: { quantity: '12' },
  goods: { brand: 'Nilkamal', model: 'Office desk 1.4 m' },
};

export type CategoryGroup =
  | 'phones'
  | 'computers'
  | 'electronics'
  | 'cars'
  | 'houses'
  | 'land'
  | 'livestock'
  | 'goods';

/** Leaf categories whose example should not be the one for their parent. */
const LEAF_GROUPS: Record<string, CategoryGroup> = {
  smartphones: 'phones',
  tablets: 'phones',
  'feature-phones': 'phones',
  'phone-accessories': 'phones',
  laptops: 'computers',
  desktops: 'computers',
  printers: 'computers',
  networking: 'computers',
  'computer-parts': 'computers',
};

const ROOT_GROUPS: Record<string, CategoryGroup> = {
  electronics: 'electronics',
  houses: 'houses',
  cars: 'cars',
  land: 'land',
  livestock: 'livestock',
  'home-office-goods': 'goods',
};

/**
 * Which set of examples a category gets. The leaf wins where it has its own --
 * "Samsung / Galaxy A54" is no help to someone listing a generator, even
 * though both sit under Electronics.
 */
export function categoryGroup(rootSlug: string | undefined, leafSlug?: string | null): CategoryGroup {
  if (leafSlug && LEAF_GROUPS[leafSlug]) return LEAF_GROUPS[leafSlug];
  if (rootSlug && ROOT_GROUPS[rootSlug]) return ROOT_GROUPS[rootSlug];
  return 'goods';
}

/** The example for one fixed field, or '' when that field has none here. */
export function coreExample(group: CategoryGroup, field: string): string {
  return CORE_EXAMPLES[group][field] ?? '';
}

/** `mileage_km` -> "Mileage km". The fallback, and the old behaviour. */
function sentenceCase(key: string): string {
  return key.replace(/_/g, ' ').replace(/^\w/, (char) => char.toUpperCase());
}
