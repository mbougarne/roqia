# Phase 6 — prayer, Qibla and notification preferences

Branch: `phase_6/prayer-qibla-adhan`, based on merged phase 5 (`0389567`). Scope: ordered steps 38–44, shared React Native screens with Android native location/heading adapters. iOS device acceptance remains deferred. This is a review build, not a Play release.

## What is implemented

- Prayer tab: explicit city selection, six daily times, next prayer/countdown including tomorrow, informational sunrise, source/expiry, and effective notification state.
- Eleven offline Moroccan city choices, manual coordinates/IANA zone, contextual one-shot foreground GPS, accuracy/freshness checks and timeout. Travel never silently changes the selected location. No background location permission or tracking.
- Official Habous city/date snapshots, with explicit direct HTTPS refresh and last-good cache retention. No backend, account, paid API, or silent fallback to an invented Morocco method.
- Explicit Adhan 4.4.6 calculation choices, Asr/high-latitude options, bounded adjustments applied once, 12/24-hour Western numerals, and confirmed reset.
- Qibla bearing, true-north Android rotation-vector heading with declination/display-rotation correction, circular smoothing, low/stale/no-sensor fallback and calibration guidance. Sensors stop off-screen/background.
- Five per-prayer desired modes and pre-prayer reminders. Full mode visibly uses notification-only fallback. Sunrise has no notification toggle. Fresh installs start with all prayers off.
- Notification permission/channel state, immediate test notification, deterministic revision IDs, serialized reconciliation and recovery after partial failure. A three-civil-day window caps prayer triggers at 27 and total counted triggers at 48, reserving 21 slots for the existing daily reminders.
- Reconciliation on launch/resume, selected civil-date rollover, clock/zone/date broadcasts while the process is alive, preference/source changes and explicit retry. Coverage horizon is shown. Reconciliation cancels only this feature's triggers.

## Sources and reproducibility

### Moroccan timetable

