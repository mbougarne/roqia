# Phase 2 — Foundation and shared services

Implements steps 11–18 of the ordered plan on `phase_2/foundation-shared-services`, starting from merged PR #4 (`9fa3b6d`). The implementation is shared across platforms. This phase is tested on Android; iOS CocoaPods, builds and device acceptance remain deferred as requested.

This is the foundation for the redesign, not the final screen-parity or release approval. Quran and prayer tabs explain their unavailable capabilities. No draft Quran corpus, font or audio catalog is published. The selected Warsh source remains King Fahd text **with its matching King Fahd font**; UI fonts in this change are separate.

## Delivered behavior

- Kit color/type/layout tokens, SVG icons, text/button/card/row/header/sheet/state primitives; compact headings, light/dark/system preferences, Western generated digits and genuine Arabic UI weights.
- 207 explicit devotional IDs. Checked-in historical aliases replace identities derived from Arabic text or list position. Original devotional text, repeat defaults and audio mappings are unchanged.
- Pinned OP-SQLite adapter, serialized transactions, settings/counter/bookmark/download repositories and a hydration barrier. SQLite owns v2 state; AsyncStorage is retained only as migration input.
- Checksummed private backup, atomic migration receipt and recoverable startup/write errors. Counter resets do not touch preferences, bookmarks or downloaded files. Existing reminder times/identifiers are retained; startup no longer requests notification permission or replaces old scheduled reminders.
- Five root tabs in Arabic order, details above the tab shell, buffered cold/warm links and legacy notification aliases, plus explicit invalid-link/missing-pack recovery. Per-container navigation ownership and guarded link subscriptions handle overlapping Android activity recreation; the native screen-restoration factory prevents fragment restoration crashes.
- One TrackPlayer controller for existing devotional audio and verified installed audio. Repeated queues and `audioArray` entries remain available. Navigation does not stop audio; paused controls remain available in tabs and details. Counters are independent of playback.
- Durable download intent, asset/version deduplication, two transfers, three attempts per retry cycle, native network constraints and network-wait/user-pause separation. Files remain private, verified and journaled before whole-pack activation.
- Storage totals from actual bytes; confirmed selected deletion releases active/paused/queued audio first and retains user records. Missing-file and interrupted-install/deletion recovery are implemented.

## Migration evidence and policy

The populated Android emulator was updated in place without uninstall or data clearing. Its 293 legacy keys mapped to 207 permanent counters with zero value mismatches and zero unknown keys. Light theme and both education flags survived. The pre-migration raw input still matches the retained backup; its SHA-256 matches the committed receipt. See [migration report](evidence/migration.json).

When two proven legacy keys identify the same devotional entry, migration retains the smaller remaining count (furthest progress). Every original key/value remains in the immutable backup. Unknown keys are retained there and counted in the receipt; they are never fuzzily assigned to another text. Seven historical text replacements have explicit mappings with Git-diff evidence in [alias provenance](../../../tools/foundation/legacy-map-provenance.json). The rest use exact original fields or unique, byte-identical content/category.

A malformed/oversized input or unavailable storage leaves migration uncommitted and shows retry. Tests inject a failure after partial inserts and verify complete SQLite rollback, successful re-entry and one receipt. The emulator upgrade is a populated **debug installation**, not proof of upgrading the signed Play production artifact; that remains RQ-048.

## Downloads and content gates

The bundled approved catalog is intentionally empty while RQ-019/RQ-047 publication gates remain open. Debug fixtures are isolated from production catalog/repository collections and contain synthetic JSON plus an existing bundled recording. Their test results prove transport/install mechanics, not Quran authenticity or publisher redistribution rights.

The pinned downloader does not expose enough response information to safely guarantee HTTP range append. Therefore an explicit resume or a network interruption restarts the affected partial transfer from byte zero, retaining user intent and network consent. UI copy discloses the restart. Completed unrelated files are retained. Native transfers can be reattached after process recreation; no claim is made that Android force-stopped work runs before reopening.

Pack activation waits for every declared asset. Exact bytes, SHA-256 and file signature/JSON parsing are checked. Source-specific corpus/edition/translation validation remains mandatory when preparing an approved catalog. Journal recovery rechecks final bytes after rename/commit interruption. Older verified versions remain present but inactive until explicitly deleted. A later catalog omitting an already installed version does not disable its verified local bytes; missing files are still reconciled and playback rechecks integrity.

## Native dependencies and assets

