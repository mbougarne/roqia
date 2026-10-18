# Acceptance and verification plan

Use the approved 48-screen registry as the visual coverage matrix. Each ticket supplies evidence for its own change; these cross-feature checks close the release. Unit tests establish logic, screenshots establish appearance, and real devices establish native behavior. None substitutes for the others.

## Platform sequence

Current execution tests on Android while implementing shared React Native features for both platforms. Defer iOS build/device testing until all tickets have completed their Android implementation/acceptance work. Record iOS as unverified, not failed or implicitly passed. The later iOS pass must cover its own build, native adapters, permissions, background behavior, rendering, accessibility and upgrade journeys before an iOS release; this deferred pass does not block the current Android ticket sequence.

## Automated checks to implement

| Area | Meaningful cases |
| --- | --- |
| Persistence | Legacy key map, finite/bounded counts, idempotent migration, no pre-hydration overwrite, interrupted transaction, schema upgrade |
| Counters | Per-item/category/global scope, no negative counts, inner action isolation, no audio-triggered decrement |
| Content | Original hashes, exact canonical text round-trip, edition-specific structure/counts, duplicate/missing records, basmala/font/render fixtures |
| Downloads | Transition legality, deduplication, stale callbacks, Range 206/200/416, changed ETag, unknown size, corrupt file, disk-full, crash during activation/deletion |
| Audio | Queue mapping, repeat modes, missing files, persisted position and version identity, sleep deadline logic |
| Prayer | Civil dates versus UTC, Morocco DST/Ramadan transitions, tomorrow Fajr, offsets applied once, undefined/high-latitude results |
| Qibla | Known coordinates, declination sign, display rotation, 359°/0° smoothing, unavailable sensor |
| Navigation | Old deep links, cold-start pending link, missing pack, invalid params, back behavior, no duplicate notification open |
| Formatting | Western digits under Arabic/Eastern-digit device locale, plural categories, mixed-direction units/URLs and French/English blocks |

Use fixtures rather than live public APIs in deterministic tests. Acquisition checks separately validate actual provider artifacts. Never rewrite fixtures to hide an unexplained source change.

## Visual/accessibility matrix

Capture all 48 routes/states in light and dark from the running app. Compare to references at consistent logical size; semantic tokens/components govern intentional deviations. Inspect Arabic shaping and harakat, 320/360/393/430 widths, 200% OS font scale, scroll reachability, keyboard overlap, safe areas and landscape/tablet fallback. Check 48 dp targets, text/control contrast, selected/disabled/error states and reduced motion.

Use TalkBack: reading order, correct labels/roles, counter value, switch/checkbox selection, modal focus return, one-time error announcement and no decorative icon noise. French/English translation reading direction and language metadata must be correct.

## Real Android device matrix

At minimum cover the actual supported minimum or representative older device, Android 12/13 permissions, Android 14/15 restrictions and target Android 16 behavior, plus a real device with aggressive battery management. Record device, OS/API, build and test date; an emulator-only run is insufficient for compass and background adhan.

Test locked/background playback, notification controls, wired/Bluetooth disconnect, calls/audio focus, Doze/battery saver, reboot, force-stop/reopen, app upgrade, permission revocation, channel disable, schedule horizon renewal, no sensor, GPS disabled/denied, low disk, cellular/Wi-Fi switch and airplane mode. Native downloads must reconcile after process death without duplicate jobs or completed-file loss.

## Core offline journeys

1. Fresh install with no network: existing devotional content, counters, settings and bundled legal pages work; Quran clearly offers a later download.
2. Download one Warsh pack, selected audio and a compatible translation where available; restart in airplane mode; read, search supported content, bookmark and listen.
3. Add Hafs without deleting Warsh; switch editions; retain distinct reading positions and recitation compatibility.
4. Interrupt a large download, restart, recover, delete selected files, and prove completed unrelated files still work.
5. Select a city manually; calculate prayers/Qibla without GPS/network; verify sensor-unavailable fallback.
6. Upgrade a populated released install; counts, theme, onboarding status and reminder times survive.

## Performance and size budgets (proposed targets)

Measure a baseline in RQ-001, then set a device-specific budget in RQ-049. Initial targets: no main-thread work longer than 100 ms for routine taps; local search first result under 300 ms on the baseline device; smooth chapter scrolling; no whole-audio buffering in JS; no whole-corpus parsing on startup. These are targets, not measured results. Report startup, memory, battery and installed/download size separately.

## Evidence record

Each completed ticket records: commit/build, changed paths, scenario, expected/observed result, test command or manual steps, screenshots where relevant, device/OS, source-pack versions and unresolved limitations. Content reviewer evidence identifies edition and sample scope. Release gates are marked pending until that evidence exists.
