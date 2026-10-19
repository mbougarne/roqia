# Reader and prayer follow-up

Owner review, 2026-10-19. Continues the bundled-Quran work on the same review branch.

## Changes

- Remove publisher/source prose from the reader header/footer and the repeated source-information action from every verse. Keep the full notices and report action on **معلومات المصحف**, reached from the Mushaf/download screen.
- Continuous mode flows complete, unchanged Arabic verse strings inline with their end markers. A follow-up replaces bounded paragraphs with one right-aligned native text flow for the complete remaining surah, removing artificial paragraph gaps. Verse mode retains separate cards. With translation enabled, complete translated passages follow their Arabic paragraph; translations are not interleaved into the Arabic line.
- Tapping an inline verse opens a floating icon toolbar above the tap, clamped to the screen, with copy, bookmark/remove, and a disabled listening placeholder. Verse cards show the same actions directly. No per-verse listening behavior is implemented.
- The shared scrollable page avoids the keyboard, including the Quran chapter search.
- GPS selection saves directly, displays its saved status when revisited, and attempts Android city-name lookup with a four-second bound. Failure to resolve a name does not discard a valid fix. Existing coordinates remain available as manual input.
- GPS/manual coordinates cannot use a city-only Habous table. When saving such a location from Habous mode, the app explicitly explains and selects Muslim World League calculation. Existing explicitly selected calculation methods are retained. Device timezone is validated rather than silently mapped to another zone.
- Add Béni Mellal, Arabic/Latin search, and its official timetable. The current timetable city ID is **73** (the older widget uses a different ID). The captured official HTML verifies the selected city name. Coordinates are attributed to GeoNames in `city-source.json`.
- Qibla freshness compares sensor timestamps with the current clock. Previously, a 100 ms sensor update could be newer than the one-second screen clock and therefore incorrectly rejected as a future reading. Low-accuracy/stale readings still show calibration/static guidance.

## Validation

111 Node regression tests pass; TypeScript and changed-file formatting pass. Tests cover unchanged verse ordering/text, single continuous surah flow and scroll-to-verse boundaries, separate verse rows, live/stale/unreliable compass readings, GPS calculation compatibility, Béni Mellal search, official table identity and 360 official timetable days.

Physical-device evidence is recorded after the in-place review installation. Personal GPS coordinates and app-private backups are not committed. iOS is not device-verified.

## Physical Android results

The review APK was installed in place on Samsung SM_A566B. All 17 existing database records were byte-for-byte unchanged immediately after installation, before test interactions. The screenshots and `verification.json` record the checked flows. GPS city naming, direct save and revisit state passed. Calculated times remained available after restart; manually selecting Béni Mellal and Habous displayed the official table. Live Qibla readings were accepted with both location sources. This verifies live sensor operation, not independently measured compass accuracy.

Both verse cards and continuous paragraphs were inspected. Inline verse taps and bookmark add/remove passed. Surah search now collapses the introductory cards while focused/filtering and keeps the input plus result above the keyboard. No audio-listening action was added. Precise GPS coordinates, UI dumps containing coordinate fields and app-private backups remain local.

## Second reader review

City search collapses introductory location controls while focused or filtered. Qibla enters alignment within 5 degrees and leaves beyond 8 degrees, changes compass color, displays explicit alignment text, and emits a 60 ms vibration on entry with a two-second cooldown. Stale or unreliable sensor readings cannot trigger alignment. Thresholds are UI feedback, not an independent accuracy guarantee.

TypeScript, 111 regression tests, whitespace checks, and the Android arm64 review build pass. Per-verse audio remains a disabled placeholder.

Follow-up device check: installed in place on the same Samsung phone. All 21 existing records remain present; 20 are byte-for-byte unchanged, with only the prayer reminder renewal record updated before QA. Inspected right-aligned Fatiha, floating toolbar and copy action, visible verse-card actions, Baqarah scrolling beyond the former paragraph boundary, and Béni Mellal results above the open keyboard. Restored the user's verse-card preference after testing. No saved location or bookmarks were changed. Alignment thresholds are regression-tested; physical alignment/vibration still needs a hands-on check. Screenshots are in `followup/`.