The default is a finite **published city timetable**, not the unvalidated 19°/17° research formula. [Habous official city page](https://www.habous.gov.ma/prieres/index.php?ville=58) publishes six local administrative-clock times per day. The ministry describes its widget as using [Moroccan administrative time](https://habous.gov.ma/مراقبة-الأهلة/5237-تطبيق-مواقيت-الصلاة-حسب-التوقيت-الاداري-المغربي-خاص-بالمواقع-الالكترونية-والمدونات.html). Rows are interpreted in `Africa/Casablanca` using the pinned rules below; no fixed UTC+1 is added.

Retrieved 2026-10-18: 11 cities × 30 days, **2026-10-13 through 2026-11-11**. [Source URLs and SHA-256 hashes](evidence/habous-sources.json) identify the exact independently downloaded HTML. All 330 rows were compared to the packaged data. Only dated numerical facts are packaged, with ministry attribution; the ministry website, logo, scripts and page layout are not republished.

Android initially rejected the ministry server because it sent only its leaf certificate. The native, host-specific transport supplies the missing Sectigo DV R36 intermediate from the leaf's declared issuer URL as an **untrusted chain candidate**. It delegates validation to Android's system trust manager, preserves the default hostname verifier, rejects redirects, bounds the body and applies network timeouts. It adds no trust anchor, global networking override, certificate-accept-all callback or cleartext timetable fallback. [Certificate provenance](evidence/tls-source.json); Android's [missing intermediate explanation](https://developer.android.com/privacy-and-security/security-ssl). A damaged leaf signature was rejected by this same adapter. Future issuer changes can require a bundled intermediate update; failure preserves the offline table.

The parser checks the selected city, known Gregorian month header, real consecutive dates, row count and six strictly ordered times. Malformed first/last/interior rows fail the whole import. A refresh must include today before replacing the saved table. Server failures, changed markup, wrong city and stale tables retain the previous data. Expired data produces an explicit refresh/method-choice state; there is no extrapolation or automatic method switch. This public HTML endpoint is not a contracted API; parser maintenance and source availability remain operational limitations.

```sh
python3 tools/phase6/acquire-timetables.py /private/tmp/roqia-phase6/habous
node tools/phase6/verify-sources.cjs /private/tmp/roqia-phase6/habous
```

Verification uses the recorded hashes. A later ministry update will intentionally not match the 2026-10-18 snapshot; inspect a new acquisition and regenerate the package/locks together using `package-timetables.cjs`, updating its retrieval date. Do not relabel old data as newly acquired.

### City coordinates, time zones and Qibla

Coordinates are a small named subset of [GeoNames' Morocco city table](https://www.geonames.org/MA/largest-cities-in-morocco.html), WGS84, with Arabic display labels and Habous city-ID mapping added by Roqia. GeoNames is credited in the app and distributes its data under [CC BY 4.0](https://www.geonames.org/about.html). This is not a worldwide geocoder; other places require explicit coordinates and zone.

[IANA tzdata 2026c](https://data.iana.org/time-zones/tzdb-2026c/NEWS) is pinned by archive SHA-256. `build-timezones.py` compiles its 597 zones into UTC-offset transitions for **2024-01-01 inclusive through 2031-01-01 exclusive**. The original license is in `src/features/prayer/TZDATA-LICENSE.txt`. [Build metadata](evidence/timezone-build.json) records the source digest and Casablanca transitions. The app does not depend on stale Android ICU for prayer formatting or local-time conversion. Out-of-range, missing-zone, gap and ambiguous timetable instants fail closed. Future legislative changes require a reviewed bundled-data update.

```sh
python3 tools/phase6/build-timezones.py /path/to/tzdata2026c.tar.gz
```

Qibla uses Adhan's [Kaaba coordinates and great-circle implementation](https://github.com/batoulapps/adhan-js/blob/develop/src/Qibla.ts), `21.4225241, 39.8261818`, from installed version 4.4.6. The Android adapter uses the [normal rotation vector](https://developer.android.com/develop/sensors-and-location/sensors/sensors_position), remaps display axes and adds east-positive geomagnetic declination exactly once. A result at the Kaaba itself is unavailable, not a fabricated bearing. The emulator cannot establish physical compass accuracy.

## Android validation

Verified on Android 16 / API 36, arm64 emulator, using an in-place standalone review APK with no Metro:

- 64 foundation/feature tests passed, plus 14 Python and 7 JavaScript feasibility checks. TypeScript passed. The final privacy/transport changes also passed the 15 affected phase 3/phase 6 checks.
- Normal light/dark navigation, explicit HTTPS refresh, offline cold start, calculation changes/reset, notification opt-in/test delivery/restart and GPS denial/grant/save passed. This proves immediate test-notification delivery, **not** the pending scheduled-delivery/Doze/boot device matrix.
- Android sensor diagnostics confirm the rotation-vector listener was removed on leaving Qibla; location diagnostics confirm updates stopped after the one-shot fix. [Native lifecycle evidence](evidence/native-lifecycle.json).
- All **207 counter rows** and **235 Quran content files** were preserved exactly. Existing bookmark, Quran positions, download records and user preference values were retained; only the settings timestamp and reminder runtime signature changed. The actual refreshed ministry table was found in the local database. [Data comparison](evidence/data-preservation.json).
- New prayer preferences were left on Casablanca / official timetable / 24 hours / zero adjustments / all notifications off. Emulator connectivity was restored. No app uninstall, data clear or physical-device operation was used.

| Screen | Light | Dark |
| --- | --- | --- |
| Prayer | [PNG](screenshots/prayer-light.png) | [PNG](screenshots/prayer-dark.png) |
| Qibla | [PNG](screenshots/qibla-light.png) | [PNG](screenshots/qibla-dark.png) |
| Calibration | [PNG](screenshots/calibration-light.png) | [PNG](screenshots/calibration-dark.png) |
| Calculation | [PNG](screenshots/calculation-light.png) | [PNG](screenshots/calculation-dark.png) |
| Adhan preferences | [PNG](screenshots/adhan-light.png) | [PNG](screenshots/adhan-dark.png) |
| Sounds unavailable | [PNG](screenshots/sounds-light.png) | [PNG](screenshots/sounds-dark.png) |
| Sources | [PNG](screenshots/sources-light.png) | [PNG](screenshots/sources-dark.png) |

Additional individual images cover location permission/denial/fix, saved notification state, delivered test notification, offline reopening and updated privacy text. See `evidence/` and `screenshots/` for the machine-readable results. The test-only `Hierarchy.java` helper bypasses UIAutomator's idle wait so the real one-second countdown can be inspected. It is pushed as a standalone shell test jar, never included in the APK.

```sh
npx tsc --noEmit
node --test tools/foundation/*.test.cjs tools/phase3/*.test.cjs tools/phase4/*.test.cjs tools/phase5/*.test.cjs tools/phase6/*.test.cjs
node tools/phase6/verify-sources.cjs /private/tmp/roqia-phase6/habous
# JDK 21, Android SDK 36; standalone bundled-JS review build, no Metro required:
cd android
./gradlew :app:assembleReview -PreactNativeArchitectures=arm64-v8a
# From repository root, after backing up app data:
python3 tools/phase6/build-ui-helper.py
adb -s emulator-5554 push /private/tmp/roqia-phase6/hierarchy.jar /data/local/tmp/roqia-hierarchy.jar
python3 tools/phase6/android-journeys.py --output /private/tmp/phase6-screens --section screens
python3 tools/phase6/android-journeys.py --output /private/tmp/phase6-screens --section notifications
python3 tools/phase6/android-journeys.py --output /private/tmp/phase6-screens --section offline
python3 tools/phase6/android-journeys.py --output /private/tmp/phase6-screens --section calculation
# The location test expects a fresh permission prompt; reset only this emulator app's location grants first.
python3 tools/phase6/android-journeys.py --output /private/tmp/phase6-screens --section location
```

## Remaining acceptance and next pickup

- **RQ-037:** published snapshot path and bundled timezone handling replace the immediate Morocco display blocker. The custom Morocco calculation formula remains unapproved; no arbitrary seasonal offsets or claims of official computed times were introduced.
- **RQ-040 / RQ-042:** full native adhan, reviewed normal/Fajr recordings, preview/download catalog, real Stop/audio-focus/call handling and physical Android matrix remain open. The sound page explains that no full recording is available. The unidentified bundled `adan.mp3` is not relabeled or published as a new prayer sound.
- **RQ-044:** ordinary Notifee timestamp notifications are subject to OS delay. No exact-alarm or indefinite unattended-renewal promise. Notifee owns persistence of already-created triggers; native boot/package renewal beyond the saved window and Doze/long-inactivity behavior still need device acceptance. Force-stop requires reopening the app. No full adhan playback is scheduled, including after reboot.
- iOS native adapters/testing, signed Play upgrade, physical compass calibration, Android 12–16 device delivery matrix and final accessibility/visual parity remain release work.

After this PR, continue the remaining M6 acceptance in order: RQ-040 native full playback → RQ-042 actual recording acquisition/previews → RQ-044 unattended lifecycle verification. RQ-045 onward can audit the implemented fallback states independently, but must not mark these unfinished capabilities complete.
