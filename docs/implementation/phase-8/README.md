# Phase 8 — Quran audio downloads and Android adhan

Branch: `phase_8/audio-delivery`. Base: merged phase 7, `a05d1de`. The authorized order is now **functionality → complete visual parity → final acceptance/release → deferred iOS validation**. Prayer/Qibla are explicitly not visually approved. The authoritative pickup queue is [IMPLEMENTATION-ORDER.md](../../../design/roqia-v2/implementation/IMPLEMENTATION-ORDER.md).

## Delivered

- Normal app catalog offers **114 Warsh surahs by Mahmoud Khalil Al-Hussary and 114 Hafs surahs by Ibrahim Al-Akdar**, via MP3Quran's publisher-permitted direct downloads. Riwaya remains explicit; no text/font or verse numbering changes. [Sources and rights](SOURCES.md).
- Existing selective/all-chapter downloads now have real production files, pinned sizes/hashes and readable titles in downloads/storage. No recordings are bundled into the APK; each surah is independently installed and usable offline. Whole-surah listening does not imply verse synchronization.
- Normal and Fajr adhan downloads, separate persistent selection, offline preview, source/rights links, immediate Stop and an explicit 10-second device test. Originals are preserved exactly; no fabricated muezzin, geographic label, edited Fajr phrase or backend.
- Android full mode uses persisted UTC exact alarms, a non-exported receiver and a media foreground service. The service verifies app-private file size/hash, requests audio focus after entering foreground, shows Stop, respects alarm volume/DND, and stops on focus loss/completion. Quran pauses on interruption and is not automatically resumed.
- Desired prayer modes remain independent of effective delivery. Missing selection/file, denied exact-alarm access or blocked notification permission/channel results in an explicit fallback count. Full events are excluded from the normal Notifee schedule; pre-reminders stay notifications. File deletion stops a matching active adhan and removes its alarms. Boot/package/time changes only restore future events, never play immediately; stale events are not replayed.
- A test alarm survives normal prayer reconciliation; Stop cancels the test without switching saved prayer modes. The Android exercise caught and corrected the original cancellation race.

## Testing and reproduction

Android 16 / API 36, arm64, `emulator-5554`, normal review APK installed in place. App ID `name.roqia.app`, version `1.0.5` / code `6` unchanged. No app data clear or uninstall.

- TypeScript: `./node_modules/.bin/tsc --noEmit`.
- **66 tests passed** across foundation, phases 3–6 and phase 8. Added catalog coverage/source-integrity and full-adhan scheduling tests: correct Fajr binding, independent notification-channel denial, missing file, exact permission denial, fallback recovery, no duplicate delivery and preserving a live test alarm during routine reconciliation and restoring OS alarms after force-stop even when desired IDs are unchanged.
- Android: `ANDROID_HOME=/Users/mbougarne/Library/Android/sdk JAVA_HOME=/Users/mbougarne/.sdkman/candidates/java/current ./gradlew :app:assembleReview -PreactNativeArchitectures=arm64-v8a` from `android/`.
- Real UI downloads: Al-Fatiha from each riwaya plus both adhan files. Offline cold-start playback verified through Android media state; full adhan previews and notification Stop exercised. Native exact alarm starts a real downloaded adhan while screen locked and forced Doze; active Quran pauses. This is emulator evidence, not a physical speaker/phone-call/OEM matrix.
- Final APK checks also passed: force-stop removed 2 native alarms and reopening restored both with unchanged preferences, exact-alarm denial/recovery, a modified adhan rejected before playback, restored-original playback and in-app Stop. All four downloaded phone files match the published hashes. **207 counter rows, 1 bookmark, 2 reading positions, reader/prayer preferences and reminders remain unchanged; all 235 existing Quran files are byte-identical.** Original dark theme and exact-alarm app-op default restored; the four new audio downloads remain available for user review.
- All 230 offered originals acquired and checked for MP3 metadata, duration, size and SHA-256. Full recordings were verified on the development machine; the emulator did **not** download or play all 228 surahs. [Verification inventory](audio-verification.json).
- Reproducible UI helpers: `tools/phase8/android-audio.py --output /private/tmp/roqia-phase8/ui --section download|playback|final-checks|capture|restart`. Requires the existing phase 6 hierarchy helper. Back up app data first; tests temporarily change network/permissions/theme and modify then restore one downloaded adhan to test rejection. Run sections sequentially. Device evidence and captures are in [evidence](evidence/).

## Remaining work and honest limits

The alarm window remains **up to 3 days**, refreshed on app open/resume. Persisted boot restoration does not calculate another window or refresh an expired official timetable. Force-stop, exact-permission revocation and OEM battery restrictions require reopening/reconciliation. Unattended renewal and Android physical-device/API matrix remain RQ-040/RQ-044/RQ-048. iOS playback integration/testing is deferred; shared downloads/preferences remain shared.

Next functional ticket is **RQ-026: real English/French Hafs translation delivery**, then the remaining download recovery, sleep timer, older-Android reader and prayer lifecycle queue in the plan. Source listening/editorial acceptance is distinct from decoder/hash checks. No exhaustive religious listening review, official Morocco calculation validation, signed Play release, or screenshot parity is claimed. The source attribution is visible so the user can review the actual recordings now.

## Captures

Each file is one screen, using Western digits; these are functional evidence, not final screenshot-parity approval.

| Screen | Light | Dark |
| --- | --- | --- |
| Quran audio | [PNG](evidence/quran-audio-light.png) | [PNG](evidence/quran-audio-dark.png) |
| Offline audio library | [PNG](evidence/quran-offline-light.png) | [PNG](evidence/quran-offline-dark.png) |
| Adhan sounds | [PNG](evidence/adhan-sounds-light.png) | [PNG](evidence/adhan-sounds-dark.png) |

[Offline Quran player](evidence/quran-player-offline-light.png), [Hafs player](evidence/hafs-player-offline-light.png), [normal adhan notification](evidence/adhan-notification-normal.png), [Fajr notification](evidence/adhan-notification-fajr.png), [corrupt file rejection](evidence/adhan-corrupt-rejected.png).
