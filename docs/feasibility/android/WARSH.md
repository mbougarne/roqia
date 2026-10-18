# King Fahd Warsh source and Android font decision

Checked 2026-10-18. The user selected the King Fahd package in place of Al-Mushaf Al-Mohammadi. Hafs stays on Tanzil. This is acquisition and rendering evidence, not authorization to publish a reviewed Quran pack.

## Selected artifact and provenance

- Publisher: King Fahd Glorious Quran Printing Complex (KFGQPC).
- Edition key: `warsh-kfgqpc-v2.1-update6`; narration Warsh from Nafi. Keep `tariq: null` until the exact artifact supplies reviewed evidence; do not inherit Al-Azraq from an old mockup or a different recording.
- Package: `UthmanicWarsh_v2-1.zip`; internal README says version 2.1, update 6.0, updated 2022-09-07. These are separate fields, not a claim that 6.0 is the font version or that this is the latest available release.
- [Publisher developer page](https://qurancomplex.gov.sa/en/techquran/dev/); [publisher artifact](https://download.qurancomplex.gov.sa/resources_dev/UthmanicWarsh_v2-1.zip).
- Retrieved from the [unofficial byte-preserving mirror](https://cdn.quran.ws/KFGQPC/resources/quran-dev/uthmanic-warsh/UthmanicWarsh_v2-1.zip), described by the [archive](https://github.com/quran-ws/kfgqpc-resources). Direct publisher-page/download requests timed out in this environment. The indexed **publisher page**, independently of the mirror, lists the Warsh package size, 2022-09-07 update and matching MD5/SHA-1. This corroborates publisher origin; it is not a fresh direct-origin retrieval or a publisher signature verification.
- Size: 9,042,379 bytes. MD5 `4701e8bbf053098220cf2cf4cda206a1`; SHA-1 `44ecea8feb23817fdc01a8ee2162a6a0cf08cae7`; locally pinned SHA-256 `d847a7e7002dfbed5d28db6684fd1d9c3d50b8bb63ad64cb38a46b9dad788b47`. MD5/SHA-1 are historical publisher corroboration, not the runtime integrity algorithm.

The ZIP includes the source font, full Quran Word/PDF documents, README, and CSV/JSON/XML/SQL/HTML/TXT/XLSX developer files. JSON and CSV agree on all fields of all **6,214 unique ordered verse records across 114 surahs**. Every text field is nonempty. The importer compares them without normalization or digit/marker replacement. Per-surah counts and member hashes are recorded in [warsh-validation.json](evidence/warsh-validation.json). Use source-specific numbering key `kfgqpc-warsh-v2.1`; do not impose Hafs's 6,236 records or assume translation/audio locators align.

We do **not** adopt the separate Quran.ws v3.0 derived dataset. Its live `/editions` metadata reports no recorded original download URL for that newer text package. The selected v2.1 archive has independently corroborated publisher checksums and includes its actual source files.

## Redistribution findings and limits

| Material | Evidence | Decision |
| --- | --- | --- |
| Matching KFGQPC font | The actual TTF's name-table record 13 contains an EULA granting free use, copying and distribution. It prohibits selling/modifying/altering the font and lists other restrictions; it disclaims warranties. Record 0 also contains a restrictive copyright/reproduction notice. Both exact name-table strings are preserved in the JSON evidence; [the readable extracted notice](evidence/kfgqpc-warsh-font-notice.txt) normalizes line endings only. | Use the original font unchanged, retain all embedded notices and carry the EULA alongside it. Do not subset, rename internally, edit glyphs, or relicense it as MIT/OFL. This is a specific font grant, not an unconditional open-source license. |
| Structured Quran data and repackaging | The publisher developer page supplies the data and identifies its fields and matching font. The ZIP README documents the intended developer formats, but contains no separate data-redistribution license. | Acquisition and local feasibility are supported. **An explicit primary-source basis for redistributing our derived downloadable text pack has not yet been established.** Do not extend the font EULA to the dataset. Keep publication gated in RQ-018/RQ-019. |
| General digital-mushaf rights statement | Third-party projects reproduce a broad KFGQPC digital-use statement. The linked [publisher copyright page](https://dm.qurancomplex.gov.sa/copyright-2/) was inaccessible during this check. | Record as a lead, not verified terms for this particular developer package. A retrievable primary statement or archived publisher statement demonstrably covering these files can close the gap; contacting the publisher is not a required workflow. |
| AL Maghribi | Downloaded from the user's [official-host URL](https://almoshaf-almohammadi.ma/fonts/AALMAGHRIBI/AALMAGHRIBI_v4.9.6.otf). Its name table identifies its maker/Foundation, but contains no distribution-license field. | Evaluation only. Not selected for this pack, because it fails compatibility independently of the remaining terms question. |

The application being free is not the evidence for these findings; the concrete notices and their scope are. No font/corpus binary is committed or published by this PR. Attribution should name the actual publisher and version, without claiming endorsement or certification of Roqia.

## Android result: use the matching font

Device: existing `emulator-5554`, Android 16 / API 36, arm64, React Native 0.84.1. The app was updated in place, without uninstalling or clearing app data. Both fonts were loaded from app-private test files and registered through React Native's font manager. The comparison screen displays **identical canonical strings** under each font.

| Check | KFGQPC `uthmanic_warsh_v21.ttf` | AL Maghribi `AALMAGHRIBI_v4.9.6.otf` |
| --- | --- | --- |
| Source character coverage | All 351 codepoints covered | 201 of 351 codepoints absent, including non-breaking space, recitation/section marks and many verse markers |
| Native shaping across 6,214 complete verse strings | 0 fallback glyphs; 0 glyph-ID-zero results | 43,693 fallback glyphs across all 6,214 verses; 0 glyph-ID-zero results |
| Rendered samples | Verse ornaments display as expected in the inspected samples | Verse ornaments become unrelated letter-like forms; fallback hides the failure instead of showing missing-character boxes |
| Selected | Baseline font, pending qualified review | Rejected as a drop-in replacement for this exact dataset |

Evidence: [native report](evidence/warsh-font-android.json), [light](evidence/fonts/light.png), [dark](evidence/fonts/dark.png), [enlarged text](evidence/fonts/light-large.png), [mark samples](evidence/fonts/dark-marks.png). These are actual emulator captures, not mockups. Light/dark samples use 26sp text; the enlarged case uses 36sp, with extra line spacing and font padding. System font scale is recorded with the runs. The native full-corpus check uses [TextRunShaper](https://developer.android.com/reference/android/graphics/text/TextRunShaper) and [PositionedGlyphs](https://developer.android.com/reference/android/graphics/text/PositionedGlyphs) to identify the actual font used for each glyph. Coverage alone, `Paint.hasGlyph`, and absence of tofu boxes would not establish correct rendering.

**Why the publisher still matters technically:** Warsh identifies the recitation tradition; the digital edition also specifies encoding, orthography/marks, numbering and font conventions. This version stores verse ornaments at U+FC00–U+FD1C. Generic Unicode or another font can interpret those codes as Arabic ligatures. A font switch does not convert that representation. No conclusion is made that Warsh belongs to one country or publisher.

Western `0–9` remain separate UI locators/badges and counters. Preserve the original embedded source ornaments, including their numerals. A reader with only Western inline markers would require a separately reviewed presentation mapping; do not delete or rewrite canonical source characters to achieve it. Likewise, a Maghribi-style alternative requires proved codepoint/glyph semantics and reviewed rendering, not only overlapping character coverage.

## Implementation handoff

1. **RQ-016:** acquisition is no longer blocked by Al-Mohammadi API access. Use the locked KFGQPC artifact and matching font; finish source-specific numbering/tariq documentation and qualified sample review. Do not claim the entire ticket complete from mechanical tests.
2. **RQ-017:** continue the existing Tanzil Hafs work unchanged.
3. **RQ-018:** validate a production Warsh pack against the independent source lock, carry the actual source notice/EULA, resolve the data redistribution evidence above, and obtain qualified review of exact rendered passages and a documented basmala/marker policy. Expand device coverage below API 31 and to physical Android devices; the glyph-font diagnostic itself needs API 31+.
4. **RQ-019:** publish immutable text + matching-font files only after the source/content/render gates pass. The current script prepares local debug fixtures, **not** a production pack/catalog export. Add a Warsh packaging command and source-aware catalog mapping here before publication; do not pass Warsh data through the existing Hafs-only catalog exporter.
5. **RQ-024 / RQ-026:** implement source-aware reflow, locators and derived search. Keep translation correspondence and audio timing unavailable until separately verified. A missing source font must show an actionable missing-pack state, never silently fall back to another Arabic font.

The existing concept PNGs still contain old publisher labels. Current copy, screen briefs, source register and this decision supersede those labels; no mockup text is canonical Quran data.

## Change validation

- Android arm64 debug build passed with JDK 21; the debug APK was installed in place on the existing API 36 emulator.
- 21 dedicated feasibility tests passed (14 Python, 7 Node), including four new source-preservation/structure regression tests. See [test output](evidence/tests.txt).
- Locked acquisition verifies all four source artifacts; draft catalog schema validation and changed Markdown-link/JSON checks passed. All catalog entries remain draft.
- A production Android JavaScript bundle built successfully and contains no font-comparison/debug-lab identifiers. Native font probe code lives only in the debug source set; no new release font files or runtime dependencies were added.
- Full TypeScript still reports the same two baseline errors (App-test React element types and `module` in audioPlaybackService); neither is introduced by this change. Existing app-wide Jest/lint baseline failures remain as documented in the Android report.
- Temporary font/corpus fixtures were removed from the emulator after captures; normal app activity restored.
