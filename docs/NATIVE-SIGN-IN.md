# Signing in on the phone apps the same way as the web app

The live web app (https://app.gridlockpb.com/) signs in against the account
server. The phone apps do the same when they are built from the **cloud
build**. This page covers the three pieces that make that work.

## 1. A store build is always the cloud build

`npm run sync` and `OPEN-IN-XCODE.command` package the offline app. Its sign-in
is a lock kept on that one phone, so a gridlockpb.com account does not exist
there. That is fine for a simulator, but it must never reach a store.

- **iPhone.** Run `npm run ios:cloud` (or double-click
  `OPEN-IN-XCODE-CLOUD.command`), then use Product > Archive. The App target's
  first build step, **Refuse an offline store build**, stops a device Release
  build or archive if the shell lacks any of these:
  - the account adapter;
  - its config;
  - the app's sign-in callback.

  It also stops one that carries a secret key. Debug builds and simulator
  builds are never stopped.
- **Android.** Run `npm run bundle:android` (or `build:android`). It syncs the
  cloud build, runs Gradle, and puts the offline build back afterwards, even
  if Gradle fails. `android/app/release-guard.gradle` makes the same checks as
  the iPhone step on any release task, so a release started from Android
  Studio after a plain `npm run sync` is refused too.
- **Shipping the offline build on purpose.** This applies to a variant brand,
  which has no account server.
  - Android: set `GRIDLOCK_OFFLINE_RELEASE=1` in the environment, or pass
    `-PgridlockOfflineRelease` to Gradle.
  - iPhone: add the build setting `GRIDLOCK_OFFLINE_RELEASE = 1`.

  Either way the build says so in a warning.

Both guards are written by `scripts/configure-native.js`. Every sync re-applies
them, so regenerating a shell never loses them.

## 2. The Android cloud build

`npm run android:cloud` does the same thing for Android that `ios:cloud`
does for iPhone (the shared code is `scripts/native-cloud.js`):

1. builds `dist/cloud-android/` with the callback `gridlock://auth/callback`;
2. syncs it into `android/`;
3. checks the shell.

Add `-- --no-open` to skip opening Android Studio. Run `npm run sync` before
`git pull` to put the offline build back.

Both phone builds read the Supabase project's **public** values from:

1. the environment;
2. `.env.cloud`;
3. the owner-confirmed `cloud` block in `site/contact.json`.

The URL and key always come from the same one of these. With `site/contact.json`
filled in, no `.env.cloud` is needed. A secret or service-role key is refused.

Supabase > Authentication > URL Configuration > Redirect URLs must list
`gridlock://auth/callback`, or confirm-email and reset links will not come
back to the app. Only the owner can add it.

## 3. A password saved on the website, offered in the app

A coach who saved his password in Safari or Chrome at gridlockpb.com or
app.gridlockpb.com should see it offered in the app.

- **iPhone (iCloud Keychain).**
  - The app's `App.entitlements` asks for `webcredentials:` on both hosts.
  - Each host serves `/.well-known/apple-app-site-association`, naming the app
    as `<Team ID>.com.upra.gridlock.coach`.
  - Set the Team ID once: `npm run contact -- --appleTeam <10-character ID>`.
    It is under Apple Developer > Membership details.
  - Until it is set, the file lists no app, and the site check reports it as
    pending.
  - With automatic signing, Xcode adds the Associated Domains capability to the
    App ID the first time it signs.
- **Android (Google Password Manager).**
  - The app's `asset_statements` points at both hosts' `assetlinks.json`.
  - Each `assetlinks.json` grants the app `get_login_creds` beside its app links.
  - Both depend on the release signing fingerprint
    (`npm run contact -- --sha256 …`).

Where the files are served from:
- **gridlockpb.com:** `site/.well-known/` holds the files, and `npm run build`
  publishes them.
- **app.gridlockpb.com:** `npm run build:cloud` writes the same two files into
  `dist/cloud/.well-known/`, so they upload with the web app. The phone builds
  leave them out.

## What only a Mac, a phone or the owner can confirm

- **Archiving in Xcode.** Archive once after `npm run ios:cloud`. Then confirm
  that archiving after a plain `npm run sync` stops with the guard's message.
- **Gradle.** The guard was run with real Gradle on a stand-in project. A full
  `bundleRelease` needs the Android SDK and the upload keystore.
- **Served files.** After deploying, both `https://gridlockpb.com/.well-known/apple-app-site-association`
  and `https://app.gridlockpb.com/.well-known/apple-app-site-association` must
  return the JSON. Apple fetches them through its CDN, which can take a day to
  refresh. Check the same for `assetlinks.json`.
- **On a phone.** Save a password at app.gridlockpb.com in Safari, open the
  app's sign-in, and confirm the QuickType bar offers it. Do the same with
  Chrome and the Android app.
