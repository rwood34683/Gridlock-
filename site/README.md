# GRIDLOCK static site

`index.html`, `support.html` and `privacy.html` restore the missing static companion site. The landing page uses actual app captures with example data. It does not claim store availability or message delivery.

From the project root:

```sh
npm run serve
npm run shots
npm run app:artifact
npm run site:check
```

To preview the companion site, stop the app server and run `node scripts/serve.js --root site`, then open `http://localhost:5173/`. `app:artifact` creates `site/app.html` and `site/build/app.html`; each is a complete single-file browser app. `site:artifact` creates a self-contained landing page at `site/build/artifact.html` with working embedded app, privacy and support destinations. Regenerate after source changes. Files in `build/` are convenience exports and can be excluded from a static upload.

Use the existing app at the same address to keep access to that browser's local season. Browsers separate local storage by origin. No data is sent to a cloud account.

## Configure an actual release

No support mailbox, domain, store ID or signing identity was provided. `contact.json` records these as null, the support page says so, and the app-link association is an empty valid JSON array. Set only values you control:

```sh
npm run contact -- --domain your-real-domain.com --email support@your-real-domain.com
npm run contact -- --appstore YOUR_NUMERIC_ID
npm run contact -- --play https://play.google.com/store/apps/details?id=com.upra.gridlock.coach
npm run contact -- --sha256 YOUR_COLON_SEPARATED_SHA256
npm run site:check -- --release
```

Setting a domain does not invent a support email. Store links remain absent until explicitly configured. Setting a signing fingerprint writes the Android association file. A real release still needs the domain, support contact, store entries and signing verification. The privacy notice describes this code's behavior; review it for any services or distribution changes you introduce. This work does not publish anything.
