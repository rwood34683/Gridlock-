# Who the coach is

Two ways to prove it, both switched off until the native side is wired up.
Neither exists in a browser: the screens appear only where the phone can
actually do the thing, because a button with nothing behind it is worse than
no button.

## The rule underneath both

**The app makes no network calls.** There is not one `fetch` in
`web/index.html`, and that is why everything else works on a field with no
signal. Anything that has to reach a network is an adapter the native shell
fills in.

**No credential ever lives in the app.** A Twilio or Apple key shipped inside
a bundle is a key anyone can pull out of it, and the bill is yours.

**The app never makes a verification code and never checks one.** A code this
device generated and then marked correct proves nothing — the answer was in its
memory the whole time. Only a machine you control can do it.

---

## 1 · Sign in with Apple — do this first

Free, one tap with Face ID, no server of yours, no per-signup cost, no carrier
registration. Apple has already verified the person; the app only accepts the
result.

Apple also **requires** you to offer it if you offer any other third-party
sign-in, so the day you add Google this stops being optional.

### What to do

1. Finish Apple Developer enrollment (Organization — see the enrollment notes).
2. In Xcode: **App** target → **Signing & Capabilities** → **+ Capability** →
   **Sign In with Apple**.
3. Install the plugin and sync:
   ```sh
   npm i @capacitor-community/apple-sign-in
   npm run sync
   ```
4. Fill in the adapter before the app renders:

```js
window.gridlockApple = {
  // -> {sub, email, name} or null if he backed out
  async signIn() { /* SignInWithApple.authorize(...) */ },
};
```

`sub` is Apple's stable identifier and is what the account is keyed on. **Never
key on the email**: it may be one of Apple's private relay addresses, and Apple
withholds it entirely on every sign-in after the first. An Apple account keeps
no password — there is nothing to hash — and a coach who types one at the
password form is told that rather than being told he got it wrong.

---

## 2 · Phone verification — later, when there is revenue to justify it

Built and off. Turning it on costs more than the code.

### What it actually costs

| | |
|---|---|
| **A2P 10DLC registration** | Mandatory in the US. Register the brand under the LLC's EIN, then the campaign. Carriers filter or block unregistered traffic. One-time fees plus a small monthly; days to weeks to clear. |
| **Per verification** | Roughly $0.05–0.08, and you pay on failed attempts too. |
| **SMS pumping fraud** | Bots point at your verify endpoint to blast premium numbers abroad and take a cut. Real money. Needs rate limiting and a country allowlist **from day one**, not after. |
| **App Store privacy label** | Collecting a phone number flips it from *Data Not Collected* — currently a genuine selling point — to collecting personal data. The privacy notice changes with it. |

### What to do

1. Clear 10DLC with Twilio (or your provider) under **United Paintball Referee
   Association LLC** and its EIN.
2. Stand up two endpoints. **Rate limit both**, per IP and per number, and
   refuse country codes you do not sell into.
   - `POST /verify/start`  → `{ok, said}`
   - `POST /verify/check`  → `{ok, said}`
   Twilio Verify holds the code for you; do not store or return it.
3. Fill in the adapter:

```js
window.gridlockVerify = {
  async start(phone)       { /* POST /verify/start */ return {ok, said}; },
  async check(phone, code) { /* POST /verify/check */ return {ok, said}; },
};
```

The screen appears on **More → Nexus** the moment that object exists: number,
Send me a code, the code, verified. On success the app writes `phone` and
`phoneAt` onto the account record and shows it as verified.

---

## What the account record holds

```
{ kind: "apple", sub, email, name }      # Apple: no password to store
{ email, salt, hash }                    # local: salted SHA-256, never in the clear
{ ..., phone, phoneAt }                  # either, once a number is verified
```

It lives in `gridlock.staff.v2`, mirrored durably through
`window.gridlockKeep`. **The season is a different store.** That is the whole
reason a locked-out coach loses nothing by making a new account, and every
sign-in failure message says so.