- `@op-engineering/op-sqlite` **18.2.5**: native async SQLite, WAL and transactional rollback/reopen tested on Android. [API](https://op-engineering.github.io/op-sqlite/docs/api/).
- `react-native-file-access` **4.0.4**: private files, native hashing, size/free-space checks and same-filesystem moves. [API](https://github.com/alpha0010/react-native-file-access).
- `react-native-svg` **15.16.0**: kit SVG primitives, without screenshot imports.
- `@react-native-community/netinfo` **12.0.1**: connection/cost observation; active HTTP reachability polling and SSID collection are disabled. Native downloader network constraints remain authoritative in the background. [API](https://github.com/react-native-netinfo/react-native-netinfo).
- TrackPlayer **5.0.0-alpha0** and background-downloader **4.6.3** stay at the phase-1 tested pins.

`tools/foundation/fonts.py` instantiates the bundled Noto variable font at weights 400/500/600/700 and names each family explicitly. Each instance retains 1,161 cmap entries and the original OFL notice; Android receives the files and iOS resource registration is prepared. No synthetic bold or Quran font substitution is needed. Font generation uses isolated `fonttools==4.60.1`; it is not an app dependency.

## Validation and remaining acceptance

Validated with Node **24.20.0** (the repository suite uses the built-in `node:sqlite` API), Yarn 1.22.22 and TypeScript 6.0.2. The canonical-content test uses a checked-in hash generated from `9fa3b6d`, so a shallow checkout does not need historical Git objects.

Run `yarn foundation:test`, `yarn feasibility:test`, and `npx tsc --noEmit`. The first suite covers canonical preservation, aliases/clamping, migration rollback/serialization, audio queues and deletion locks, legacy/new link resolution, Western digits, catalog rejection, concurrency, stale callbacks, user pause, integrity failures, journal recovery, network return, low space, missing files and selected deletion.

Android build uses JDK 21 and SDK 36:

```sh
cd android
JAVA_HOME=/Users/mbougarne/.sdkman/candidates/java/current \
ANDROID_HOME=/Users/mbougarne/Library/Android/sdk \
./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a
```

Native probes: start `node tools/foundation/fixture-server.cjs`, reverse emulator port 8083, and launch the debug `ProbeActivity` with `foundation-pause`, restart the process, then `foundation-resume`. Probe code lives in `tools/foundation/androidProbe.ts`; it exercises the production coordinator/native ports with isolated collections. The final run paused a partially downloaded file at 24,416 bytes, preserved `paused_user` across a force-stop/reopen, installed 2,187,962 verified bytes, played then paused the recording, and deleted it with zero remaining queue entries or fixture bytes. Bookmark records compared equal before/after. The ordinary release manifest has no probe activity. With Metro running and the fixture server started in another terminal:

```sh
adb -s emulator-5554 reverse tcp:8081 tcp:8081
adb -s emulator-5554 reverse tcp:8083 tcp:8083
adb -s emulator-5554 shell am force-stop name.roqia.app
adb -s emulator-5554 shell am start -n name.roqia.app/.feasibility.ProbeActivity --es scenario foundation-pause
# Wait for scenario-finished / foundation-paused in the probe UI or event log before continuing.
adb -s emulator-5554 shell am force-stop name.roqia.app
adb -s emulator-5554 shell am start -n name.roqia.app/.feasibility.ProbeActivity --es scenario foundation-resume
adb -s emulator-5554 exec-out run-as name.roqia.app cat files/feasibility/events.jsonl
```

Use event sequence boundaries when collecting results; host and emulator wall clocks need not match.

UI checks: `python3 tools/foundation/android-journeys.py --output /private/tmp/roqia-phase2-ui`. This is opt-in and targets only `emulator-5554`; it restores display size/font scaling and the baseline light preference. Do not run against a personal device. Captures and results are indexed below.

Still required before release: actual Play-artifact upgrade, physical-device/background matrix, complete TalkBack traversal, approved source-specific pack validation/catalog, complete redesigned-screen visual parity and iOS native/build/device verification. Existing repository-wide Jest/ESLint configuration failures from phase 1 are not represented as passing; focused domain tests and TypeScript checks are separate evidence.

## Executed results — 18 October 2026

| Check | Result / evidence |
| --- | --- |
| Android debug build + in-place install | [Pass](evidence/build.txt); JDK 21, Android 16/API 36, `sdk_gphone64_arm64`, density 420; only `emulator-5554` was used |
| Focused foundation suite | [24 tests pass](evidence/foundation-tests.txt); includes actual Node SQLite rollback, source hash invariants, link lifecycle races and installed-content retention across catalog changes |
| Existing feasibility suite | [14 Python + 7 Node tests pass](evidence/feasibility-tests.txt) |
| TypeScript | `npx tsc --noEmit` passes |
| iOS resource syntax only | `plutil` accepts project/plist; this is not an iOS build or runtime result |
| Populated upgrade | [207 counters, backup and receipt](evidence/migration.json); zero value mismatches |
| Native recovery and deletion | [Isolated download/SQLite/audio results](evidence/native-download-recovery.json) |
| Arabic storage units | [Native Western digits and LTR isolates](evidence/storage-format.json) keep values such as `633 MB` in the correct order |
| Android UI journeys | [Route, playback and live display-change checks](evidence/android-journeys.json); normal display scale restored after the run |

The native debug downloader emits its existing `NativeEventEmitter` listener warnings. These did not prevent the probe from completing; they are not represented as a warning-free runtime. UIAutomator briefly reports a null root while Android launches/recreates the activity; the journey waits for the expected accessible screen before asserting.

| Capture | Light | Dark |
| --- | --- | --- |
| More, normal text | [PNG](evidence/more-light.png) | [PNG](evidence/more-dark.png) |
| More, 320 dp / 200% OS text | [PNG](evidence/more-light-320dp-200percent.png) | [PNG](evidence/more-dark-320dp-200percent.png) |
| Paused shared player | — | [PNG](evidence/paused-player-dark.png) |
| Actual storage state | [PNG](evidence/storage-light.png) | — |
| Missing-pack recovery | [PNG](evidence/missing-pack.png) | — |

## Next work

After this PR is reviewed, the next implementation group starts at **step 19 / RQ-006** (launch/onboarding/guidance), followed by the existing-feature redesign tickets. The ordered checklist remains the single sequence; ticket/backlog evidence distinguishes delivered foundation behavior from deferred source, device and release acceptance.
