# The offline preview

The preview is a Claude artifact. It is the landing site and the web app in one
page, so people can try Gridlock without installing anything:
https://claude.ai/artifact/JoZQM9DA52jnHbKQJTu4UP

It is the committed `site/` and `web/` and nothing else: no cloud adapter,
configuration, keys or admin page. `scripts/package-preview.js` builds it and
refuses to finish if any of those appear. Sign-in, cloud saves and admin live on
the live app, https://app.gridlockpb.com/.

## What the preview adds to the app

`scripts/package-preview.js` adds the following when it builds the preview, and
in no other build. The real app is unchanged.

| Where | What | Why |
| --- | --- | --- |
| Every page | A notice that the preview runs offline, with **Open the live app** | Sign-in, cloud saves and admin are not in the preview |
| Every page | If the viewer will not open a new tab, the notice prints `https://app.gridlockpb.com/` | The link never fails silently |
| The app | The notice says downloads are switched off | The viewer never lets a page save a file |
| The app | **Save a copy** shows the season as text and says no file was saved and nothing counts as a backup | The text is the only way out of the preview; a copy shown is not a copy kept |
| The app | **Send this sheet** copies the sheet, or shows it as text, and says no file was saved or sent | Same reason |

It also scopes a few lines on the landing and support pages ("This offline preview
has no server…") so they do not promise something the preview cannot do.

## Build and publish

1. Start from a clean checkout of the commit to publish, normally `main` after a
   merge. The script refuses tracked changes.
2. Build:

   ```bash
   npm run preview:package        # writes dist/preview/artifact.html and dist/preview/manifest.json
   npm run test:preview           # builds a copy in dist/preview-test/ and checks it in a browser
   ```

3. Publish `dist/preview/artifact.html` to the existing artifact URL above. Do not
   create a new artifact, and do not change who it is shared with.
4. Record what was published, with the version the artifact service returned:

   ```bash
   node scripts/package-preview.js --record docs/preview-manifest.json \
     --published "https://claude.ai/artifact/JoZQM9DA52jnHbKQJTu4UP,<version>,<version id>"
   ```

   Commit `docs/preview-manifest.json`.

## The manifest

`docs/preview-manifest.json` is the record of the published preview:

- `sourceCommit`: the commit it was built from.
- `sourceTrees`: the git trees of `web/` and `site/` at that commit.
- `inputs`: the sha256 of each source page.
- `outputs`: the sha256 of each built page and of `artifact.html`.
- `script`: the sha256 of the packager.
- `published`: the artifact URL, version and version id.

The build is deterministic. When the inputs and the packager are unchanged,
`npm run test:preview` checks that a rebuild produces the recorded
`artifact.html` byte for byte. When either has changed, the check says so and
the manifest is re-recorded at the next publish.

## What cannot be checked from the build environment

- **What a signed-out visitor is served.** The public page loads there, but the
  network proxy blocks the viewer's own scripts. The artifact service reports
  whether a share is pinned to a version, and reading the artifact back shows
  the published file. To see it as a visitor does, open the link in a private
  window.
- **Whether the claude.ai viewer lets the link open a new tab.** If it does not,
  the fallback address appears.
