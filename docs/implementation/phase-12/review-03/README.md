# Combined owner visual review — all 48 references

This extends the still-open PR #17 on `phase_12/adhkar-visual-review`. The owner requested one combined pass over the remaining screens, using the same `design/roqia-v2/reference/light` and `dark` designs. The previous screens 01–14 refinements are retained and included in the regression comparison.

## Changes

- Shared interface titles, labels, fine icon strokes, round icon backgrounds, row spacing, card borders and corners follow the reference proportions. Quran and devotional source text/fonts remain unchanged, and saved reader sizing still controls scripture.
- The full player now uses a framed book illustration, separate chapter/reciter hierarchy, a central transport panel, a larger play/pause control, and separate timer/repeat/speed tiles. Existing seeking, queue, stop, speed, repeat and sleep behavior remains available.
- More/About have a larger gold identity panel; legal/settings/source rows use the consistent icon and card treatment. The stray literal newline on Sources is removed. Reset-all uses the centered confirmation composition, while scoped reset retains the bottom sheet and its new drag-handle decoration.
- Quran library rows and chapter frames, reader chapter headings and bookmark placement, edition/download artwork, audio checkboxes and offline play controls are refined. The original Quran text, source fonts, translation metadata and reading preferences are preserved.
- Prayer’s next-prayer panel and list spacing are refined; location, Qibla/calibration, calculation, adhan, reminders and settings use the shared control refinements. The sound selector places its stop action after the recordings. Real timetable values and sensor/permission states remain authoritative.
- Download cards avoid empty subtitle gaps; storage usage has a clearer total and icon hierarchy. Actual byte counts, installed packs and retry/pause/delete behavior are preserved.
- Android bundle tasks now track imported design/token JSON. This fixes the stale-icons issue found during review: a JSON-only design change must invalidate the bundled JavaScript.

## Evidence

The [comparison gallery](index.html) (48 screens × 2 themes, 96 captures) shows actual Android captures next to all 48 original references in both themes. Screenshot inventory and hashes are in `captures.json`; focused player checks and 18 responsive captures (nine screens at 320 dp, and the same nine at 200% system text) accompany the matrix. This is implementation evidence for the owner's final visual review, not owner acceptance.

TypeScript, changed-source formatting and 95 regression tests pass. The arm64 Android review APK is installed in place, without uninstalling or clearing data. The populated-data comparison is in `preservation.json`. Cold-launch videos and exact extracted-frame filters are recorded in `splash-frames.json`. Build identity and restored device conditions are in `build.json`; playback interaction results are in `player-checks.json`. The JSON bundle-input check verified that icons, illustrations and palette files invalidate the Android bundle task.

The responsive subset covers Tasbih, More, both reset dialogs, Quran library/reader, player, prayer and settings. It is focused coverage, not a claim that every screen was exercised at every accessibility setting. The screenshot matrix uses saved reader sizes rather than rewriting user preferences to imitate reference text sizes.

## Deliberate differences

The references contain sample counts, shorter devotional text, reciter/publisher choices and illustrative progress. The app displays the real installed catalog, full original source text, saved progress, live prayer times and actual audio/download positions. It does not invent extra reciters, a fourth reminder, a volume or vibration setting, verse-synchronized audio, sensor accuracy or sample downloads to fill a picture.

The vector illustrations follow the supplied compositions; no reference-screen bitmap is used as an app screen. Android emulator verification is separate from iOS and physical-device acceptance. Phase 13 starts after the owner's visual review, not merely because screenshots were captured.
