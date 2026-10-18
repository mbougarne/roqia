# Phase 4 — Quran reading and listening

> Subsequent delivery: [phase 5](../phase-5/README.md) replaces the empty normal catalog with downloads of pinned original sources and on-device preparation. Earlier derived-corpus hosting restrictions remain specific to that hosting approach; further manual Arabic review is owner-deferred.

Branch `phase_4/quran-reading-listening`, based on merged phase 3 (`50f8497`). Implements the source-gated runtime for ordered steps 28–37: RQ-023–RQ-030, RQ-034 and RQ-035. Shared React Native screens; Android device validation now, iOS native adapter/build validation deferred.

## What changes

- Quran library with offline surah metadata, Warsh/Hafs preference, explicit download action, independent resume positions and bookmarks. Selecting a preference never enqueues or deletes files. Existing devotional content remains available with no Quran pack.
- Edition-aware reader verifies installed membership, file size/hash, chapter structure and matching font before showing text. The Warsh edition is independently bound to the locked King Fahd font SHA-256; glyph coverage alone cannot establish correct ornament semantics. Android verifies/registers the unmodified private font and rejects glyph fallback. Canonical strings, basmala placement and Warsh ornaments remain exactly as supplied; Western UI locators are separate.
- French/English translation selection names actual acquired sources and binds exact Hafs edition, numbering and text version. Translation errors leave the Arabic reader usable. Warsh translations fail closed until reviewed correspondence exists.
- Independent scripture size, line spacing, verses/continuous presentation and scoped keep-awake. Screen wakefulness is released on navigation away, background and Activity destruction. It is not an app-wide permanent wake lock.
- Local surah/verse search, bounded results and memory, cancellation, recent-query clearing, untouched canonical results with the verified font, edition/version-aware bookmarks and source/report actions. Variable-height long chapters start at the exact requested verse rather than an estimated pixel offset; an explicit previous-verses action exposes earlier content. Reporting opens a user-controlled draft; no mail is sent automatically.
- Riwaya-filtered recordings, actual quality labels, partial recording disclosure, chapter selection and actual byte totals. Each audio chapter is an independent installed pack. Repeated requests use the existing deduplicating coordinator. Preview/playback uses verified local files; no selection-triggered streaming or downloads.
- Offline audio library and shared full player: real position/duration, seek, repeat, speed, queue and explicit paused restoration of a saved downloaded session. No ayah timing/highlight is fabricated.
- Full-size testing exposed expensive download metadata writes. The existing serialized transaction now compares rows and writes only changes, preserving atomic snapshot semantics and rollback. A 460-job regression test verifies one-row progress updates and multi-collection rollback.

## Owner review decision

[Manual Arabic reading review is deferred by the owner](REVIEW-DECISION.md). It is not a further prerequisite for download delivery. Earlier review-gate wording below is superseded by that decision; automated integrity/font checks and concrete packaging/publication work remain. This documentation update does not enable downloads.

## Source/publication boundary

[Source recheck and handoff](SOURCES.md) records exact artifacts and remaining approval. The production Quran catalog stays empty. No Quran corpus, translation, new Quran font or recording is bundled/published by this PR. Android fixtures come from the locked originals and are injected only through the debug Activity; fixture approval flags exercise transport, not content certification.

Consequently, the normal app exposes metadata, edition selection and honest unavailable states until RQ-016–RQ-019/RQ-026/RQ-031/RQ-047 are closed for the exact files. The runtime implementation is not represented as a released/approved Quran feature. Ticket status retains those dependencies.

The private font adapter currently requires **Android 12 / API 31+** for per-glyph fallback inspection. Older Android versions show an explicit unavailable reader state; devotional features remain usable. iOS has no validated dynamic-font adapter yet and similarly fails closed. Extending coverage requires source-to-render evidence; a system font fallback is not an acceptable workaround.

The installed Track Player version has no proven native sleep-deadline API. The full player explains that sleep timer is unavailable; no background JavaScript timeout is offered. Native sleep timer, physical-device audio focus/remote controls and iOS acceptance remain RQ-032/RQ-035/RQ-048 gates.

