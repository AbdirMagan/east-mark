# East-Market

**Buy. Sell. Connect.** — an online marketplace for Somaliland, Somalia, Ethiopia and Kenya.

One backend, one database, one identity system, shared by a native Android app, a
native iOS app, a responsive web marketplace and an admin dashboard.

---

## Status

This repository is being built in dependency order. Only what is listed as
**done** below has been written and verified; everything else is not started yet.

| Area | State |
|---|---|
| `supabase/` — schema, RLS, storage, seed data | **Done**, applied and verified against Postgres 17 |
| `backend/` — Node + Express + TypeScript API | **Done** for config, locations, categories, products, users. Messaging, businesses, admin, payments and the job runner are not started. |
| `web/` — React + TypeScript marketplace | **Done** for home, browse/search/filter, product detail, categories, auth and posting a listing. Messaging, seller profiles and my-listings are not started. |
| `admin/` — React + TypeScript dashboard | Not started |
| `android/` — Kotlin + Compose | Prototype only (Room-backed, not wired to Supabase) |
| `ios/` — Swift + SwiftUI | Not started |
| `packages/shared` — design tokens, i18n | Not started. The design system currently lives in `web/src/index.css`. |

The `android/` directory currently holds an AI Studio prototype with a local
Room database and no backend. It is kept for reference and will be rebuilt
against the API.

---

## Layout

```
East-Market/
├── android/      Kotlin + Jetpack Compose
├── ios/          Swift + SwiftUI
├── web/          React + TypeScript (Vite)
├── admin/        React + TypeScript
├── backend/      Node.js + Express + TypeScript
├── packages/
│   └── shared/   Design tokens and localisation shared across clients
├── supabase/
│   ├── migrations/   Schema, RLS, storage. Apply in filename order.
│   └── seed/         Languages, currencies, locations, categories, plans.
└── docs/
```

---

## Running it locally

```bash
# 1. database — apply migrations and seeds (see docs/DATABASE.md)
# 2. api
cd backend && npm install && cp ../.env.example .env && npm run dev   # :4000
# 3. web
cd web && npm install && cp .env.example .env && npm run dev          # :5173
```

The web dev server proxies `/api` to the backend, so both need to be running.

## Database

Postgres 17 on Supabase. See [docs/DATABASE.md](docs/DATABASE.md) for the full
schema, the security model, and how to apply it to a fresh project.

Short version:

```bash
# apply every migration, then every seed file, in filename order
for f in supabase/migrations/*.sql supabase/seed/*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```

Both sets are idempotent and safe to re-run.

### What the seed gives you

| | |
|---|---|
| Languages | English, Somali, Amharic, Swahili |
| Currencies | USD, SLSH, SOS, ETB, KES |
| Countries | Somaliland, Somalia, Ethiopia, Kenya |
| Regions | 45 |
| Cities | 71 (31 flagged as major) |
| Districts | 50 |
| Categories | 25 top-level + 53 subcategories, each named in all four languages |
| Subscription plans | Free, Basic, Business, Premium |
| Payment providers | ZAAD, eDahab, EVC Plus, Sahal, telebirr, M-Pesa, bank transfer, cash — all registered, all inactive until credentials are configured |

`supabase/seed/99_demo_listings.sql` is optional sample content: two demo
sellers and eight listings across all four countries, so a fresh environment
has something to look at. It is not production data — the accounts have a known
password. Remove it with:

```sql
delete from auth.users where email like 'demo-%@eastmarket.test';
```

Nothing about locations, categories, currencies or payment providers is
hard-coded in application code. They are rows. Adding Djibouti, Uganda,
Tanzania, Rwanda or South Sudan later is an insert, not a release.

---

## Environment

Copy `.env.example` to `.env` and fill it in. `.env` is gitignored.

The service-role key belongs **only** to the backend. It bypasses every row
level security policy in the database. It must never appear in the Android
app, the iOS app, the web bundle or the admin bundle.

---

## Licence

Proprietary. All rights reserved.
