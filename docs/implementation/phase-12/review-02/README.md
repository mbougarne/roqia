# Owner review 02 — Ruqya and daily devotionals

Based on merged PR #16 (`67bd8a3`), branch `phase_12/adhkar-visual-review`. This batch addresses the owner's follow-up for screens 08–14; Phase 13 and final visual acceptance remain pending.

## Changes

- The Ruqya listen banner and active mini-player share a clipped, left-aligned arabesque vector background. Foreground controls remain legible and the decoration cannot intercept touches.
- The Adhkar overview uses taller illustrated cards with separate morning/evening tones, the dark green sleep card in light mode, and a compact title/subtitle header.
- Bottom navigation uses finer strokes, a four-tile More icon, and a softer selected shape.
- Morning, evening and before-sleep pages show a compact completed-count/progress/play row. This row sticks below the page title while the illustration and reading cards scroll; real counter values and audio actions are retained.
- Dua has a title illustration, compact search/filter/progress area, and a full-width listening action on each card with audio.
- Tasbih has an inset counter panel, an outlined arch around its ring, and a ringed tap control. Its original text, target/count semantics and existing actions are retained. No settings or functionality were added.

## Verification

Evidence from the existing Android arm64 emulator is collected in `screenshots/`, with comparisons in [the gallery](index.html). The original light/dark references remain unchanged. Reference sample devotional counts and abbreviated text are not substituted for actual saved progress or original source text.

TypeScript and 16 Phase 11/12 regression tests pass. The review APK builds and installs in place. Native captures and sticky-header checks cover all three Adhkar categories in both themes. See `sticky-controls.json` for the pinned control bounds and `preservation.json` for the populated-data comparison.

Android emulator evidence does not establish iOS or physical-device acceptance. The artwork is native vector interpretation of the supplied composition, not a raster crop of the reference. Owner visual review remains open.

## Capture provenance

Final review APK SHA-256: `fc46c77e7e21c3007cbfbb2d5a756b227baf8b7805c11e9ae7a6e1f8c96b3242`.
Screens 08, 09 and 13 were recaptured from the final icon bundle. Screen 14 and the pinned morning playback state were captured after the action-card/Tasbih refinements; screens 10–12 and their six scrolling checks came from the first review build. Their rendered components did not change afterward. TypeScript was rechecked after all edits.

The current React Native Gradle task tracks JS/TS inputs but omits JSON. After editing `src/design/icons.json`, force `:app:createBundleReviewJsAndAssets --rerun-tasks`, then run `:app:assembleReview -PreactNativeArchitectures=arm64-v8a`; an ordinary incremental build alone can retain old icons. The final installed APK was rebuilt this way and its icon captures were checked again.
