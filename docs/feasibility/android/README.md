# Android baseline and feasibility

This PR covers steps 01–10 of the ordered implementation plan: RQ-001, RQ-016, RQ-017, RQ-018, RQ-019, RQ-031, RQ-020, RQ-032, RQ-037 and RQ-040. It adds executable source validation and opt-in Android probes. It does not deliver the redesigned product screens or make draft Quran packs available to users.

The Android build, in-place emulator upgrade, resumable downloads, background playback and native alarm path have evidence. Warsh text redistribution evidence, qualified religious/font review, a published content catalog, a validated Morocco method and the physical-device matrix remain gates. These are recorded against the individual tickets rather than counted as completed features.

## Reproduce

See [the maintainer commands](../../../tools/feasibility/README.md). The baseline is commit `9c98e59f7d56754b668fb68a1bc34962477a5816`; evidence was collected on 2026-10-18. The PR commits identify the final implementation. Machine-readable results live in [evidence](evidence/).

## Baseline and compatibility

- App ID `name.roqia.app`; source version `1.0.5`, version code `6`; min SDK 24, target SDK 36.
- React Native 0.84.1, React 19.2.3, Hermes, New Architecture; Track Player remains pinned at 5.0.0-alpha0. The spike adds downloader 4.6.3, MMKV 1.3.16 and Adhan JS 4.4.6. iOS autolinking is disabled for the new downloader; no iOS files were changed.
- Emulator: `emulator-5554`, Android 16/API 36, arm64, 1080 × 2400. No physical-device results are implied. The other connected device was not used.
- The pre-existing emulator installation was `1.0.1` / code `2`, debuggable. It is **not evidence of the current Play production binary**. No Play Console or production signing comparison was performed.
- A fresh baseline Android build passed. The probe build passed after making `newArchEnabled=true` explicit for the downloader's codegen and supplying its documented MMKV runtime. Java 21 and an explicit SDK location were required on this workstation; the default Java 26 failed Gradle configuration.
- Debug builds no longer evaluate a missing private release keystore path. Release signing remains required; there is no fallback to debug signing for release.
- `adb install -r` upgraded the existing installation without uninstalling or clearing storage. All 93 previously stored counter values and the light theme were preserved. Current source adds its fallback entries, resulting in 293 stored counter keys. Legacy IDs contain text/index fragments, so this is not a substitute for the RQ-004/RQ-005 migration.
- Inventory: 38 ruqya records, 56 adhkar, 17 tasbihat, 96 dua; 188 bundled MP3 files, 77,253,742 bytes. All declared audio references resolve. [Content inventory](evidence/content-inventory.json) records hashes and pending devotional provenance review without copying user state.
- The normal onboarding/guidance dialogs opened and the morning-adhkar deep link was checked. Home playback reached the native PLAYING state; its result is recorded in [baseline journeys](evidence/baseline-journeys.json); it is distinct from the successful synthetic native-player probe. Notification delivery and the complete current-screen matrix remain pending.
- Existing routes include Home, Adkar/Morning/Night/BeforeSleep, DuaaDrawer, TasbihatDrawer and AboutDrawer; `roqia://home`, `roqia://adkar/morning`, `roqia://adkar/night`, `roqia://adkar/before-sleep`, `roqia://duaa`, `roqia://tasbihat`, `roqia://about` remain unchanged.
- Existing notification code schedules daily adhkar at 06:00, 18:00 and 22:30 with Notifee. Existing playback is split between Track Player on Home and React Native Video on devotional lists. This PR does not unify those controllers.

### Existing check failures

These failures were recorded before adding the spike and remain separate from its passing checks:

| Check | Baseline result |
| --- | --- |
| `yarn test --runInBand` | Jest cannot parse the vector-icons ESM import; no test executes. |
| `yarn lint` | ESLint 10 expects a flat config; repository provides legacy `.eslintrc`. |
| `yarn tsc --noEmit` | App-test React element type mismatch; `module` lacks a declaration in audioPlaybackService.ts. |

The dedicated feasibility tests exercise source corruption, ordering, hashes, paths, recording identity, calendar boundaries, time zones and invalid prayer results. Their output is in [tests.txt](evidence/tests.txt). Passing them does not make the existing application test suite green.

## Quran sources and publication

### Warsh

The user selected **King Fahd Warsh v2.1 / update 6** on 2026-10-18. Its downloaded archive matches the MD5/SHA-1 on the indexed publisher developer page; direct publisher requests timed out, so transport used a documented unofficial mirror. The independent source lock pins SHA-256. JSON and CSV agree on all 114 surahs / 6,214 ordered verse records.

The matching font covers all 351 source codepoints and shaped all 6,214 verses on Android API 36 with zero fallback/missing glyphs. AL Maghribi lacks 201 codepoints and visibly renders verse ornaments as unrelated letter-like forms, with fallback in every verse. Use the matching source font; preserve canonical characters and separate Western UI locators.

