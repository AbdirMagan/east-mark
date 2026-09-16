# East-Market — iOS

SwiftUI, iOS 16+. The same backend as the web app and the Android app: listings,
search, promotions, messaging and posting a listing all go through
`/api/v1`, so a chat started on the web continues here.

> **Never compiled.** This app was written on a Windows machine, where Xcode does
> not exist. Everything here is unbuilt: expect a handful of compile errors on
> the first build and fix them in Xcode. Nothing in it has been run or tested.

---

## Build it

1. **Generate the project** (the repo keeps `project.yml` rather than a
   `.xcodeproj`, so the app is reviewable in git):

   ```bash
   brew install xcodegen
   cd ios
   xcodegen generate
   open EastMarket.xcodeproj
   ```

   No XcodeGen? Create a new iOS App in Xcode (SwiftUI, iOS 16), delete its
   `ContentView.swift` and `...App.swift`, then drag the `EastMarket` folder in
   with *Create groups* ticked, and copy the Info.plist keys listed below.

2. **Set the Supabase anon key.** `project.yml` reads it from a build setting so
   the key is not committed twice. Either export it before generating:

   ```bash
   SUPABASE_ANON_KEY=your-anon-key xcodegen generate
   ```

   or paste it straight into `project.yml` under `SUPABASE_ANON_KEY`. It is the
   **anon** key — publishable, the same one the web and Android apps ship. The
   service-role key must never appear in an app.

3. **Point it at the backend.** `API_BASE_URL` in `project.yml`:

   | Running on | Value |
   | --- | --- |
   | Simulator, backend on the same Mac | `http://localhost:4000/api/v1` |
   | A real iPhone | `http://<your-Mac-Wi-Fi-IP>:4000/api/v1` |

   An iPhone reaches the backend over Wi-Fi even when plugged in by USB, so
   `localhost` there means the phone itself. Find the Mac's address with
   `ipconfig getifaddr en0`, keep both on the same network, and allow port 4000
   through the Mac's firewall.

   Plain HTTP is allowed in this project only through `NSAllowsLocalNetworking`.
   A release build should point at an `https://` API and that exception should
   go.

4. **Signing.** Set your team in *Signing & Capabilities*, then run.

---

## What is in it

| Screen | What it does |
| --- | --- |
| **Home** | The promotions carousel (the same slides staff post in the admin dashboard), category chips, featured and recent listings. Pull to refresh, and a refresh button. |
| **Browse** | Search, category filter, sort, results grid. |
| **Listing** | Photo gallery, price, condition, description, seller, and Call / WhatsApp / Message buttons. |
| **Messages** | The inbox and one conversation, refreshed every four seconds, with read receipts and a sending state. |
| **Sell** | Post a listing: details, a photo resized on the phone, then submitted for moderation. |
| **Account** | Sign in and sign up through Supabase, the person's name, saved listings, language. |

The design tokens, the promotion themes and the button shapes match
`web/src/index.css` and the Android theme, so the three apps look like one
product. Four languages, with English as the fallback for a missing string;
listing and promotion text is translated by the backend.

## What is not in it

- **Photos are JPEG**, not the WebP the web app uploads. iOS has no WebP encoder
  in the SDK; the backend accepts JPEG.
- **The session lives in `UserDefaults`.** Before the App Store it belongs in the
  Keychain, which is not restored onto another device from a backup.
- No push notifications, no offline cache, no favourites toggle on the card, and
  no real-time socket — messaging polls, as the Android app does.
- Not localized for right-to-left, and the App Store metadata is not written.

## Layout

```
ios/
├── project.yml                XcodeGen spec (the project file)
└── EastMarket/
    ├── App/                   entry point, tab shell, stored preferences
    ├── Auth/                  Supabase sign-in, sign-up, token refresh
    ├── Networking/            API client, endpoint list, models
    ├── Design/                colours, button styles, price formatting
    ├── Localization/          en / so / am / sw strings
    ├── Features/              Home, Browse, Product, Messages, Sell, Account
    └── Resources/             Info.plist, app icon
```
