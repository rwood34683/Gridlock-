# GRIDLOCK brand assets

`icon.svg` preserves the original app's red direction mark and five player dots on the dark grid. `foreground.svg` places that mark inside the adaptive icon safe area; `splash.svg` uses it on the dark launch ground.

Run `npm run icons` after editing an SVG. The portable Node generator uses `sharp` and writes store icons, splash previews, browser icons (including Apple touch icon), and the static-site favicon. When generated Capacitor projects exist it also fills their icon and splash image directories. Run the generator again after adding a native platform, then `npm run sync`.

Store PNG icons are opaque. Android round and adaptive foreground icons have transparency. Native signing, screenshots and store metadata are separate from brand rendering.
