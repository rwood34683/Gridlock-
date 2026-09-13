# Speech recognition dependency source notice

GRIDLOCK uses `@capgo/capacitor-speech-recognition` version **8.2.0**, licensed under the Mozilla Public License 2.0. Upstream source and license are available in the [Capgo repository](https://github.com/Cap-go/capacitor-speech-recognition) and the [exact published source package](https://registry.npmjs.org/@capgo/capacitor-speech-recognition/-/capacitor-speech-recognition-8.2.0.tgz).

GRIDLOCK makes one Android source modification in `android/src/main/java/app/capgo/speechrecognition/SpeechRecognitionPlugin.java`, within `onResults(Bundle results)`. It replaces:

```java
ArrayList<String> matches = buildMatchesWithUnstableText(results);
```

with:

```java
// GRIDLOCK: finalized callbacks must exclude speculative UNSTABLE_TEXT.
ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
```

This modification is supplied under MPL-2.0. The complete reproducible modification is in `scripts/patch-speech-plugin.js`; `npm ci` applies it automatically through `postinstall`. Native synchronization applies the same idempotent patch, and `npm run native:check` verifies it. The script checks the exact dependency version and original method before modifying it. Source is installed under `node_modules/@capgo/capacitor-speech-recognition/`; its license and notices remain intact. If distributing compiled native binaries, provide this notice and the corresponding modified dependency source to recipients as required by MPL-2.0.

Upstream's helper appends the optional Android `UNSTABLE_TEXT` field. GRIDLOCK accepts only the finalized `RESULTS_RECOGNITION` list from the final callback. Interim callbacks are not used to create observations. No iOS dependency source is changed.
