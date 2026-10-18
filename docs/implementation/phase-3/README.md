# Phase 3 — existing application screens

Branch: `phase_3/existing-app-redesign`, based on merged phase 2 (`c7e45e1`). Scope: ordered steps 19–27, RQ-006–RQ-014. Shared React Native implementation; Android validation first. No iOS build/device claim and no Quran source/catalog change.

## Implementation

- Launch waits for local hydration. One full-screen sequence presents the skippable guide and unchanged religious guidance, honors migrated seen flags, and then releases pending links to navigation. More can replay both without resetting flags. Startup never requests notification permission.
- Ruqya, all three adhkar categories and dua use the same reading cards. Canonical content, permanent IDs, repeat defaults and audio mappings are unchanged. Counter, copy, bookmark and audio controls are separate siblings. Counter commands update SQLite atomically and acknowledge the new value only after commit; whole-state React effects no longer rewrite progress after every tap. Failed commands leave displayed progress unchanged and offer retry. Completion clamps at zero; item/page/global resets require confirmation and preserve bookmarks/downloads. Page reset contains only that page's IDs.
- Tasbih uses a progress ring, a dedicated count button and a selector containing all original entries. Remaining counts persist; there is no midnight reset. Its target is the original repeat value, not a mockup's sample number.
- Bookmarks use typed devotional IDs and local SQLite. Search normalizes a separate index, never the canonical displayed/copied text. Filters, empty states, missing-content recovery and opening an item by stable ID are included. Preview text identifies the entry rather than showing only its citation.
- More exposes secondary destinations, replay, sources, offline legal pages, downloads/storage and reminders. Preferences include live light/dark/system themes, persisted UI scale, fixed Western digits, and the existing Wi-Fi download policy. Scripture/reading type remains separate from UI scale. Preferred edition/translation leads to an honest unavailable state until approved Quran packs exist.
- About retains the existing contact identity and source URLs. External URLs/email require an explicit open action; failure offers retry/copy/back. Privacy/terms are bundled for offline reading. The version-specific privacy clarification describes optional provider network requests and states that location features are not implemented yet. The public website policy has not been silently replaced; final owner/editorial review remains a release gate.
- Reminder choices persist before native scheduling. A serialized reconciliation replaces only this feature's legacy/owned IDs, retries failed work, and detects permission/channel changes. Each selected weekday gets one weekly trigger (maximum 21 for the three categories). Fresh defaults are off; migrated enabled choices and times remain. Permission is requested only from explicit Save/Test actions. The screen distinguishes saved choices from effective notification availability.

## Boundaries and remaining release acceptance

Ordinary reminders use Notifee timestamp triggers without requesting exact-alarm/full-adhan privileges. They are subject to Android power management. The plan derives the next occurrence in the device's local zone, including DST-gap fixtures; startup/foreground reconciliation reacts to zone/offset changes. This is **not** proof of week-long closed-app delivery across DST, reboot, Doze or OEM restrictions. That physical-device/lifecycle matrix remains RQ-044/RQ-048. See [Notifee trigger documentation](https://notifee.app/react-native/docs/triggers/).

The prior global Jest/ESLint configuration failures remain separate from focused executable tests; they are not represented as passing. Full TalkBack traversal, qualified devotional/editorial review, final per-screen visual acceptance and an actual Play-signed upgrade remain release gates. Android emulator evidence is not iOS evidence.

## Reproduction

```sh
npx tsc --noEmit
yarn foundation:test
yarn phase3:test
yarn feasibility:test
JAVA_HOME=/path/to/jdk21 ANDROID_HOME=/path/to/sdk ./android/gradlew -p android :app:assembleDebug -PreactNativeArchitectures=arm64-v8a
```

Use only an expendable emulator for UI mutation checks. Install the APK **in place**, back up the existing SQLite database and app preferences first, and restore test changes afterward. `tools/phase3/android-journeys.py --output <folder> --section <name>` (`--help` lists the journeys) targets only `emulator-5554`. It requires Metro and the debug app; it does not uninstall/clear app data. Do not edit JS while a journey is running. Large-text checks restore the original display/font settings. The interaction, extra-counter and first-run checks intentionally change counters/bookmarks/seen flags and require the saved backup to be restored. The external-link failure journey requires no enabled `mailto:` handler; for this emulator the Gmail handler was temporarily disabled and restored to its original default-enabled state. Airplane-mode legal reading starts after loading Metro, because a debug JavaScript server is not a bundled release artifact.

Native probes are opt-in debug entry points in `tools/phase3/androidProbe.ts`, dispatched by `.feasibility.ProbeActivity` with `--es scenario phase3-reminders`, `phase3-inspect`, `phase3-first-run`, or `phase3-test-notification`. The reminder probe restores saved reminder choices in `finally`. The first-run probe changes only seen flags, allowing pending-link/education checks without erasing user data. Native event evidence uses event sequence boundaries, not host/device clock comparison.

## Evidence

Android emulator: `sdk_gphone64_arm64`, Android 16 / API 36, arm64, density 420. Only `emulator-5554` was used; the attached physical device was not touched. The debug APK was installed in place, preserving the existing database. UI changes use the existing fonts and design-kit SVG illustrations.