[Full source, terms, font decision and screenshots](WARSH.md). The embedded font EULA grants use/copy/distribution subject to its restrictions and is retained. Explicit primary evidence covering redistribution of our derived text pack is still unresolved; qualified review, older/physical Android coverage and production pack/catalog integration also remain. Local fixtures are not a ready distributable pack. This supersedes the earlier Al-Mohammadi acquisition blocker without bypassing publication gates.

### Hafs

The importer acquired Tanzil Uthmani 1.1 and source metadata 1.0. The independent [source lock](../../../tools/feasibility/sources.lock.json) pins exact HTTPS URLs, byte sizes and SHA-256 hashes. It validates all 114 surahs and 6,236 source verses and round-trips canonical verse strings exactly. It never normalizes Unicode, rewrites Quran digits or splits basmala text.

The local pack has 114 chapter JSON files, original text, metadata and notice: 117 hashed assets plus a draft manifest. Each chapter carries edition, numbering scheme and the source notice. Validation rechecks the independent source lock and compares chapters back to the source, even if someone edits both a chapter and its manifest hash. [Mechanical report](evidence/hafs-validation.json).

The corpus and generated packs stay in the ignored local cache. A maintainer can reproduce them from the lock. Representative Arabic/font rendering and qualified religious review remain pending; no ready pack is published. [Tanzil download](https://tanzil.net/download/), [metadata](https://tanzil.net/docs/Quran_Metadata), [text license](https://tanzil.net/docs/Text_License).

### Review and static catalog

`content.py catalog` exports catalog JSON only after file validation and an explicit review bound to the exact manifest hash. The [review template](../../../tools/feasibility/review.template.json) starts with every approval false. Mechanical checks cannot fill religious or rendering approvals. The catalog schema now permits the original text, metadata XML and attribution notice as assets.

The command does not upload anything. A real immutable HTTPS host, all-file host verification, a bundled last-good seed and the mobile offline catalog repository remain unfinished RQ-019 work. Do not change an installed pack in place: create a new version, review its diff against its independent source lock, publish immutable artifacts, then change the catalog pointer. Retain attribution, older versions and correction evidence. A withdrawal should stop new installs while preserving a readable installed copy until a verified replacement is available.

Existing devotional provenance is explicitly pending in the inventory. No new religious text or claims have been inserted into the product.

## Audio catalog and downloads

The MP3Quran adapter uses explicit provider `rewaya_id`, reciter ID and recording-set ID. It does not infer riwaya from a display name. The draft initially contains `mp3quran.118.120` (Hussary, Warsh) and `mp3quran.1.1` (Ibrahim Al Akdar, Hafs). Generic Warsh metadata does not prove a specific tariq: that field stays null. Quality alternatives and verse timing are unavailable, not invented. [Provider API](https://www.mp3quran.net/ar/api).

Each provider declares 114 surahs. Only 001, 112 and 114 from each set were fetched, hashed and inspected with ffprobe. The remaining files are explicitly `pending`; declaration is not proof of availability. Listening/recitation review remains pending. See [audio inventory](evidence/audio-inventory.json). The native Android downloader also fetched and verified the pinned Warsh 001 sample directly from the provider over HTTPS.

### Native transfer results

Downloader 4.6.3 builds on RN 0.84.1 with the explicit architecture flag and MMKV runtime. Files are stored in app-private storage. The debug adapter hashes off the RN module thread and renames only a verified `.part` to `.ready` on the same filesystem.

| Case | API 36 emulator observation |
| --- | --- |
| Pause, resume, correct 206 | Complete 8 MiB hash matches; verified file installed. |
| Server returns 200 after Range | Transfer restarts; complete hash matches. |
| Entity changes | Fixture changes ETag/body, returns 200; old pinned hash rejects the result. |
| Wrong start in 206 | Hash rejects the malformed appended result; no installed file. |
| 416 | Native error 416; no installed file. |
| Missing Content-Length | Transfer completes; final bytes/hash determine success. |
| Process loss | Paused job survives app-only SIGKILL, reattaches as PAUSED and resumes to the correct hash. |
| Network restriction | With emulator Wi-Fi disabled, no transfer begin; enabling Wi-Fi allows verified completion. |
| Actual provider HTTPS | 473,723-byte Warsh sample matches the maintainer's pinned hash. |

[Transfer evidence](evidence/downloads.json), [network evidence](evidence/wifi.json).

The library is a candidate transport, not the RQ-021 production coordinator. It does not itself provide the required trusted content-hash decision or strict Content-Range start validation. The spike deliberately proves that final hash verification prevents corrupted files from becoming installed. Production must persist immutable expected hashes/entity validators, validate range responses, reconcile byte counts with files, handle capacity and deletion, fsync writes, and commit pack installation atomically. Do not trust transport `done` as install success.

`allowsCellularAccess=false` is an **unmetered-network** constraint in this library, not a universal Wi-Fi-only promise. Strict Wi-Fi policy needs a transport-type check in RQ-021. Active-transfer process death, OS retry scheduling, storage exhaustion, power-loss durability and real OEM behavior need broader coverage. User force-stop suspends app work until the user reopens it; do not promise automatic recovery while force-stopped.

## Player feasibility

Track Player 5.0.0-alpha0 ran a local synthetic WAV queue with two stable track IDs, repeat-track, speed 1.25, seek to 2 seconds, play and pause. Playback remained native while the activity was backgrounded and the screen locked. Android media-session pause/play commands produced the corresponding state events. [Player evidence](evidence/audio.json).

The debug scenario's 24-second JavaScript wait is an observation window, **not a sleep timer implementation**. Its completion waited for the activity to return. A persisted native sleep deadline is still required. The existing playback service handles play/pause/stop but not RemoteSeek; setting SeekTo capability in the probe does not prove remote seeking. Calls, Bluetooth, focus interruption/resume, active playback process death and physical devices remain unverified. RQ-033 must unify the two existing player paths only after these capability decisions are resolved.

## Prayer engine and time zones

Adhan JS 4.4.6 has no named Morocco preset. The research adapter explicitly marks 19° Fajr / 17° Isha as an **unapproved hypothesis** and rejects it unless research mode is requested. It validates civil dates, coordinates, zones and minute offsets; retains UTC instants; applies user offsets once; excludes sunrise from “next prayer”; and returns unavailable for unresolved polar results.

The comparison includes 12 samples across Rabat, Casablanca and Marrakech on October 13/18/28 and November 10, 2026. With Node's tzdb 2026c, candidate-minus-printed differences across the six events range from -6 to +5 minutes. This is insufficient to approve a method or add arbitrary offsets. Other seasons, authoritative parameters, exact reference locations and a reviewed residual tolerance remain required. [Comparison](evidence/prayer-comparison.json), [official timetable](https://www.habous.gov.ma/prieres/), [Adhan methods](https://github.com/batoulapps/adhan-js/blob/develop/METHODS.md).

IANA tzdb 2026c records Morocco's move to UTC on September 20, 2026. The desktop's Node 24.20.0 / ICU 78.3 / tzdb 2026c follows it, but this Android 16 emulator's Intl still returns 13:00 for 12:00Z in October. [IANA release notes](https://data.iana.org/time-zones/tzdb-2026c/NEWS), [Android mismatch evidence](evidence/timezone.json).

The research adapter now rejects stale Morocco time-zone rules. Before RQ-037 can close, choose and pin a reviewed offline time-zone data strategy for Android runtimes with stale ICU, and verify it in Hermes. Do not fix this by hardcoding UTC+1, subtracting an unexplained hour, or assuming the phone's displayed clock proves its IANA database is current. Tests cover the historical Ramadan transition and the September 2026 change separately.

## Native alarm feasibility

The debug-only path is persisted alarm → AlarmManager exact-and-allow-while-idle → receiver → permitted foreground media service. It plays an 8-second synthetic tone, with a native audio-focus request and notification Stop action. It does not depend on JavaScript running at delivery. Boot handling only reconciles a future stored alarm; it never starts playback from BOOT_COMPLETED.

With exact-alarm access denied, scheduling rejected explicitly. After temporarily allowing access, a locked API 36 emulator in forced deep idle delivered the alarm 791 ms after its target; the service started, played to completion and stopped. [Alarm evidence](evidence/alarm.json). The emulator's original exact-alarm setting, Wi-Fi and idle state were restored.

This proves the native service entry path, not full-adhan production reliability. Stop-action tapping, notification/channel denial, call interruption, reboot reconciliation, force-stop/reopen, multi-minute recordings and physical Android 12–16/OEM behavior remain unverified. Android can throttle allow-while-idle alarms; tests must record actual target/delivery times. The future UI must distinguish exact-alarm access, notification visibility and enabled sound; denied capabilities must not show a successful full-adhan state. [Android alarm guidance](https://developer.android.com/develop/background-work/services/alarms), [foreground-service restrictions](https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start).

## Release isolation and next work

The production JavaScript bundle contains no probe registration, lab UI or fixture marker. The merged release manifest contains no probe activity, receiver or service. `SCHEDULE_EXACT_ALARM` still appears from the pre-existing Notifee dependency; the spike did not eliminate that existing permission. The downloader adds data-sync/user-initiated-job services and permissions through autolinking, even though the lab UI is debug-only; review them before a Play release. No signed release or Play upload was produced.

Keep the current source and native gates open where evidence is missing. Independent existing-feature design work can proceed with RQ-002, but Quran publication, prayer alarms and player UI must not bypass their gates. Each of the first 10 tickets links here and records its remaining completion work. This PR is reviewable as an Android feasibility foundation, not as approval to release all proposed functionality.
