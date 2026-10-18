# Phase 12 — whole-app visual review

This is the complete RQ-051–RQ-062 visual implementation batch, based on the 48 light and dark reference screens in `design/roqia-v2`. It is prepared for the owner's screen-by-screen review; it does not record owner acceptance or start Phase 13. Branch: `phase_12/visual-polish`, based on merged Phase 11 PR #14.

## What changed

- Shared compact headers, grouped settings, radio/checkbox rows, switches, segmented choices, adjustable sliders, gold ornaments, chapter badges and original vector illustrations use the existing semantic theme and typography tokens.
- Prayer, Qibla, calibration, location, calculation, adhan and sound screens use the reference hierarchy while retaining real city/time/source/permission states.
- Opening guidance, ruqya, adhkar, searchable duas and tasbih use the reference cards and controls. Counters, bookmarks, copy, audio and scoped reset remain available.
- More, About, legal information, reminders and settings are regrouped. Full original legal/guidance text remains available. Confirmation and external-link failure surfaces use the shared themes.
- Quran library, edition/download selection, original-source readers, translation choices, reader preview/settings, search, bookmarks and sources are restyled. Reader typography remains independent of interface scaling. Returning from translation selection refreshes that field without discarding draft typography.
- Reciters, chapter selection, offline audio, the full and mini players, downloads and storage are restyled. The chapter-download action remains visible while scrolling the 114 chapters. Playback rate/repeat/sleep and download retry/pause/cancel retain their existing implementations.

## Review evidence

All 48 supplied screens have actual light and dark Android captures (96 total), inspected beside their references. The [screen comparison index](SCREENSHOTS.md) links each original reference beside the actual Android capture. The [interactive local gallery](index.html) provides the same comparison with theme filtering. The [coverage tracker](../../../design/roqia-v2/implementation/VISUAL-COVERAGE.md) maps all 48 screens to the 12 tickets.

Captures use the production-JavaScript review build on the existing Android 16 / API 36 arm64 emulator, `emulator-5554`. They are ordinary app screens and real navigated states, not mock screens or reference PNG backgrounds. The status bar, clock, keyboard, system navigation and source data are Android/runtime values.

Validation results and data-preservation evidence are recorded in `evidence/`. No uninstall, app-data clear, signing/version change, source-font substitution or fabricated production content is part of this batch.

## Saved-data preservation

The [before/after comparison](evidence/preservation.json) passes: 207 counter rows, the original bookmark, three reminders, both reader preference records, app settings, prayer preferences and sounds are preserved. All 469 existing content files are byte-identical and all eight installed packs retain their catalog hashes. Reader sizes, views, keep-awake, theme and emulator display/network/mail settings are restored.

Navigation updates the two reading positions. One cancelled offline-download history entry remains; it downloaded no content, and there are no active downloads or playback session. See [cleanup state](evidence/cleanup.json). Raw device backups remain local and are not committed.

## Deliberate data and platform differences

- The app retains the approved King Fahd Warsh source with its matching font, Tanzil Hafs, Muhammad Hamidullah French and Pickthall English. Reference sample publisher/translator/reciter names do not replace the actual catalog. Quran text, including embedded source verse markers, is not reformatted to imitate a picture. Separate interface badges/counters use Western digits.
- Reader comparison captures use the available larger reading size. The original saved reader preferences are restored after the test. Long original devotional texts remain complete and scroll rather than being clipped to show the same number of cards as the shorter design samples.
- Counts, bookmarks, reading positions, prayer times, file sizes, storage, installed editions and download progress are real. No sample 50% download, sample target 33, unsupported Moroccan recording, fake vibration preference, verse-synchronized audio, or unverified Warsh translation mapping is introduced.
- Native audio uses complete verified recordings. The current sound catalog offers the original Doha normal/Fajr recordings, and playback follows system alarm/media volume. The reference's sample waveform and per-app volume are not represented as working controls.
- Qibla accuracy reflects the available sensor. Calibration instructions do not animate a fictitious accuracy improvement. The location list contains the supported cities and retains explicit coordinates/timezone entry.
- There are three existing daily devotional reminders, with independently saved days/times. A fourth Quran reminder is not invented to fill the design sample.
- Original vector artwork follows the reference compositions; it is not the raster illustration itself. Source publisher logos and scripture are not drawn into decorative art. Final ornament, icon, spacing and source-font appearance remain open to owner feedback. The implementation uses the specified compact type tokens; raster samples often show larger headings, more decorative detail and different card proportions. These visual differences remain visible in the gallery and are not marked as accepted.

## Validation scope

- 90 existing shared regression tests and 4 focused control tests pass. The latter exercise slider touch/accessibility changes, fractional labels, switch state and storage selection semantics.
- TypeScript and changed-source formatting checks pass; the Android review APK builds and installs in place. Three native/patch tests, sleep-timer checks and complete Warsh/Hafs font-coverage checks pass.
- Capture build hashes and the small differences between capture builds are recorded in [capture provenance](evidence/capture-builds.md). Native splash recordings retain the real OS launch timing.
- Screen-by-screen normal-size comparison is separate from [representative narrow/large-text checks](ACCESSIBILITY.md): 15 screens at 320 dp and 18 at 200% text, including the error/reset dialogs. These are not a complete device/accessibility certification.

## Acceptance boundary

Every supplied screen belongs to this review batch. Android emulator visual inspection and passing regression tests do not establish physical compass accuracy, TalkBack quality, OEM notification behavior, old-device font shaping, qualified Arabic/source review or iOS acceptance. Those existing release gates remain separate. Owner visual acceptance is pending.

## Reproduction

- Build `:app:assembleReview` with the repository's Android SDK and Java setup; install with `adb -s emulator-5554 install -r`.
- Back up the populated app before UI tests. Keep the existing phase-6 hierarchy helper installed.
- `tools/phase12/android-visual.py` captures direct routes for one theme.
- `tools/phase12/android-journeys.py` captures onboarding, confirmation, translated reader, bookmark, audio and offline states. It temporarily removes the emulator mail handler for a genuine external-link error and restores it immediately. It cancels only the newly requested offline test download. Reader sizes/theme must be restored after the complete matrix.
- `tools/phase12/android-splash.py` records the actual cold launch without delaying hydration. Select the real splash frame from that video, retaining its timestamp in the evidence.
- `tools/phase12/build-gallery.py` uses Pillow to assemble comparisons from those captures and the immutable references.

The native launch vector can be regenerated with `tools/phase12/brand.swift` and the existing `src/assets/fonts/RoqiaArabic600.ttf` using Swift/CoreText. It outlines the UI brand text only; it does not modify or generate scripture.
