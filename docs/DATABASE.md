# East-Market — Database

Postgres 17 on Supabase. Everything in `supabase/migrations/` and
`supabase/seed/` is idempotent and safe to re-run.

---

## Applying it

Apply migrations in filename order, then seeds in filename order.

```bash
for f in supabase/migrations/*.sql supabase/seed/*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```

Or with the Supabase CLI against a local stack:

```bash
supabase start
supabase db reset
```

### Bootstrapping the first admin

Every user signs up as `buyer`. Promoting the first admin needs the service
role, because RLS and the guard triggers both refuse role changes from a
client:

```sql
update public.profiles set role = 'admin' where id = '<user-uuid>';
```

Run that from the Supabase SQL editor or the backend. Afterwards that account
can manage everything else from the admin dashboard.

---

## ID conventions

Two deliberate choices:

- **Reference tables use compact integer identities** — countries, regions,
  cities, districts, neighborhoods, categories, subscription plans. These ids
  are embedded in nearly every API payload, and on a 2G connection the bytes
  matter.
- **User-generated content uses `uuid`** — profiles, products, conversations,
  messages, payments. Ids are never enumerable.

Listings additionally carry `ref`, a short `bigint` starting at 100000, used
for shareable links (`eastmarket.app/product/100042`), and `slug`, derived from
the title and suffixed with `ref` so it is always unique.

---

## Security model

| Role | Can do |
|---|---|
| `anon` | Read active listings, seller cards, categories, locations, running ads |
| `authenticated` | The above, plus full control of their **own** rows |
| admin / moderator | Moderation surface, via `public.is_admin()` |
| `service_role` | Bypasses RLS entirely. Backend only. |

Three layers, because no single one is sufficient:

**1. Row Level Security** decides *which rows* a caller may touch. Enabled on
all 39 public tables.

**2. Column privileges** decide *which columns* a caller may write. RLS is
row-level, so it cannot stop "update your own profile" from also meaning "make
yourself an admin". `authenticated` holds no `UPDATE` grant on `profiles.role`,
`products.view_count`, `seller_profiles.rating_avg` and the rest of the derived
and moderation columns. Attempts fail loudly:

```
ERROR: 42501: permission denied for table products
```

**3. Guard triggers** handle what neither can express — moderation state
transitions, and deciding whether the caller editing a review is its author
(who owns rating and comment) or the reviewed seller (who owns only the reply).

### Why phone numbers are not on `profiles`

`profiles` is world-readable: every product tile needs the seller's name and
avatar. RLS is row-level, so a public read policy would expose every account's
phone number and make the seller's "show my phone" switch decorative.

Contact details therefore live in `public.user_contacts`, which is readable
only by its owner, admins and the service role. Public access goes through
`get_seller_contact(seller_id)`, which honours `show_phone` / `show_whatsapp`
and returns nothing if either party has blocked the other.

Verified: a signed-in user reading `user_contacts` for another seller gets zero
rows; the same user calling `get_seller_contact` gets the number; after the
seller flips `show_phone` to false, the RPC returns null.

---

## Storage buckets

The first path segment is always the owning id, which is what every policy
keys off.

| Bucket | Public | Limit | Path |
|---|---|---|---|
| `avatars` | yes | 2 MB | `<user_id>/avatar.webp` |
| `product-images` | yes | 5 MB | `<user_id>/<product_id>/<uuid>.webp` |
| `business-assets` | yes | 5 MB | `<business_id>/logo.webp` |
| `ad-creatives` | yes | 5 MB | `<ad_id>/<uuid>.webp` |
| `verification-docs` | **no** | 10 MB | `<user_id>/<uuid>.<ext>` |
| `message-attachments` | **no** | 10 MB | `<conversation_id>/<uuid>.<ext>` |

Limits are tight on purpose: clients upload a compressed WebP plus a thumbnail,
not the original camera file.

A malformed path must deny access rather than raise — casting an arbitrary
folder name straight to `uuid` inside a policy would abort the whole query — so
policies go through `public.em_try_uuid()`.

---

## Search

`products.search_vector` is a stored generated column weighting title (A),
brand + model (B) and description (C).

It uses the `simple` text search configuration, not `english`. Somali and
Amharic have no PostgreSQL stemming dictionary, and stemming English only would
skew results across the four supported languages. Text is lowercased and
accent-stripped by `public.em_normalize()` first.

`search_products()` is the single entry point for the feed, category browsing,
text search and every filter combination. It returns a denormalised row, so a
product card renders from one request with no follow-up joins, and a
`total_count` for pagination.

Matching is three branches OR-ed together:

1. Full text over the weighted vector.
2. `word_similarity(query, title) > 0.45` — typo tolerance.
3. Plain substring, for fragments shorter than a trigram window.

### Why `word_similarity` and not `similarity`

Measured on this schema against `"Toyota Corolla 2018"`:

| query | `similarity()` | `word_similarity()` |
|---|---|---|
| toyota | 0.350 | 1.000 |
| corolla | 0.400 | 1.000 |
| corol | 0.238 | 0.833 |
| corola | 0.286 | 0.714 |
| toyta | 0.182 | 0.500 |
| nissan | 0.000 | 0.000 |
| laptop | 0.000 | 0.000 |

No cut-off works for `similarity()`: a *correctly spelled* query scores 0.35,
barely above a typo. It compares the query against the whole title, so one
mistyped word is diluted by every other word. `word_similarity` compares
against the best-matching word and separates cleanly. 0.45 sits below `toyta`
(0.50) and far above noise (0.00).

The indexable spelling is the `<%` operator, but it reads its threshold from
`pg_trgm.word_similarity_threshold`, which managed Postgres will not let a
function pin. So the threshold is explicit and this branch is a filter, not an
index scan. It is OR-ed with the GIN-indexed full-text branch and only runs
after country/city/category/price have narrowed the candidate set. Revisit if
text-search latency grows.

### Verified behaviour

| probe | expected | result |
|---|---|---|
| `Toyota` (English, title) | match | 1 |
| `gaari` (Somali, description) | match | 1 |
| `Toyta` (typo) | match | 1 |
| `corola` (typo) | match | 1 |
| `corol` (partial) | match | 1 |
| `nissan` / `laptop` / `guri` | no match | 0 |

Category search rolls up: searching the parent `cars` finds a listing filed
under `cars-sale`, via `category_descendants()`.

---

## RPCs

| Function | Callable by | Purpose |
|---|---|---|
| `search_products(...)` | anon, authenticated | Feed, browse, search, filter, sort, paginate |
| `similar_products(id, limit)` | anon, authenticated | "More like this" on the product page |
| `recommended_products(user, limit, offset)` | authenticated | Personalised feed |
| `record_product_view(id, session, source)` | anon, authenticated | View counter, de-duplicated to one per viewer per listing per hour |
| `get_seller_contact(seller_id)` | anon, authenticated | Phone / WhatsApp, honouring visibility and blocks |
| `start_conversation(product_id, seller_id)` | authenticated | Find or create a thread |
| `mark_conversation_read(conversation_id)` | authenticated | Clear unread counters |
| `record_ad_impression(id)` / `record_ad_click(id)` | anon, authenticated | Ad metrics without table write access |
| `category_descendants(id)` | anon, authenticated | Category subtree |

Trigger functions are revoked from `anon` and `authenticated` so they do not
appear as callable RPC endpoints.

### Recommendations

`recommended_products()` is deliberately explainable rather than clever. Each
active listing is scored on category affinity (from views, favourites and
onboarding interests), same city, same country, featured status, freshness and
a damped popularity term. Listings the user already saw or saved are excluded.

The scoring weights are the seam where an ML ranker drops in later; nothing
above the function signature needs to change.

---

## Realtime

`messages`, `conversations` and `notifications` are published to
`supabase_realtime`. `messages` and `conversations` use `replica identity full`
so Realtime can evaluate RLS on update and delete events.

Typing indicators and online presence ride on Realtime presence/broadcast and
need no table.

Message rows carry `type`, `attachment_*` and `duration_seconds` from day one,
so image and voice messages ship later without a migration on the hot table.

---

## Payments

No payment provider is hard-coded. Providers are rows in
`public.payment_providers`; the backend resolves an adapter by `code`. Adding a
provider for a new country is an insert plus one adapter file — the checkout
flow does not change.

`config` holds non-secret settings only (USSD codes, confirmation style,
translation keys). Secrets live in backend environment variables named
`EM_PAY_<CODE>_*`. All eight providers ship inactive.

`payments` is the intent (what the user is buying). `payment_transactions` is
the provider-level attempt log; one payment may have several attempts across
providers. Card details are never stored.

Clients can read their own payment rows and write none of them.

---

## Known gaps

Scheduled work that has no home yet — these need the backend's job runner:

- Expiring listings past `expires_at` (the column and index exist; nothing
  flips the status yet).
- Matching `saved_searches` against new listings and emitting notifications.
- Deactivating `featured_listings` past `ends_at`.
- Refreshing `exchange_rates` from a provider.
- Notifying favouriters on a price drop (`favorites.price_at_save` is recorded
  for exactly this).
