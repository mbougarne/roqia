# أسماء الله الحسنى

**المزيد → أسماء الله الحسنى** shows one card at a time. Each card presents a large centered name and its complete Arabic meaning below. Swipe right for the next card or left for the previous card. The progress bar and position sit immediately below the screen title, with small directional cues in place of the former buttons. Swiping beyond the first or last name keeps the current card in place. Longer meanings scroll vertically without changing cards; switching cards returns to the top. Short, cancelled and predominantly vertical gestures are ignored by the card navigator. The position indicator also exposes next/previous accessibility actions. Compound names wrap naturally. The screen uses the existing Arabic fonts, ornaments, cards, light/dark palettes and saved interface text scale.

Generated position and total numbers use the saved digit style. Source names, meanings, quotations, scripture marks and numbers remain verbatim. Other More entries remain unchanged. **المصادر → أسماء الله الحسنى** uses the existing external-link screen.

## Content provenance

The source is the **الاسم / المعنى** explanation table on [Surah Quran](https://surahquran.com/99-Names-of-Allah-with-Meaning.html). The user supplied the complete table as `src/features/asma/1792441861026.json` on 2026-10-19. That file is bundled directly, without editing, abbreviation, transliteration or translation. The application maps only its field names to the screen's data shape; all Arabic values remain unchanged. No shortened substitute meanings are used.

The supplied file's SHA-256 is `187a94be69913f5c68e952c7507203300ddb20b650b62165ad24254b6e0f2ccf`. Tests pin that input, verify all 99 exact name/meaning pairs, reject incomplete verse brackets and preserve the source's numbered selection and order. The names joined with newlines have SHA-256 `83674c312e42049b7cd1f86390731323b5016b63621283c8ec4ebd3827c811ec`. Later compound-name and Sunnah lists from the surrounding webpage are excluded.

The content needs no database migration or network request. It remains available after a cold start with production JavaScript embedded in the review APK.

## Android review

Only `emulator-5554`, user 0, package `name.roqia.app` was used. The review APK is installed in place after a fresh private baseline. Private backups, databases, hierarchies and raw logs remain outside Git. [verification.json](verification.json) records checks and preservation results.

| Review                             | Light                                           | Dark                                                                                    |
| ---------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------- |
| Top progress and direction cues    | [First card](screenshots/swipe-first-light.png) | [First card](screenshots/swipe-first-dark.png)                                          |
| Right swipe to next                | [Next card](screenshots/swipe-second-light.png) | [Next card](screenshots/swipe-second-dark.png)                                          |
| Vertical reading                   | —                                               | [Top](screenshots/swipe-long-top-dark.png) · [End](screenshots/swipe-long-end-dark.png) |
| Saved Eastern digits after restart | —                                               | [Restart](screenshots/swipe-eastern-restart-dark.png)                                   |

The [approved base review](https://github.com/mbougarne/roqia/blob/596cdc22d2224b2d986572a8a2868c8bb2ba3e03/docs/implementation/asma-allah-alhusna/README.md) retains the earlier all-name navigation, source-link and adhan-preservation evidence.

The user approved the base card design and full-content presentation on 2026-10-19. These updated captures support review of the progress-position and swipe enhancement; acceptance of that enhancement remains pending. iOS and spoken screen-reader testing are deferred. The external-link screen is checked without opening another app. No device network, font or display setting is changed. The previously authorized temporary installation reserve is restored immediately in `finally` and verified. The accepted adhan header and bottom controls remain intact.
