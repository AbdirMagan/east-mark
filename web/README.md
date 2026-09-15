# East-Market — Web

React 18 + TypeScript + Vite + Tailwind v4. The public marketplace.

```bash
npm install
cp .env.example .env      # fill in the Supabase values
npm run dev               # http://localhost:5173
```

The dev server proxies `/api` to `http://localhost:4000`, so run the backend
alongside it. `npm run build`, `npm run typecheck`, `npm test`.

---

## The design system

The identity is carried by colour, geometry and layout rather than by imagery,
which is what keeps it both distinctive and light.

**Palette** — drawn from East African materials, not a generic SaaS ramp.
Acacia (deep blue-green) is the primary, fired clay the accent, dry-season gold
the highlight, and a warm **sand** neutral replaces grey everywhere. Cold greys
read as foreign here and make photographs of dusty goods look worse. All five
ramps are full 11-step scales in `src/index.css`.

**Semantic tokens** — components reference `surface`, `text-primary`, `brand`,
`accent` and so on, never the raw ramps, so light and dark stay in step and a
future high-contrast theme is one more block rather than a rewrite.

**Cultural patterns** — `CulturalPattern` renders four tiling SVG motifs
(`weave`, `chevron`, `horizon`, `beads`) that are geometric abstractions of
repeating forms found across East African weaving and architecture, drawn from
primitives rather than traced from any particular textile. They are a whisper,
not a shout: opacity is bound to `--pattern-opacity` (5–7%, tuned per theme) so
they cannot compete with a product photo or make text harder to read. They
belong behind headers, heroes and empty states — **never behind a product
grid**. A full-bleed banner costs a few hundred bytes.

**The mark** — three diamonds joined into a triangle. A marketplace is people
meeting, and three is the smallest number that reads as more than a
transaction. The diamond is the same unit the pattern layer repeats, so the
logo and the backgrounds are visibly one family. `public/favicon.svg` is the
source drawing: the Android launcher icon (`res/drawable/ic_launcher_*.xml`,
legacy `mipmap-*` PNGs rendered from it) and the in-app logo
(`res/drawable/ic_logo_mark.xml`) are translations of it, not redraws.

**The Africa map** is the page background and the hero's centrepiece. It is
generated from Natural Earth's 1:110m outlines (public domain) by
`scripts/build-africa-map.py` into `public/africa-map.svg`: 11 KB, 4 KB
gzipped, fetched once and shared by both uses. Every country is filled in one
colour with **no internal borders** — the product serves Somaliland and Somalia
as separate markets, and a bordered map would have to draw lines (Somaliland,
the Ogaden, Western Sahara) that a marketplace has no business taking a
position on. It is applied as a CSS mask so its colour follows the theme via
`--map-tint` (7% light, 6% dark), which is why it can sit behind product grids
where the patterns may not: cards and forms are opaque, so it never touches the
legibility of a photo or a price. The hero draws the five market cities on top,
linked in a ring. The projection constants in `AfricaMap.tsx` must match the
script.

**No web font.** A system stack ships zero bytes, which matters more here than
a signature typeface would; the stack includes Ethiopic and Arabic fallbacks so
Amharic and Somali render correctly.

---

## Localisation

Four languages: English, Somali, Amharic, Swahili.

English is the source of truth — its keys define `TranslationKey`, so a key
used in a component that does not exist is a **compile error**. The other three
are `Partial<Dictionary>` and fall back per key, so a half-translated locale
degrades to English rather than rendering blank.

Only the active language is downloaded. English is in the main bundle because
it is the fallback and needed regardless; the other three are dynamic imports
of 2.5–3 KB gzipped each. Bundling all four would ship three dictionaries every
visitor never reads.

The test suite asserts that every locale covers every English key **and keeps
the same `{placeholder}` tokens** — dropping `{city}` from a translation
silently renders the wrong sentence rather than failing.

One thing to know: `Intl.RelativeTimeFormat` has no Somali data in most
engines, so "3 days ago" falls back to English on Somali. The formatter catches
this rather than throwing.

---

## Built for slow connections

This is the constraint that drove most of the decisions here.

**The auth client, not the full Supabase client.** The web app never queries
Supabase directly — data comes from the backend API — so PostgREST, Realtime,
Storage and Functions are all dead weight. Importing `@supabase/auth-js` alone
instead of `@supabase/supabase-js` cut the chunk from **58.5 KB to 24.9 KB
gzipped**, about 22% off the total initial payload. When messaging lands it will
import the realtime client lazily on the messages route, so people who never
open a conversation never pay for a websocket library.

