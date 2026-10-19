# Adhkar landing and accessible back controls

The Arruqya completed-card change was approved by the user on 2026-10-19. This next review covers requested items 2 and 3 only.

## Changes

Search and bookmarks now have a fixed header with the same accessible right-pointing back icon used by the other Arabic page headers. It keeps a 48 dp touch target and returns to the previous screen, including after scrolling results. The guide footer and edition picker's return action also use that standard icon, retaining their original callbacks and accessible labels. Audio rewind/previous controls and descriptive recovery actions keep their existing meaning.

Only the main Adhkar landing screen is restyled against the actual light/dark `09-adhkar.png` references. The header and category subtitles follow the reference wording. Larger sunrise, patterned crescent and bedtime artwork distinguish the categories; the light bedtime card remains emphasized. The Du'a and Tasbihat shortcuts gain illustrations and subtitles, with the reference title **التسبيحات** on the shortcut. Existing saved category completion remains available in accessibility hints. The header search action remains available.

Decorative vectors are local to this screen, with no new assets downloaded at runtime. Large interface text reduces the artwork width and stacks the two shortcuts; content remains scrollable. No shared typography, palette, tabs, mini-player, counter storage, Adhkar category subpage, Du'a page or Tasbihat page is changed by the landing-screen styling.

## Before and after

Both actual `09-adhkar.png` references were inspected before editing. Review the native Android captures against the [light reference](../../../../design/roqia-v2/reference/light/09-adhkar.png) and [dark reference](../../../../design/roqia-v2/reference/dark/09-adhkar.png).

| Screen        | Before                                        | After                                       |
| ------------- | --------------------------------------------- | ------------------------------------------- |
| Adhkar, light | [Before](screenshots/before-adhkar-light.png) | [After](screenshots/after-adhkar-light.png) |
| Adhkar, dark  | [Before](screenshots/before-adhkar-dark.png)  | [After](screenshots/after-adhkar-dark.png)  |
| Search, light | [Before](screenshots/before-search-light.png) | [After](screenshots/after-search-light.png) |

The composition follows the reference hierarchy, wording, card emphasis, illustration placement and shortcut arrangement. Native vector details and system chrome differ; shared tabs and global screen styling are outside this change. **The user approved the Adhkar/back-control change on 2026-10-19 and authorized continuing to Du'a and Tasbihat.**

Additional captures: [dark search](screenshots/after-search-dark.png), [guide footer back icon](screenshots/after-guide-back-light.png), [1.5× interface text](screenshots/after-adhkar-large-dark.png) and [stacked shortcuts after scrolling](screenshots/after-adhkar-large-shortcuts-dark.png).

## Verification

The Android arm64 review build was installed in place on `emulator-5554`, user 0. The installed APK hash is checked against the new build before its captures are accepted. An initial update failed because storage was low. The user explicitly approved temporarily lowering the emulator's free-space reserve; the original setting was restored immediately after each successful install. No saved content, app data or other apps were removed. No network setting, display size or OS font scale was changed.

Automated and UI-check results, data restoration and the final APK hash are recorded in [verification.json](verification.json). Lint is blocked by the existing ESLint 10/legacy-config mismatch. TalkBack listening and iPhone are unverified.

All 137 Node tests, TypeScript, changed-file formatting and diff checks pass. On the emulator, all five landing links and their back actions work. The search header remains fixed while results scroll, with a right-side 48 dp accessible back button. Bookmarks, guide step-back and return-without-download navigation also pass. At the app's 1.5× text setting, the shortcuts stack and remain reachable by scrolling. Neither 320 dp nor 200% OS font scaling was tested in this batch.

All 207 counters remained unchanged throughout QA. All 38 original records remain; after restoring the exact original app settings, 37 are byte-identical and the remaining change is automatic prayer renewal. The restored database was hash-verified on the emulator. Normal startup may refresh the settings write timestamp. Private backups remain outside Git.

The rest of the requested batch remains in the [ordered checklist](../README.md): Du'a/Tasbihat, mini-player close, digit styles and bundled regional adhans. The withdrawn reader-tabs idea stays excluded.
