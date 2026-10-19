# Android polish: screen-by-screen review

## 1. Arruqya card completion

Implemented for the main **الرقية الشرعية** screen only. A card whose saved remaining count is zero now uses the existing success surface and border, shows a checkmark and **تمت القراءة**, and explains **للتكرار، أعد العداد**. Text stays fully readable and selectable. Copy, bookmark, per-item listening and confirmed reset remain available. The completed counter remains disabled; resetting it restores the active presentation. No counter storage or audio behavior changes.

This is a focused completion-state change, not a claim that the whole screen matches `08-ruqya.png`. The light and dark reference images were inspected. Visual approval is pending before expanding the styling work.

### Before and after

Both builds show the same pre-existing completed first card on `emulator-5554`, user 0, package `name.roqia.app`.

| Theme | Before                                           | After                                              | Reset to active                            |
| ----- | ------------------------------------------------ | -------------------------------------------------- | ------------------------------------------ |
| Light | [Before](screenshots/before-completed-light.png) | [Completed](screenshots/after-completed-light.png) | [Reset](screenshots/after-reset-light.png) |
| Dark  | [Before](screenshots/before-completed-dark.png)  | [Completed](screenshots/after-completed-dark.png)  | [Reset](screenshots/after-reset-dark.png)  |

### Verification

See [verification.json](verification.json) for the build, checks and emulator data-preservation results. No physical device, other app, device-network toggle, uninstall or data clear is part of this verification. iPhone work remains deferred. Accessibility labels and disabled states are inspected in the Android hierarchy; TalkBack listening is not verified.

## Remaining requested batch, in order

These items remain queued; this PR implements item 1 only.

2. Replace text-only back controls, including search, with the app's accessible back icon. Preserve navigation, RTL direction and touch targets; top-left search may stay.
3. Match only the main Adhkar landing screen to light/dark `09-adhkar.png`. Keep other Adhkar subpages as they are.
4. Match Du'a to light/dark `13-dua.png` and inspect light/dark `14-tasbih.png` for Tasbihat. Remove listen-to-all from both while retaining supported per-item audio. Inspect each actual reference before editing its screen.
5. Add a small accessible mini-player close control. Stop/dismiss playback and hide the bar, including when paused and after navigation. Ensure saved-session restoration does not reopen a dismissed player. The reader-tabs idea was withdrawn; do not change reader tabs or segments.
6. Implement persisted Western digits `0123456789` (default) and Eastern digits `٠١٢٣٤٥٦٧٨٩` throughout user-visible formatting. Preserve canonical storage and IDs, source Quran text, timing math, URLs and edition/font-specific verse markers. Inspect current formatting/settings boundaries first.
7. Keep Doha and bundle at least two additional full regional adhans plus an honestly labelled short option. Inspect the existing sounds catalog, attribution and Android native sound handling first. Verify sources, provenance and redistribution permission; do not invent regional or performer labels. Preview, selection, scheduling and background playback must all work offline immediately, without a download. Searching for suitable recordings is authorized.

Continue in this checkout on an appropriate `codex/` branch. Use only `emulator-5554`, user 0, `name.roqia.app`, with in-place updates and restored QA preferences/counters. Keep private backups outside Git. Preserve the accepted Quran recording/riwaya/numbering/integrity/native-clipping safeguards from PR #19. Do not expand visual acceptance from tests or a screenshot gallery.
