# A tester's beta build

A beta build is the cloud build made for one named tester, with a last day.

- His name is printed faintly across every screen, so a screenshot or a
  passed-on copy shows whose it was.
- The welcome page says the copy is confidential and the property of
  Gridlock PB LLC.
- After the last day the app closes. The one thing left on screen is
  **Save everything**, so his season is never held hostage. It loads into the
  next build under Nexus › Load a copy.

A web app can never be made copy-proof. This makes a copy traceable and
short-lived; it does not make it secret. For anything that must not leak, an
NDA is the protection, not the build.

## Make one

From a fresh checkout of main, with the same public values as the live build
(see CLOUD-AUTH-SETUP.md):

```sh
GRINDX_BETA_NAME="Lucas Haden" \
GRINDX_BETA_UNTIL=2026-12-31 \
GRINDX_AUTH_REDIRECT_URL=https://beta-lucas.gridlockpb.com/ \
npm run build:beta
```

- The name may use letters, digits, spaces and `. ' -`, up to 40 characters.
- The last day is `YYYY-MM-DD`, from today to 180 days out. The copy works
  through that whole day on the tester's phone.
- The build goes to `dist/beta-<name>/`. It refuses to write over
  `dist/cloud/`, the live build.

## Host it

- Put `dist/beta-<name>/` at its own address, never over app.gridlockpb.com.
- Add that exact address to Supabase's redirect allowlist before you send it,
  or his confirmation and reset emails will not land.
- His account is an ordinary account on the same server. Beta invitations,
  plans and administrators stay the server's, as for everyone.

## Limits worth knowing

- The last day is read off the phone's own calendar. A tester who winds his
  clock back gets more days. A build is cheap, so keep the window short and
  make a new one.
- The name is on the screen, not hidden in the file. Anyone can open the page
  source. Treat it as a label, not a lock.
