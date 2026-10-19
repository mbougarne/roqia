# أسماء الله الحسنى

**المزيد → أسماء الله الحسنى** shows one card at a time. Each card presents a large centered name and its complete Arabic meaning below. Fixed **السابق / التالي** buttons move between cards without horizontal swiping. The first/last boundaries are disabled. Longer meanings scroll vertically; switching cards returns to the top. Compound names wrap naturally. The screen uses the existing Arabic fonts, ornaments, cards, light/dark palettes and saved interface text scale.

Generated position and total numbers use the saved digit style. Source names, meanings, quotations, scripture marks and numbers remain verbatim. Other More entries remain unchanged. **المصادر → أسماء الله الحسنى** uses the existing external-link screen.

## Content provenance

The source is the **الاسم / المعنى** explanation table on [Surah Quran](https://surahquran.com/99-Names-of-Allah-with-Meaning.html). The user supplied the complete table as `src/features/asma/1792441861026.json` on 2026-10-19. That file is bundled directly, without editing, abbreviation, transliteration or translation. The application maps only its field names to the screen's data shape; all Arabic values remain unchanged. The initial short paraphrases have been removed.

The supplied file's SHA-256 is `187a94be69913f5c68e952c7507203300ddb20b650b62165ad24254b6e0f2ccf`. Tests pin that input, verify all 99 exact name/meaning pairs, reject incomplete verse brackets and preserve the source's numbered selection and order. The names joined with newlines have SHA-256 `83674c312e42049b7cd1f86390731323b5016b63621283c8ec4ebd3827c811ec`. Later compound-name and Sunnah lists from the surrounding webpage are excluded.

The content needs no database migration or network request. It remains available after a cold start with production JavaScript embedded in the review APK.

## Android review

Only `emulator-5554`, user 0, package `name.roqia.app` was used. The review APK is installed in place after a fresh private baseline. Private backups, databases, hierarchies and raw logs remain outside Git. [verification.json](verification.json) records checks and preservation results.

| Review                                | Light                                            | Dark                                                                                                  |
| ------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| More entry                            | [More](screenshots/more-light.png)               | —                                                                                                     |
| Large name and full meaning           | [First card](screenshots/card-first-light.png)   | [First card](screenshots/card-first-dark.png)                                                         |
| End of full meaning                   | [Scrolled](screenshots/card-first-end-light.png) | [Scrolled](screenshots/card-first-end-dark.png)                                                       |
| Next card                             | [Next](screenshots/card-second-light.png)        | [Next](screenshots/card-second-dark.png)                                                              |
| Long explanation                      | —                                                | [Top](screenshots/card-long-meaning-top-dark.png) · [End](screenshots/card-long-meaning-end-dark.png) |
| Compound name                         | —                                                | [Card](screenshots/card-compound-dark.png)                                                            |
| Last card                             | —                                                | [Card](screenshots/card-last-dark.png)                                                                |
| Saved Eastern digits after cold start | —                                                | [Restart](screenshots/card-eastern-restart-dark.png)                                                  |
| Source link                           | —                                                | [Existing flow](screenshots/source-link-dark.png)                                                     |

The captures support user review; they do not establish visual acceptance. iOS and spoken screen-reader testing are deferred. The external-link screen is checked without opening another app. No device network, font or display setting is changed. The previously authorized temporary installation reserve is restored immediately in `finally` and verified. The accepted adhan header and bottom controls remain intact.
