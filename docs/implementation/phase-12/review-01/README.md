# Phase 12 — owner review, screens 01–08

This follow-up addresses the owner's first review of merged PR #15. Branch `phase_12/splash-onboarding-ruqya-review`, based on `407ca03`. Screens 09–48 and content wording remain for later review. Visual acceptance remains with the owner.

[Open the light/dark comparison gallery](index.html). Each screen pairs the original reference with a real Android capture.

## Changes

- **01:** Read the saved theme once from existing SQLite storage before React/Activity startup; cache it for React initialization and use the existing JS storage connection for later updates. Synchronize Android's system splash preference after theme saves. Add geometric corner ornaments to the native launch background and React hydration view, with theme-specific placement.
- **02:** Remove the cross-shaped ornament from the book illustration. Separate the three benefit cards; restore gift/no-ads/download icons and spacing. Make Skip a borderless text action.
- **03:** Redraw the headphone illustration; restore the audio-card composition and download callout. The preview plays real bundled audio and stops when leaving that guide step. Waveform artwork is decorative; the progress bar uses actual playback position.
- **04:** Separate navigation cards with icons and chevrons, including the different icon placement in the dark reference.
- **05:** Restore the large sample counter card and separate morning/evening/before-sleep icon cells. The sample counter remains isolated from saved devotional counters.
- **06:** Replace appearance segments with accessible, mutually exclusive radios. Separate appearance, text size, numeral sample and reset explanation; fit the normal-size footer and allow scrolling at larger text sizes.
- **07:** Restore the centered book/title and three guidance cards. Preserve the complete existing guidance text in an expandable section.
- **08:** Restore the listen hero and rounded mini-player, including circular transport control, decorative waveform and real progress. Stop remains available in the full player, opened by tapping the mini-player title.

## Playback defect

The release bundle's audio identifiers (for example `src_assets_audio_roqia01`) were passed as plain file-path strings. Android's player raised `FileNotFoundException` / `Source error`. Passing the original `require()` handle lets RNTP resolve the packaged raw resource. A regression test now asserts this contract; downloaded-file playback retains its verified file paths.

## Verification

- Android review APK builds and installs in place, retaining application ID/version/signing. TypeScript and changed-source formatting pass.
- 95 shared regression tests pass, including the new bundled-resource test. The 7 focused player/control tests pass after the final changes. Three native/patch tests and full Warsh/Hafs font coverage also pass. An additional native contract test verifies that SQLite is closed before React starts and never reopened by runtime theme changes.
- Playlist and single-card playback reach Android `PLAYING(3)` without a source error. Pausing records `PAUSED(2)` at 2,906 ms, proving actual position advance. Stop works from the full player.
- Dark app/light OS, light app/dark OS, follow-system dark/light, onboarding radio selection and maximum interface text size are exercised. Normal-size guide footers fit; large text scrolls.
- Screens 01–08 have fresh light/dark captures; 08 also has active-playback captures. Cold-launch frames come from ordinary screen recordings, with no forced delay.
- Eight alternating saved-theme cold launches pass after the native storage fix.
- Data-preservation verification is recorded in `preservation.json`. Backups remain outside the repository; no test clears application data or resets saved counters. Playback tests finish with Stop, clearing the old failed zero-position bundled playback session.

## Platform limits

Android 16 / API 36, existing arm64 emulator. Android 12+ shows its system-owned centered-icon splash before the full app-owned launch background; ornaments appear in the latter. After upgrading from the old implementation, the OS learns the saved app theme on the first run; subsequent starting windows use it. No artificial splash delay was introduced.

The startup reader is never used after React starts: [Android SQLite and OP-SQLite must not hold concurrent handles on the same WAL](https://www.sqlite.org/howtocorrupt.html#multiple_copies_of_sqlite_linked_into_the_same_application). Final capture testing exposed this hazard in the initial implementation; runtime reads were removed before delivery.

The application-mode API resets to the system configuration for `MODE_NIGHT_AUTO`; this is distinct from system-wide automatic scheduling. See [Android's implementation](https://android.googlesource.com/platform/frameworks/base/+/master/services/core/java/com/android/server/UiModeManagerService.java#959).

Illustrations are native vector reconstructions, not embedded reference screenshots. Existing scripture, source notes, Quran editions/fonts and production content order are preserved. The Ruqya screenshot therefore still reflects the owner's real completed counters and the actual second source item. iOS startup integration and physical-device acceptance remain deferred under the project's platform sequence.
