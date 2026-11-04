# Magan Market — Expo app

The marketplace as a React Native app, built with Expo. One codebase that runs
on both phones, and — the reason it exists — **you can run it on your own
iPhone from a Windows machine, with no Mac, no Apple Developer account and no
sideloading.**

The SwiftUI app in `../ios` and the Kotlin app in `../android` are still here
and still build. Nothing was removed.

## Run it on your phone

```bash
cd mobile
npm install
npm start
```

Install **Expo Go** from the App Store, open the camera, point it at the QR
code in the terminal. The app loads over your network and reloads as the code
changes.

Your phone and this computer have to be on the same Wi-Fi. If they are not, or
the network blocks the connection, use a tunnel instead:

```bash
npx expo start --tunnel
```

## What it talks to

`app.json` → `expo.extra` holds every address in one place:

| Key | Points at |
| --- | --- |
| `apiBaseUrl` | the marketplace API on Vercel |
| `webBaseUrl` | the website, where password resets and email confirmations land |
| `supabaseUrl` | the Supabase project |
| `supabaseAnonKey` | the publishable key |

The anon key is public by design — the web and Android apps ship it too, and
row level security is what protects the data. The service role key belongs on
the backend and nowhere near a phone.

## Layout

```
app/                 screens, routed by file name (expo-router)
  (tabs)/            Home, Browse, Sell, Messages, Account
  product/[ref]      one listing
  videos             the vertical video feed
  chat/[id]          one conversation
src/
  api/               client, endpoints, the shapes the backend returns
  store/             session and preferences
  components/        the pieces more than one screen uses
  strings.json       English, Somali, Amharic and Swahili
```

`src/strings.json` was lifted from the SwiftUI app so the wording is identical
for anyone who uses both. The 14 video strings that Amharic and Swahili were
missing there have been filled in here.

## Checks

```bash
npm run typecheck                        # tsc --noEmit
npx expo export --platform ios           # proves it bundles
```

## Building something installable

Expo Go covers development. A build you can hand to someone else, or put on
TestFlight, goes through EAS:

```bash
npx eas build --platform ios --profile preview
```

That still needs an Apple Developer account — the signing requirement does not
go away, it just moves to Apple's servers instead of a Mac you do not have.
