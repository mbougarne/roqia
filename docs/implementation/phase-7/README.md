# Phase 7 — explicit visual implementation, first batch

Branch: `phase_7/design-parity`, based on merged phase 6 (`ee06050`). Scope: the complete visual work plan plus the first two UI tickets, RQ-051/RQ-052. This is an Android review build, not whole-app visual acceptance or a Play release. Shared React Native UI remains cross-platform; iOS testing is deferred.

## Plan and scope

[RQ-051 through RQ-062](../../../design/roqia-v2/implementation/IMPLEMENTATION-ORDER.md) explicitly assign all 48 reference screens to implementation tickets. [VISUAL-COVERAGE.md](../../../design/roqia-v2/implementation/VISUAL-COVERAGE.md) tracks light and dark evidence separately. All 62 ticket files have consistent work-order/previous/next links. RQ-046 now depends on that visual implementation sequence and remains the final 96-capture/accessibility audit. Functional full-adhan, recording acquisition and lifecycle work remains open; its order follows the UI sequence before release acceptance.

## Implemented in this batch

- Shared centered compact headers. Tabs now follow the reference's right-to-left order: Ruqya, Quran, Adhkar, Prayer, More. Light selection uses a rounded icon background; dark selection uses gold and an underline. Route names/deep links are preserved.
- Prayer: illustrated city/date card, illustrated next-prayer card, one compact six-row timetable, actual next-prayer highlight, notification-status icons, method row and paired Qibla/adhan shortcuts. Sunrise has no notification button. Bell buttons open existing preferences; they do not silently enable alarms. Source/expiry, refresh and unavailable-data recovery remain reachable below the main composition. Refresh prevents repeated taps while active.
- Qibla: original live SVG compass with gold rim, ticks, cardinal letters, geometric center and upright Kaaba marker. Rose rotates by negative true heading; needle rotates by bearing minus heading. No reliable heading means an explicitly labeled north-up diagram. City selection, numeric bearing, sensor state, calibration and external-map fallback remain functional. Sensors retain their existing off-screen/background cleanup.
- Western UI digits, unchanged compact type tokens, real data and source-specific Quran fonts. No screenshot is used as a runtime screen; no sample timetable or invented accuracy/recording badge is introduced.

## Reference comparisons

Each image is a separate file from the normal running Android app.

| Screen/theme | Agreed reference | Android implementation |
| --- | --- | --- |
| Prayer light | [Reference](../../../design/roqia-v2/reference/light/39-prayer-times.png) | [Capture](screenshots/39-prayer-times-light.png) |
| Prayer dark | [Reference](../../../design/roqia-v2/reference/dark/39-prayer-times.png) | [Capture](screenshots/39-prayer-times-dark.png) |
| Qibla light | [Reference](../../../design/roqia-v2/reference/light/40-qibla.png) | [Capture](screenshots/40-qibla-light.png) |
| Qibla dark | [Reference](../../../design/roqia-v2/reference/dark/40-qibla.png) | [Capture](screenshots/40-qibla-dark.png) |

Comparison: restored card/list hierarchy, illustrations, prominent numeric values, compact actions, compass composition and tab styling. The first capture review exposed a pointer/cardinal-letter overlap and square tab background; both were corrected before the final captures.

Intentional differences: actual date/times and saved alarm modes replace mockup samples; source attribution/expiry/refresh and external-map fallback remain available; the root Prayer tab has no meaningless back button. Original vector linework and semantic kit colors replace generated-image texture/gradients. The sensor status says a reading is available, not that physical compass accuracy has been certified. At large text sizes the layout grows/scrolls and decorative prayer artwork yields space to text; controls remain usable. The verified Quran text/font pairing is unchanged.

## Validation

Android 16 / API 36 arm64 emulator `emulator-5554`, 1080×2400, default density 420 (~411 dp wide). Additional both-theme captures use 200% system font size and density 540 (320 dp wide); normal display preferences are restored afterward. XML trees accompany the captures. These checks do not establish physical compass accuracy, TalkBack traversal, full-adhan delivery or iOS readiness.

Commands:

```sh
npx tsc --noEmit
node --test tools/foundation/*.test.cjs tools/phase3/*.test.cjs tools/phase6/*.test.cjs
cd android
ANDROID_HOME="$HOME/Library/Android/sdk" JAVA_HOME="$HOME/.sdkman/candidates/java/current" ./gradlew :app:assembleReview -PreactNativeArchitectures=arm64-v8a
```

For normal-app screenshots/journeys, build/push the existing test-only hierarchy helper using `tools/phase6/build-ui-helper.py`, back up emulator app data, install the review APK in place, and run `tools/phase7/android-visual.py --output docs/implementation/phase-7/screenshots --section capture` (also `journeys`, `large`, `narrow`). `large` expects font scale 2; `narrow` expects density 540 and font scale 1. Restore display settings and light mode after testing. The helper removes old hierarchy files before every dump so cold-start captures cannot accidentally accept the previous screen.

Final results: TypeScript and formatting pass; 43 existing foundation/devotional/prayer regression tests pass; the arm64 review build installs in place. [Build identity](build.json) includes the final APK hash. The final installed-build [capture](screenshots/capture.json), [320 dp](screenshots/narrow.json), [200% text](screenshots/large.json) and [navigation/offline](screenshots/journeys.json) checks pass. Visible Western digits were checked in every captured hierarchy. [Touch target evidence](touch-targets.json) verifies fully visible controls in the four main-screen captures meet 48 dp.

Navigation checks exercise all six timetable rows, no sunrise toggle, prayer bell → preferences, city/method/Qibla/adhan shortcuts, calibration/back, sources, correct tab order, and the existing Quran library. Prayer and Qibla reopen offline. Both themes' large-text/narrow captures include a scrolled view to inspect lower controls. Representative final captures were visually reviewed against the original references; these checks do not claim every TalkBack/native edge case passed.

[Data preservation](preservation.json): all 207 counter rows and 20 of 21 stored records are unchanged; the only record change is the settings update timestamp from theme testing. Bookmarks, both edition reading positions, installed/download metadata, playback, reminders and prayer preferences are preserved. All 241 existing app files apart from the installation marker `profileInstalled` are byte-identical by SHA-256. The private backup/databases are not committed. Emulator density 420, font scale 1 and the original light theme are restored.

## Next work

Continue RQ-053 (calibration and city selection), then RQ-054 through RQ-062 in order. The other 46 reference screens remain pending visual implementation/verification even where shared framing improved. RQ-046 is not complete. Physical device and broader accessibility checks remain RQ-048/RQ-046; full adhan remains RQ-040/RQ-042/RQ-044.
