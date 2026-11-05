# Site association files

Android and iOS both decide whether an app may open this site's links by
fetching a file from here over HTTPS. The host must match what the apps
declare, which is why these live in the marketplace's own `public/` folder
rather than anywhere else: `east-market-web.vercel.app` is the site people
are given, so it is the host the apps claim.

Vercel serves everything under `public/` verbatim, and the SPA rewrite in
`vercel.json` explicitly steps around `/.well-known/` so these come back as
themselves rather than as `index.html`.

## assetlinks.json — Android App Links

Lists which app may open `https://east-market-web.vercel.app/product/...`,
identified by package name and signing certificate. Android fetches it when
the app is installed and again periodically; until it verifies, a tapped
link opens the browser instead.

The fingerprint in the file today is the **debug** signing certificate, which
is what `assembleDebug` and the APK people are sideloading use. Two more will
be needed:

- **Release builds you sign yourself** — the upload key in
  `android/my-upload-key.jks`:

  ```
  keytool -list -v -keystore android/my-upload-key.jks -alias upload
  ```

- **Play Store builds** — Google re-signs with its own key, so the
  fingerprint comes from Play Console → Setup → App signing → *App signing
  key certificate*. The debug one will not match a Play build.

Add each as another string in `sha256_cert_fingerprints`; the array is a list
of certificates that are all allowed, not a choice between them.

Check the result with Google's own validator:

    https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://east-market-web.vercel.app&relation=delegate_permission/common.handle_all_urls

## apple-app-site-association — iOS Universal Links

Not here yet, and cannot be until there is an Apple Developer account: the
file has to name the Team ID, which is issued with the account. When there is
one, add a file called exactly `apple-app-site-association` (no extension)
next to this README:

```json
{
  "applinks": {
    "details": [
      {
        "appIDs": ["TEAMID.com.eastmarket.app"],
        "components": [{ "/": "/product/*", "comment": "A listing" }]
      }
    ]
  }
}
```

and add `"associatedDomains": ["applinks:east-market-web.vercel.app"]` to the
`ios` block of `mobile/app.json`. iOS insists the file is served as
`application/json`; `vercel.json` already says so for that path, so it will
work the moment the file exists.
