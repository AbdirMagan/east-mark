# East-Market — Backend API

Node.js + Express 5 + TypeScript. Serves the Android app, the iOS app, the web
marketplace and the admin dashboard from one REST API over Supabase Postgres.

## Running it

```bash
npm install
cp ../.env.example .env     # then fill in the Supabase values
npm run dev                 # http://localhost:4000
```

| Script | |
|---|---|
| `npm run dev` | watch mode |
| `npm run build` / `npm start` | compile to `dist/` and run |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | unit + API contract tests |
| `npm run gen:types` | regenerate `src/types/database.ts` after a migration |

`src/types/database.ts` is generated from the live schema. Regenerate it after
every migration — it is what makes a renamed column a compile error instead of
a runtime `undefined`.

## The one rule

There are two ways to reach the database and picking the wrong one is how
marketplaces leak their users' data.

```ts
req.auth.db   // acts AS THE USER. Row level security applies. Use this.
admin         // service role. BYPASSES all RLS. Justify every call site.
```

`asUser(token)` forwards the caller's access token, so a mistake in a filter
cannot return another user's conversations — the database refuses. `admin`
exists for the few things the platform does as itself: moderation, payment
reconciliation, scheduled jobs. If you reach for `admin` to make a query work,
the usual cause is a missing RLS policy.

## Layout

```
src/
├── config/       env (zod-validated), logger, Supabase clients, resilient fetch
├── middleware/   auth, validation, errors, rate limiting, request context
├── routes/       HTTP surface, one file per resource
├── services/     business logic; everything that touches the database
├── utils/        errors, response envelope, cache, localisation
├── validators/   zod schemas — the single source of truth for request shape
└── types/        generated database types + Express augmentation
```

## Response envelope

One shape everywhere, so four clients share one decoder.

```jsonc
{ "success": true,  "data": {...}, "message": "Success" }
{ "success": true,  "data": [...], "message": "Success", "meta": { "page": 1, "limit": 20, "total": 45, "totalPages": 3, "hasMore": true } }
{ "success": false, "message": "Validation failed", "code": "validation_failed",
  "errors": { "sort": ["Invalid enum value..."] }, "requestId": "b5690926-..." }
```

A 5xx never shows the caller what broke — Postgres messages carry column and
constraint names, stack traces carry file paths. Both go to the log keyed by
`requestId`, and the caller gets that id so support can join the two.

`42501` (insufficient privilege) maps to **403, not 500**. This schema leans on
RLS and column grants, so "permission denied" is an expected answer to a request
that overreached, not a server fault.

## Endpoints

### Public

| | |
|---|---|
| `GET /health`, `/health/ready` | liveness and readiness |
| `GET /api/v1/config` | public settings, languages, currencies, feature flags |
| `GET /api/v1/locations/countries` | launch countries with dial codes |
| `GET /api/v1/locations/countries/:code/tree` | whole hierarchy in one request |
| `GET /api/v1/locations/cities?q=` | city lookup |
| `GET /api/v1/locations/nearest?lat=&lng=` | GPS fix to nearest city |
| `GET /api/v1/categories` | tree, localised, with listing field schemas |
| `GET /api/v1/products` | feed, search, filters, sorting, pagination |
| `GET /api/v1/products/ref/:ref` | shareable link target |
| `GET /api/v1/products/:id/similar` | more like this |

### Authenticated

| | |
|---|---|
| `GET/PATCH /api/v1/users/me` | profile |
| `POST /api/v1/users/me/onboarding` | country, language, city, interests |
| `PATCH /api/v1/users/me/contact` | phone, WhatsApp and their visibility |
| `GET/PUT/DELETE /api/v1/users/me/favorites` | saved listings |
| `POST /api/v1/users/me/devices` | FCM / APNs token |
| `GET /api/v1/products/mine` | own listings, drafts included |
| `POST/PATCH/DELETE /api/v1/products` | listing lifecycle |
| `POST /api/v1/products/:id/images/upload-url` | signed direct upload |

Add `?lang=so|am|sw|en` to any localised endpoint.

## Decisions worth knowing

**Search goes through one RPC.** `search_products` returns a denormalised card
row — primary image, seller name, verification badge, city, total count — so a
full grid renders from one round trip. Rebuilding that as a PostgREST query
chain would be four joins plus a count query per page.

**Images never pass through this API.** Clients downscale to WebP, request a
signed URL, and PUT straight to Supabase Storage. Routing bytes through the
server would upload each photo twice, and the phone is the slow half of that
journey. Storage policies key on the first path segment being the uploader's
own user id, so a signed URL cannot write into someone else's folder.

**Reference data is cached in-process for five minutes.** Countries, cities and
categories change a few times a month but every cold app start asks for them.
Not Redis: a cache that can be down is a dependency that can take the API down.

**Only GET and HEAD are retried.** A POST that times out may already have been
applied, so replaying it could create two listings, two messages or two
payments from one tap. Read-only RPCs are dispatched with `{ get: true }` so
they travel as GET and qualify. See `config/resilientFetch.ts`.

**Rate limits key on user id, then IP.** Much East African mobile traffic is
carrier-NATed, so thousands of real users share one address; limiting purely by
IP would throttle a whole network because one person browsed quickly.

## Tests

```bash
npm test
```

48 tests. The API suite runs against the configured Supabase project rather than
a mock — the bugs worth catching here are drift between the schema and the API,
and a mock gets rewritten to match the code instead of the database.

## Not built yet

Routes: messaging, seller profiles, businesses, reviews, reports, notifications,
admin, payments. Jobs: listing expiry, saved-search matching, featured-slot
deactivation, exchange-rate refresh, price-drop notifications.

Admin moderation does **not** need the service role: `products_update_own`
already admits `public.is_admin()`, and `products_guard` treats an admin JWT as
a trusted context, so an admin can approve a listing through their own client.