**Route-level code splitting.** Only the home page is in the initial bundle.

**Reserved image boxes.** Cards render a fixed 4:3 box with `width`/`height`
attributes. On a slow link images land long after the text, and without a
reserved box the grid reflows as each one arrives — which on a phone means
tapping the wrong listing.

**Thumbnails, never full-size.** A grid of twenty full-size photos is several
megabytes; twenty thumbnails are a few hundred kilobytes.

**Reference data cached for an hour** and never refetched on window focus.
Refetching a feed every time a tab regains focus burns data the visitor is
paying for by the megabyte.

**Retry only what retrying fixes.** Three retries on a 404 just delays the
error by several seconds.

Current initial payload: **~121 KB gzipped** across HTML, CSS and JS.

---

## Structure

```
src/
├── components/
│   ├── brand/      logo, cultural patterns, hero motif
│   ├── layout/     header (with location/language/currency/theme), footer, bottom nav
│   ├── product/    card, grid, rail
│   └── ui/         button, badge, fields, skeletons, empty and error states, icons
├── hooks/          TanStack Query hooks, SEO
├── i18n/           provider + four locale files
├── lib/            API client, auth client, formatting
├── pages/          home, browse, product, auth, categories, saved
└── store/          preferences (Zustand, persisted), auth session
```

**Where state lives** matters and is deliberate:

- **URL** — search filters. A filtered result gets shared ("Corollas under $10k
  in Hargeisa" pasted into a WhatsApp group is a real user journey), the back
  button behaves, and a reload does not drop a minute of work.
- **Zustand, persisted** — currency, theme, chosen location. Standing
  preferences: someone in Hargeisa wants Hargeisa listings on every visit.
- **TanStack Query** — everything from the server.

---

## SEO

Product pages are shared into WhatsApp groups constantly in these markets —
that is how a listing spreads — so Open Graph tags are load-bearing, not an
afterthought. Without them a shared link is a bare URL; with them it is a card
with the photo, title and price.

`useSeo` sets title, description, canonical, Open Graph, Twitter cards and
JSON-LD `Product` structured data. WhatsApp, Telegram and Facebook render what
a prerenderer would emit.

Filtered browse URLs are `noindex` — the permutations are near-infinite and
would be thin content. Category and product pages carry the SEO weight.

**Not done:** this is client-rendered, so crawlers that do not execute
JavaScript see an empty shell. Pre-rendering product and category routes is the
follow-up.

---

## Accessibility

Skip link, visible focus ring everywhere, 44px minimum touch targets on the two
larger button sizes, `aria-pressed` on the favourite toggle, `aria-live` on
result counts, labelled form fields with `aria-describedby` for errors, and
`prefers-reduced-motion` respected rather than overridden.

---

## Posting a listing

A three-step flow: category, details and photos, then location and contact.

**Images are processed in the browser, never on the server.** A phone camera
produces 3-6 MB JPEGs; uploading one over a 3G uplink takes most of a minute,
and a seller adding five photos gives up long before that. Each photo is
resized to 1600px and re-encoded as WebP, with a 400px thumbnail produced at
the same time. Measured on a 3000x2250 test image: **7.55 MB in, 202 KB full
+ 5.4 KB thumbnail out.** The thumbnail is what the product grid renders, so
browsing twenty listings costs a few hundred kilobytes.

Targets live in `app_settings.media`, so they can be re-tuned for a slower
network without shipping a build. `imageOrientation: 'from-image'` applies the
EXIF rotation tag — without it, portrait photos from many Android phones upload
sideways.

**Publishing is three server steps, not one:** create as a draft, upload and
register each photo, then flip the status into moderation. It has to be that
order because the storage path contains the product id. Creating it as a draft
first means a listing interrupted mid-upload lands in the seller's drafts with
whatever photos made it, rather than reaching a moderator half-built. A photo
that fails does not cost the seller the listing.

**The form is saved to localStorage as you type** — everything except the
photos, which are blobs and cannot be serialised. A half-typed listing is real
work, and losing it to a dropped connection is what stops someone trying again.

The optional fields come from the chosen category's `field_schema`. Nothing in
the client knows what a car is: pick Cars and Mileage/Fuel/Transmission appear,
pick Livestock and it is Breed/Age/Sex.

## Not built yet

My listings, editing a listing, messaging, seller profiles, saved listings
(the screen exists but `/users/me/favorites` returns raw product rows rather
than the card shape the grid needs), onboarding, and the legal pages the footer
links to.
