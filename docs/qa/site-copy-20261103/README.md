# Website copy and sign-in review — 3 November 2026

Phone viewport: 390 × 844.

- signin-phone-before.png: main bb97dd9, cloud-capable sign-in panel.
- signin-phone-after.png: short visible note, closed account/season disclosure.
- signin-phone-details.png: the same panel with its full explanation expanded.
- live-support-phone.jpg: published gridlockpb.com/support after the Grok update.

The app screenshots use a local canSync stub and empty inputs. No real account,
password, season or server operation is used. The disclosure's tap target is
at least 44 px; its browser check fills fixture inputs and verifies opening and
closing preserves both values without horizontal overflow.

The website passed TypeScript and production compile. Home, Privacy and Support
were checked on phone and desktop in development and built previews, including
links, account/sync wording, decoded images, page/console errors and width.
The live domain was checked after publishing for the new support steps, privacy
records, administrator review, platform labels and direct app links.

App validation: all 37 npm run check suites passed, including 1,301 function
checks, 235 device checks across 20 devices and 71 brand checks. npm run
site:check passed 23/23 checks; store listings and Android signing remain
explicitly pending. npm audit reported zero vulnerabilities. Native source
sync passed; native compilation is covered separately by the iOS CI workflow.
