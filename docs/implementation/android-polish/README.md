# Android polish: screen-by-screen review

## 1. Arruqya card completion

Implemented for the main **الرقية الشرعية** screen only. A card whose saved remaining count is zero now uses the existing success surface and border, shows a checkmark and **تمت القراءة**, and explains **للتكرار، أعد العداد**. Text stays fully readable and selectable. Copy, bookmark, per-item listening and confirmed reset remain available. The completed counter remains disabled; resetting it restores the active presentation. No counter storage or audio behavior changes.

This is a focused completion-state change, not a claim that the whole screen matches `08-ruqya.png`. The light and dark reference images were inspected. **The user approved the completed-card appearance on 2026-10-19 and authorized continuing the remaining batch.**

### Before and after

Both builds show the same pre-existing completed first card on `emulator-5554`, user 0, package `name.roqia.app`.

| Theme | Before                                           | After                                              | Reset to active                            |
| ----- | ------------------------------------------------ | -------------------------------------------------- | ------------------------------------------ |
| Light | [Before](screenshots/before-completed-light.png) | [Completed](screenshots/after-completed-light.png) | [Reset](screenshots/after-reset-light.png) |
| Dark  | [Before](screenshots/before-completed-dark.png)  | [Completed](screenshots/after-completed-dark.png)  | [Reset](screenshots/after-reset-dark.png)  |

### Verification

See [verification.json](verification.json) for the build, checks and emulator data-preservation results. No physical device, other app, device-network toggle, uninstall or data clear is part of this verification. iPhone work remains deferred. Accessibility labels and disabled states are inspected in the Android hierarchy; TalkBack listening is not verified.

## 2–3. Back controls and Adhkar landing

The next focused change replaces the remaining text-only back buttons in search/bookmarks, the guide footer and the edition picker. It also updates only the Adhkar landing screen against both `09-adhkar.png` references. See [the review evidence](adhkar-and-back/README.md). **The user approved this change on 2026-10-19 and authorized the next phase.** Category subpages keep their existing presentation.

## 4. Du'a and Tasbihat

Du'a and Tasbihat were updated using the `13-dua.png` and `14-tasbih.png` references. Listen-to-all is removed from Du'a, and both screens retain per-item audio. The existing bundled content and real saved progress are preserved. The user accepts the current design deviations and approved the smaller Tasbihat circle inside the light-theme doorway on 2026-10-19, authorizing the remaining phases. That focused correction is recorded in [the review evidence](dua-tasbihat/README.md); full reference fidelity is not claimed.

## 5. Mini-player close

The mini-player has a small close icon with a 48 dp accessible target, available during playback, while paused and for an error-only bar. It uses the existing stop operation to clear the native queue, sleep timer and saved session. A pending saved-session restore is invalidated when stopping. See [verification and captures](mini-player-close/README.md).

## Remaining requested batch, in order

6. Implement persisted Western digits `0123456789` (default) and Eastern digits `٠١٢٣٤٥٦٧٨٩` throughout user-visible formatting. Preserve canonical storage and IDs, source Quran text, timing math, URLs and edition/font-specific verse markers. Inspect current formatting/settings boundaries first.
7. Keep Doha and bundle at least two additional full regional adhans plus an honestly labelled short option. Inspect the existing sounds catalog, attribution and Android native sound handling first. Verify sources, provenance and redistribution permission; do not invent regional or performer labels. Preview, selection, scheduling and background playback must all work offline immediately, without a download. Searching for suitable recordings is authorized.

Continue in this checkout on an appropriate `codex/` branch. Use only `emulator-5554`, user 0, `name.roqia.app`, with in-place updates and restored QA preferences/counters. Keep private backups outside Git. Preserve the accepted Quran recording/riwaya/numbering/integrity/native-clipping safeguards from PR #19. Do not expand visual acceptance from tests or a screenshot gallery.

The reader-tabs idea remains withdrawn; do not change reader tabs or segments.
