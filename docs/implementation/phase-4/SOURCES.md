# Phase 4 source recheck — 18 October 2026

The implementation consumes only approved runtime descriptors. `src/features/quran/catalog.ts` remains empty. The private Android harness prepares locked local fixtures; its approval flag is only a transport test input, never an editorial or publication decision.

- **Warsh:** same King Fahd v2.1/update 6 archive and matching original font as phase 1. The publisher copyright page at https://dm.qurancomplex.gov.sa/copyright-2/ was inaccessible again. The dataset redistribution basis and qualified rendering/basmala/numbering review remain open. The original U+FC00–U+FD1C ornaments are untouched. No AL Maghribi fallback.
- **Hafs:** same locked Tanzil Uthmani 1.1 export and metadata. The primary [text conditions](https://tanzil.net/docs/Text_License) still permit verbatim use with attribution, link and notice; text must not be changed. The deterministic container preserves each canonical string and notice. Private testing uses the repository's original Noto Sans Arabic font; it is not described as a publisher-supplied Quran font. Native glyph checks and qualified review remain separate.
- **French:** acquired `fr.hamidullah`, credited to Muhammad Hamidullah, directly from Tanzil.
- **English:** acquired `en.pickthall`, credited to Mohammed Marmaduke William Pickthall, directly from Tanzil. This replaces the unconfirmed mockup candidate; it is not “The Clear Quran.”
- Translation byte lengths, SHA-256 and original URLs are pinned in `tools/phase4/translations.lock.json`. The primary [translation page](https://tanzil.net/trans/) permits non-commercial use and restricts republication of its full listing. This app is non-commercial; only the two selected files are evaluated. No translation corpus is committed or published here. Structural alignment has to pass; qualified translation sample review is still pending.
- Translations are **Hafs-only** until a reviewed Warsh correspondence map exists. This implementation rejects a Warsh translation descriptor instead of aligning equal verse numbers.
- Audio fixtures use only the six already acquired, hash-pinned MP3Quran chapter samples from phase 1. Recording identity/listening/redistribution approval remains RQ-031. King Fahd remains the first intended source to evaluate, then Al-Mohammadi where suitable recordings are unavailable. This PR does not replace that acquisition decision or publish the MP3Quran samples.

## Publication handoff

Before adding runtime descriptors, close RQ-016–RQ-019/RQ-026/RQ-031/RQ-047 for the exact versions, host immutable files over HTTPS, retain original notices, validate all 114 chapter assets against the locked source and retain source-to-render review. Text packs require their exact font asset; translation descriptors name the exact text version and numbering scheme; audio chapters are separately installable packs so a failure in one chapter does not disable another.

Metadata-only surah discovery is generated from the already locked Tanzil metadata, with Warsh counts from the independently validated King Fahd archive. Neither Quran text nor derived search strings are embedded in the release bundle. Existing core devotional content is unchanged.

The current text adapter displays only the exact source verse records; it does not invent unnumbered basmala headings. Source-provided chapter-opening material, especially the separate Warsh Al-Fatiha basmala presentation, still needs a reviewed policy/artifact before publication. The private captures establish technical preservation and rendering, not an approved complete mushaf presentation.
