# Du'a and Tasbihat review

The user approved the Adhkar/back-icon change on 2026-10-19. This next review covers requested item 4. Both light/dark `13-dua.png` and `14-tasbih.png` references were inspected before editing.

## Du'a

Cards now place the prayer text above its source, followed by a per-item listen/copy/bookmark action row and a full-width remaining-count row. Each counter retains its confirmed reset action. The header, search, favorite filter, ornaments and spacing follow the reference hierarchy. Empty/search/favorite-load states are explicit. The list-wide listen action and progress strip are removed from Du'a only.

Original text, citations, audio mapping, stable IDs, ordering and defaults remain unchanged. In particular, the bundled anxiety prayer is cited as Bukhari 6363; the reference image shows a different number. The source data is retained. Its search-filtered capture can be used to inspect the shorter card composition alongside the reference; the default first prayer is longer.

## Tasbihat

The screen uses a progress ring, decorative arch in light mode, three quick choices, large tap control and reset/chooser layout. Quick choices link to the actual bundled سبحان الله, الحمد لله and الله أكبر entries. All 17 original items remain available in the chooser, including long texts. The counter still counts remaining repetitions down; its ring represents completed repetitions. It exposes the actual source default as the goal. Bundled defaults are 100, while the reference shows 33.

The vibration switch is functional, off by default and persisted independently in `tasbih-vibration/singleton` using the existing serialized repository. Enabled feedback requests a 20 ms native vibration after a count tap; emulator checks cannot establish physical tactile quality. Failure to read the preference offers retry, and a failed save leaves the prior value in force. Individual audio, copy/bookmark/source access and confirmed per-item/page resets remain available. There is no listen-to-all control on this screen.

Large interface text moves the devotional text above the dial, keeping the number readable. Long selected texts also sit outside the dial. The standard icon button accepts an optional icon color so the Du'a reset stays readable on its selected counter surface; existing callers retain their previous color. No shared design tokens, Quran data, reader tabs, audio controller or Adhkar category page is changed.

## Review and verification

| Screen          | Before                                          | After                                         |
| --------------- | ----------------------------------------------- | --------------------------------------------- |
| Du'a, light     | [Before](screenshots/before-duaa-light.png)     | [After](screenshots/after-duaa-light.png)     |
| Du'a, dark      | [Before](screenshots/before-duaa-dark.png)      | [After](screenshots/after-duaa-dark.png)      |
| Tasbihat, light | [Before](screenshots/before-tasbihat-light.png) | [After](screenshots/after-tasbihat-light.png) |
| Tasbihat, dark  | [Before](screenshots/before-tasbihat-dark.png)  | [After](screenshots/after-tasbihat-dark.png)  |

The shorter existing anxiety prayer, filtered by its source number 6363, is captured in [light](screenshots/after-duaa-reference-light.png) and [dark](screenshots/after-duaa-reference-dark.png) for comparison with the reference card composition. Additional captures show 1.5× interface text in [Du'a](screenshots/after-duaa-large-dark.png) and [Tasbihat](screenshots/after-tasbihat-large-dark.png).

Captures use hash-verified review APKs on `emulator-5554`, user 0. The user accepts the current Du'a/Tasbihat design deviations and requested only the circle-fit correction below before continuing. This is not approval of full reference fidelity. Native artwork, shared chrome and the preserved source texts/defaults differ from the sample images. iPhone work stays deferred. Results and preservation checks are recorded in [verification.json](verification.json).

### Focused circle-fit correction

The light-theme dial is reduced from 280 to 240 dp, with 32 dp more space above it. Its circle now sits inside the doorway instead of crossing the curved shoulders. Text and number sizes, counter behavior, the tap control and the dark-theme layout remain unchanged. The user approved this correction on 2026-10-19 and authorized continuing the remaining phases.

Compare the same saved remaining count in the [before](screenshots/before-circle-fit-light.png) and [corrected](screenshots/after-circle-fit-light.png) captures. Additional checks show the [longer quick-choice text](screenshots/after-circle-fit-praise-light.png) and [1.5× app text](screenshots/after-circle-fit-large-light.png). The correction passes TypeScript, changed-file formatting and the Android arm64 review build. All 207 counter rows remain byte-exact; the original settings and vibration preference are preserved. Only the app's automatic prayer renewal and settings write timestamp may differ after startup. No counter was tapped during this check.

All 137 existing Node tests, TypeScript, changed-file formatting and the Android arm64 review build pass. Emulator checks cover search, favorites add/filter/remove, explicit empty results, Du'a completion/reset/cancel, independent Tasbihat quick-choice counters, selected reset/cancel, final repetition to zero and disabled state, long-text selection, vibration preference across cold restart, 1.5× app text and per-item native playback on both screens. Zero-state QA temporarily seeded one remaining repetition in app-private data, then exercised the real UI transition to zero. TalkBack listening, physical tactile quality, 320 dp and 200% OS font scaling are unverified. Lint remains blocked by the existing ESLint 10/legacy-config mismatch.

The original 207 counter rows, bookmarks, playback session and settings are restored and verified on the emulator. The QA-only vibration preference is removed, leaving the new feature off by default. All original records remain; only automatic prayer renewal is retained as a data change before normal startup, which may also refresh the settings write timestamp. Backups and raw private database copies remain outside Git.

Installation uses the previously user-approved temporary emulator free-space-reserve adjustment. The original setting is restored immediately after every install. No uninstall, data clear, other apps, physical devices, networking toggle, display resize or OS font-scale change is used.

The remaining [ordered batch](../README.md) is mini-player close, persisted digit styles and bundled regional adhans. The withdrawn reader-tabs idea stays excluded.