- Android debug assembly and production-mode JavaScript bundling succeed. The JavaScript bundle check does not claim a signed release APK.
- `npx tsc --noEmit` passes. Foundation + phase 3 suites: 31 tests pass, including actual SQLite transactional counter commands, zero clamping, rollback, ordered rapid mutations, source integrity, local discovery, reminder validation and scheduling failure recovery.
- Existing feasibility suite: 14 Python + 7 Node tests pass.
- Android navigation/capture checks cover 18 destinations in both themes. Text at 320 dp / 200% OS scale is exercised, with original display settings restored afterward.
- UI journeys verify copy/bookmark/audio isolation, count/bookmark persistence across restart, removal without count changes, completion, reset cancel/confirm, five rapid tasbih taps, selector and persisted UI scale. Counter acknowledgement now follows the SQLite commit; terminating the process while an input is still unacknowledged is not a promise that that input completed.
- First-run **flags** are exercised reversibly on the populated emulator: skip → unchanged guidance → pending cold link, then restart and replay. This is not represented as a clean Play installation.
- Real notification permission denial and channel blocking are exercised separately and restored. Warm and process-death notification taps both open morning adhkar; the final cold run confirmed the process was absent before the tap. No startup permission dialog appears. Native reminder probes verify 6 weekday triggers → 3 replacement triggers → 0 when disabled, then restore saved choices.

Individual captures, journey records and native results accompany this report in `evidence/`.

Final database comparison after restoring test mutations: all 207 counter rows match the original backup **including all columns**. Settings, bookmarks and saved reminder choices also match (ignoring record `updatedAt`); only the expected reminder runtime scheduling signature was added. Original display size, font scale and airplane mode were restored. See [preservation result](evidence/preservation.json).

- [Focused test output](evidence/tests.log), [feasibility output](evidence/feasibility.log), [build checks](evidence/build-checks.txt).
- [Screen journeys](evidence/screens.json), [large text](evidence/large.json), [reader interactions](evidence/interactions.json), [tasbih/progress/settings](evidence/extras-dark.json), [reset confirmations](evidence/confirmations.json).
- [Launch/replay](evidence/onboarding.json), [permission/channel denial](evidence/permissions.json), [offline/external recovery](evidence/external.json).
- [Native reminder replacement](evidence/native-reminders.json), [warm notification tap](evidence/warm-notification.json), [cold notification tap](evidence/cold-notification.json), [process absence](evidence/cold-process.json).

### Individual screen captures

Each link opens one Android screen; captures are not combined into contact sheets.

| Screen | Light | Dark |
| --- | --- | --- |
| Ruqya | [Light](evidence/ruqya-light.png) | [Dark](evidence/ruqya-dark.png) |
| Adhkar | [Light](evidence/adhkar-light.png) | [Dark](evidence/adhkar-dark.png) |
| Morning | [Light](evidence/morning-light.png) | [Dark](evidence/morning-dark.png) |
| Evening | [Light](evidence/evening-light.png) | [Dark](evidence/evening-dark.png) |
| Sleep | [Light](evidence/sleep-light.png) | [Dark](evidence/sleep-dark.png) |
| Dua | [Light](evidence/dua-light.png) | [Dark](evidence/dua-dark.png) |
| Tasbih | [Light](evidence/tasbih-light.png) | [Dark](evidence/tasbih-dark.png) |
| Bookmarks | [Light](evidence/bookmarks-light.png) | [Dark](evidence/bookmarks-dark.png) |
| Search | [Light](evidence/search-light.png) | [Dark](evidence/search-dark.png) |
| More | [Light](evidence/more-light.png) | [Dark](evidence/more-dark.png) |
| Settings | [Light](evidence/settings-light.png) | [Dark](evidence/settings-dark.png) |
| About | [Light](evidence/about-light.png) | [Dark](evidence/about-dark.png) |
| Sources | [Light](evidence/sources-light.png) | [Dark](evidence/sources-dark.png) |
| Privacy | [Light](evidence/privacy-light.png) | [Dark](evidence/privacy-dark.png) |
| Terms | [Light](evidence/terms-light.png) | [Dark](evidence/terms-dark.png) |
| Welcome | [Light](evidence/welcome-light.png) | [Dark](evidence/welcome-dark.png) |
| Guidance | [Light](evidence/guidance-light.png) | [Dark](evidence/guidance-dark.png) |
| Reminders | [Light](evidence/reminders-light.png) | [Dark](evidence/reminders-dark.png) |

Large-text captures (320 dp / 200% OS text scale):

| Screen | Light | Dark |
| --- | --- | --- |
| Ruqya | [Light](evidence/ruqya-light-320dp-200percent.png) | [Dark](evidence/ruqya-dark-320dp-200percent.png) |
| Tasbih | [Light](evidence/tasbih-light-320dp-200percent.png) | [Dark](evidence/tasbih-dark-320dp-200percent.png) |
| More | [Light](evidence/more-light-320dp-200percent.png) | [Dark](evidence/more-dark-320dp-200percent.png) |
| Reminders | [Light](evidence/reminders-light-320dp-200percent.png) | [Dark](evidence/reminders-dark-320dp-200percent.png) |
