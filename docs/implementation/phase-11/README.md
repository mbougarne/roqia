# Phase 11 — complete remaining functionality

Owner-approved on 18 October 2026. Branch: `phase_11/functionality-completion`, based on merged Phase 10 (PR #13). This is one 12-ticket delivery batch, followed by Phase 12 visual polish (12 tickets) and Phase 13 Android release readiness (6 tickets plus earlier acceptance gates).

## Scope and starting evidence

| Tickets | Existing delivery | Phase 11 work |
| --- | --- | --- |
| RQ-032, RQ-035 | Shared native player, offline queue, pause/seek/repeat/rate, saved position | Persisted native sleep deadline; background/remote/interruption/restart validation |
| RQ-024, RQ-025 | Original King Fahd Warsh/matching font and Tanzil Hafs, offline reader | Remove API 31-only font inspection dependency with validated older-Android path; preserve exact source bytes |
| RQ-037 | Official Habous tables, named non-Morocco methods, timezone fixtures | Expiry/renewal and seasonal/date validation; no unapproved Morocco formula fallback |
| RQ-038 | Source-backed dashboard and next-prayer rollover | Broader date, unavailable/expired table, and renewal coverage states |
| RQ-039 | True-north correction, smoothing, calibration and no-sensor states | Audit and exercise lifecycle/rotation/accuracy behavior; physical compass acceptance remains distinct |
| RQ-040, RQ-044 | Native full adhan, saved 3-day schedule, boot/time restoration | Background rolling renewal, boot/time/permission recovery and no expired replay |
| RQ-041 | Persisted desired modes and effective fallback | Permission/lifecycle and generation checks with renewal |
| RQ-042 | Verified original Doha normal/Fajr downloads, native preview/Stop | Preview/focus/volume/deletion lifecycle checks; only verified sources remain offered |
| RQ-043 | Methods, offsets, selected-city timezone, format and reset | Date/timezone/offset invalidation and renewal checks |

All 12 remain active until their own evidence supports completion. Physical/OEM testing, qualified source acceptance and deferred iOS verification must not be inferred from builds or an emulator. Visual approval belongs to Phase 12; final release acceptance belongs to Phase 13. No uninstall/data clear, source/font substitution, catalog relabeling, version/signing changes or unrelated refactors.

## Validation record

- **90 automated shared tests passed**, including the new renewal/expiry/calendar, timer adapter and serialized playback/deletion cases; see [tests](evidence/tests.log).
- **Three native/patch checks passed:** complete original corpus/font coverage (Warsh 737012 codepoints, Hafs 714313), deterministic native timer expiry/cancel/replacement/restart/reboot/clock-change logic, and exact-pinned patch round-trip/idempotence/drift rejection; see [native checks](evidence/native-tests.log).
- TypeScript, relevant formatting, Python compilation and diff whitespace checks passed.
- Debug and production-JS review APKs build successfully; app ID/version/signing configuration remain unchanged. The review bundle excludes maintainer tools. See [build](evidence/build.log) and [APK identities](evidence/validation.json).
- Android native probes cover locked-screen sleep expiry, replacement/cancellation, process restart, focus loss without automatic resume, and normal-to-Fajr preview replacement/Stop. Review-build headless renewal passes after [app update](evidence/renewal.json) and [reboot](evidence/reboot.json), with no Roqia Activity resumed. The periodic six-hour job is registered alongside existing reminders; this is not a multi-day/OEM soak test.
- A boot under severe emulator I/O pressure killed the app before its boot receiver completed. The final implementation adds process-start recovery through the same unique renewal job; the isolated reboot rerun passes. The UI harness also needed fresh-hierarchy retries, direct transport polling before the short recording ended, and explicit scrolling before Stop. No failed run is treated as acceptance.

- Normal review-build UI checks pass offline Hafs/French and original Warsh reading, prayer/Qibla, renewal coverage disclosure, background media-key pause/resume, native timer selection/cancellation in both themes, and Stop. See [UI results](evidence/ui-results.json) and [functional captures](SCREENSHOTS.md).

- Populated in-place upgrade preservation passes: **207 counters, one bookmark, three reminders, all 469 existing content files and eight installed packs** retained; content bytes and catalog hashes match. Settings, prayer preferences/sounds and the original playback session are restored; Phase 11 fixture records and timer are cleared. Reading positions may reflect test navigation. See [preservation](evidence/preservation.json). No uninstall/data clear was used.

## Implementation

- **Native playback:** the exact Track Player `5.0.0-alpha0` Android sources are patched with before/after SHA-256 guards. The playback service owns the sleep deadline, persists UTC/elapsed-time/boot identity, uses a monotonic countdown within a boot, and pauses directly on expiry. Local playback uses the native partial wake-lock mode. Stop/deletion cancels the deadline. Focus loss pauses natively and abandons focus; gain never automatically resumes. The normal player offers 15/30/60 minutes and cancellation. iOS explicitly remains unsupported for the new timer.
- **Playback recovery:** session snapshots run on the same command queue as playback/file deletion. Queue replacement is saved immediately; a late progress event cannot resurrect a deleted queue or cleared sleep timer.
- **Quran readers:** `FontCoverage` parses only the hash-verified original font's Unicode cmap (formats 4/12), checks glyph IDs/bounds and rejects missing codepoints. This path does not depend on API 31 classes. API 31+ additionally retains exact shaped-glyph font-file inspection in a separate class. It does not replace text or fonts. Corpus validation is not old-device shaping acceptance.
- **Prayer renewal:** a six-hour periodic job invokes the existing shared planner using RN's headless runtime. Boot, app update, clock/zone and exact-alarm-grant events also enqueue an immediate job. Process startup requests the same unique job, covering a boot receiver lost to an early process kill. No Activity or playback is started by renewal. Before official-source coverage runs out, the selected Habous city is refreshed; offline/source failure still replans the valid cached days and never switches to an unapproved formula. The UI exposes actual covered-until time and OS/force-stop limitations.
- **Scheduler capacity:** WorkManager's default 20 scheduled jobs were filled by existing daily reminders during testing, leaving the periodic renewal unscheduled. Application configuration now allows 50: the app's existing 48-notification budget plus periodic/immediate renewal. No unrelated jobs or notifications are canceled. Implementation follows [Android's custom WorkManager initialization guidance](https://developer.android.com/develop/background-work/background-tasks/persistent/configuration/custom-configuration).
- **Adhan and Qibla:** preview replacement now releases the previous recording and guards asynchronous preparation/focus callbacks by generation. Broadcast restoration runs off the main thread; invalid time-shifted horizons are dropped before replanning. Heading samples reject stale/future timestamps and invalid orientation. Device rotation/true-north behavior retains the established implementation.

## Scope limits

Only the existing Android 16 / API 36 arm64 emulator was available. API 24-30 font validation code compiles and its production parser passes the complete corpora on the JVM, but actual older-device rendering remains unverified. Physical compass accuracy, call/Bluetooth/remote-control behavior, OEM power management, DND/volume and multi-day unattended delivery remain acceptance work. No formula has acquired new religious/source approval, no new Moroccan/Makkah recording is offered, and the owner's deferred manual Arabic reading review stays deferred. iOS build/native/device work is still deferred. Functional screenshots are not Phase 12 visual approval.

## Reproduction

```sh
python3 tools/phase11/patch-player.py
python3 -m unittest discover -s tools/phase11 -p 'test_*.py'
node --test tools/foundation/*.test.cjs tools/phase3/*.test.cjs tools/phase4/*.test.cjs tools/phase5/*.test.cjs tools/phase6/*.test.cjs tools/phase8/*.test.cjs tools/phase9/*.test.cjs tools/phase10/*.test.cjs tools/phase11/*.test.cjs
./node_modules/.bin/tsc --noEmit
cd android
ANDROID_HOME=/Users/mbougarne/Library/Android/sdk JAVA_HOME=/Users/mbougarne/.sdkman/candidates/java/current ./gradlew :app:assembleReview :app:assembleDebug -PreactNativeArchitectures=arm64-v8a
```

The complete-corpus font test requires the previously acquired, ignored `.roqia-feasibility` original Warsh/Hafs sources; it does not fetch or regenerate them. Back up the populated emulator app before running maintainer probes. `android-matrix.py` uses only emulator-5554; its `cleanup` scenario restores the saved playback/prayer records. Install the review build for `android-renewal.py` and `android-ui.py`. UI tests require the existing phase-6 hierarchy helper. Do not run UI automation concurrently with reboot/headless acceptance checks. Local backups, full original corpora and APKs are not committed.