## Reproduce

```sh
npx tsc --noEmit
yarn foundation:test
yarn phase3:test
yarn phase4:test
yarn feasibility:test
JAVA_HOME=/path/to/jdk21 ANDROID_HOME=/path/to/sdk ./android/gradlew -p android :app:assembleDebug -PreactNativeArchitectures=arm64-v8a
```

Private fixture preparation (maintainer only): `python3 tools/phase4/acquire-translations.py --out <private-folder>` acquires exact pinned translation bytes. Acquire the files pinned in `tools/feasibility/sources.lock.json` and `tools/phase4/translations.lock.json`, then run `python3 tools/phase4/prepare.py --translations <private-folder> --out <new-private-folder>`. It preserves canonical strings and source notices, checks original hashes and all edition-specific verse sequences, and rejects an existing output directory. It never exports a production catalog. Serve the output on localhost port 8083 and reverse that port only for the test emulator.

Back up the emulator's DB/files/preferences before installing in place. `phase4-install` downloads the complete private fixtures; `phase4-check` exercises source/font/translation loading; `phase4-ui` runs actual screens with the private catalog. They are dispatched only by the debug `ProbeActivity`. `tools/phase4/android-journeys.py` targets only `emulator-5554`. Restore original DB and remove test-owned pack/files/cache after collecting evidence. Do not edit runtime JS while UI journeys run. An offline debug journey loads Metro first; it is not proof of a signed release install.

## Android verification — 18 October 2026

Validation used only `emulator-5554` (Android 16 / API 36, arm64-v8a); the attached physical device was not touched. The debug APK was built and installed in place. TypeScript, 48 focused foundation/phase-3/phase-4 Node tests and 21 feasibility tests pass (69 cases total). The production JavaScript bundle builds and excludes the private fixture entry points and localhost catalog. This is not signed-release or physical-device acceptance. See [validation summary](evidence/validation.json), [focused tests](evidence/tests.log) and [feasibility tests](evidence/feasibility.log).

The native coordinator installed **10 private packs / 464 assets**. [Full native integrity results](evidence/phase4-full-integrity.json) cover all 114 chapters in each edition (6,214 Warsh / 6,236 Hafs records), the exact matching Warsh font, both 6,236-record translations, missing-font/corrupted-text rejection, canonical search output and preference selection without downloading/deleting. The [deterministic source export](evidence/source-validation.json) preserves the locked original strings. The wrong-font test exposed why glyph coverage alone was insufficient; the final runtime also enforces the immutable edition/font hash binding.

Android journeys cover both themes, independent edition bookmarks across restart, exact long-surah navigation to 2:253, French/English selection, unsent report drafts, reader preferences, native keep-awake release on background/navigation, local audio seek/rate/repeat and explicit paused session restoration. Both readers were also captured at 320 dp width and 200% system text. These checks do not replace full TalkBack traversal or qualified scripture review. UI automation retried transient Android UI-tree failures and dismissed existing debug warning banners; a warning-free runtime is not claimed.

Final playback review added a regression check for failed restoration: corrupted audio must leave the current queue, saved session and playback settings unchanged. Both the expected failure before the fix and the passing regression were observed; the final test log contains the passing result.

[Individual Android screenshots and journey results](SCREENSHOTS.md) show actual runtime states. `fixture-1` labels belong only to private test packs. [Data preservation](evidence/preservation.json) records restoration of the original emulator database and all 207 counter rows, including their original values, plus removal of test-owned packs. No user database, source corpus, font or audio binary is committed as evidence.

## Acceptance status

Further manual Arabic reading review is deferred under the owner decision above. Translation/listening review, redistribution evidence, public immutable hosting, full TalkBack traversal, final visual review, signed upgrade and physical-device lifecycle acceptance remain open. RQ-035 additionally retains the native sleep timer. Existing repository-wide Jest/ESLint baseline issues are not reported as passing. Android evidence does not imply iOS readiness.
