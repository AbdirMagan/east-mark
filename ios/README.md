# East-Market — iOS

SwiftUI, iOS 16+. The same backend as the web app and the Android app: listings,
search, promotions, messaging and posting a listing all go through `/api/v1`, so
a conversation started on the web continues here.

> **Never compiled.** This app was written on a Windows machine, where Xcode does
> not exist — no part of it has been built or run. Expect a few compile errors on
> the first build. The common ones, and their fixes, are at the bottom of this
> file.

---

## Build it without a Mac

`.github/workflows/ios.yml` builds this app on a GitHub-hosted macOS runner:
push the branch, and the run generates the Xcode project, compiles for the
simulator, boots an iPhone, installs the app, launches it and uploads a
screenshot. A compile error appears in the log with its file and line, which is
all you need to fix it from Windows.

Two optional repository secrets (Settings -> Secrets and variables -> Actions):

| Secret | What it does |
| --- | --- |
| `API_BASE_URL` | The API the app calls. Defaults to the hosted API, `https://east-market-api-two.vercel.app/api/v1`. |
| `SUPABASE_ANON_KEY` | The key used for sign-in. Defaults to the project's publishable (`sb_publishable_…`) key. Never the secret or service-role key — it would be baked into the app binary. |

Running it costs macOS minutes: free on a public repository, and on a private
one each macOS minute counts as ten against the free monthly allowance, so a
five-minute build is fifty minutes of quota.

## Build it on a Mac

```bash
cd ios
./setup.sh                                       # simulator
API_BASE_URL=http://<your-Mac-IP>:4000/api/v1 ./setup.sh   # a real iPhone
```

`setup.sh` installs XcodeGen if needed, generates `EastMarket.xcodeproj` from
`project.yml`, and opens Xcode. Then set your team under **Signing &
Capabilities** and press Run.

Sign-in works out of the box: `setup.sh` uses the project's publishable
(`sb_publishable_…`) key, the same one the web and Android apps ship. Pass
`SUPABASE_ANON_KEY=...` only to point at a different Supabase project. The
secret / service-role key must never go in an app.

### Without XcodeGen

Create a new iOS App in Xcode (SwiftUI, iOS 16), delete its `ContentView.swift`
and `…App.swift`, drag the `EastMarket` folder in with *Create groups* ticked,
and add these Info.plist keys: `API_BASE_URL`, `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, `NSPhotoLibraryUsageDescription`, `NSCameraUsageDescription`,
and `NSAppTransportSecurity → NSAllowsLocalNetworking = YES`.

### Where the backend is

| Running on | `API_BASE_URL` |
| --- | --- |
| Simulator, backend on the same Mac | `http://localhost:4000/api/v1` |
| A real iPhone | `http://<your-Mac-Wi-Fi-IP>:4000/api/v1` |

An iPhone reaches the backend over Wi-Fi even when plugged in by USB, so
`localhost` there means the phone itself. Find the address with
`ipconfig getifaddr en0`, keep both on the same network, and allow port 4000
through the Mac's firewall. Plain HTTP is permitted only through
`NSAllowsLocalNetworking`; a release build should use an `https://` API and drop
that exception.

---

## What is in it

| Screen | What it does |
| --- | --- |
| **Home** | Promotions carousel (the slides staff post in the admin dashboard), category chips, featured and recent listings, pull to refresh and a refresh button |
| **Browse** | Search, category filter, sorting, results grid; the home screen's *Photo listings* button opens it filtered to listings without a video |
| **Video feed** | Listings that were filmed, one per screen, swiped vertically, with the app's own bar, a category strip and the tab bar in place |
| **Listing** | Photo and video gallery (the video loads only when tapped), price, condition, description, seller, Call / WhatsApp / Message |
| **Messages** | The shared inbox and one conversation, refreshed every four seconds, with read receipts and a sending state |
| **Sell** | Post a listing: details, a photo resized on the phone, an optional video of up to 60 seconds, then submitted for moderation |
| **Account** | Supabase sign-in and sign-up, the person's name, saved listings, language |

Colours, promotion themes and button shapes match `web/src/index.css` and the
Android theme, so the three apps read as one product. Four languages, English as
the per-key fallback; listing and promotion text is translated by the backend.

## What is not in it

- **Video is uploaded as recorded**, with only a length and size check. iOS
  cannot re-encode it cheaply, so a 20MB ceiling is enforced instead. The poster
  frame is extracted on the phone with AVAssetImageGenerator.
- **Photos upload as JPEG**, not the WebP the web app produces — iOS has no WebP
  encoder in the SDK. The backend accepts JPEG.
- **The session lives in `UserDefaults`.** Before the App Store it belongs in the
  Keychain, which is not restored onto another device from a backup.
- **Saved listings may come back empty.** `/users/me/favorites` returns raw
  product rows rather than the card shape this app decodes; the screen fails
  soft rather than crashing.
- No push notifications, no offline cache, no favourite toggle on the card, and
  no realtime socket — messaging polls, as Android does.
- No right-to-left layout, and no App Store metadata.

---

## If the first build fails

These are the likely ones, all quick:

| Xcode says | Fix |
| --- | --- |
| `Cannot find 'X' in scope` | A file is not in the target. In the Project navigator select it, and tick *EastMarket* under Target Membership. |
| `Value of optional type must be unwrapped` in a `Picker` | The optional `.tag(...)` needs the exact type, e.g. `.tag(Category?.some(item))`. |
| `Main actor-isolated property ... in a nonisolated context` | Add `await`, or mark the enclosing function `@MainActor`. |
| `'onChange(of:perform:)' was deprecated` | A warning only on iOS 17; it still works. To silence it, use the two-parameter closure. |
| `No such module 'PhotosUI'` | Set the deployment target to iOS 16 or later. |
| Sign-in says the key is not set | The project was generated without `setup.sh`. Run `./setup.sh`, or paste the publishable key into `project.yml`. |
| Listings do not load on a device | `API_BASE_URL` still points at `localhost`. Use the Mac's Wi-Fi address and check the firewall. |

Paste any error you cannot place and I will fix it in the source.

## Layout

```
ios/
├── project.yml                XcodeGen spec (the project file, reviewable in git)
├── setup.sh                   generate the project and open Xcode
└── EastMarket/
    ├── App/                   entry point, tab shell, stored preferences
    ├── Auth/                  Supabase sign-in, sign-up, token refresh
    ├── Networking/            API client, endpoint list, models
    ├── Design/                colours, button styles, price formatting
    ├── Localization/          en / so / am / sw strings
    ├── Features/              Home, Browse, Product, Messages, Sell, Account
    └── Resources/             Info.plist, app icon, launch colour
```
