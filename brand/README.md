# Gridlock brand assets

The default app uses `logo-gridlock.png`: the ball isolated from the owner's
"Cinematic GRIDLOCK Paintball Splash-1.png" artwork with the built-in image
editor on 10 November 2026. The edit removes the surrounding wordmark and
scene, retaining a black ball, red paint and white GRIDLOCK lettering on a
transparent canvas. It is an edited asset, not a pixel-identical crop.

The original `icon.svg`, `foreground.svg` and `splash.svg` remain the neutral
direction mark for the other brands. `shared-icons/` contains generated
neutral web icons. A variant never receives the ball's painted brand name.

Run `npm run icons` after changing the artwork. The portable Node generator
uses `sharp` and writes the app logo, browser icons (including Apple touch),
store icons and splash previews, and native icon/splash directories when
present. The app's ball fits the maskable and adaptive safe areas. The public
website keeps its existing wordmark and neutral favicon.

`npm run brand native <brand>` also regenerates native launch assets for
that brand. Run `npm run sync` after generating the default app assets.
The old Python entry point delegates to this same Node generator.

Store PNG icons are opaque. Android round and adaptive foreground icons have transparency. Native signing, screenshots and store metadata are separate from brand rendering.
