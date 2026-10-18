# Quran content and reading solution

Screens 22–32; tickets RQ-016–RQ-019 and RQ-023–RQ-030. The selected sources remain Al Mushaf Al Mohammadi for Warsh and Tanzil for Hafs. [Source register](../architecture/SOURCES.md) separates verified documentation from acquisition work still required.

## Content acquisition happens before runtime

1. Obtain a specific source artifact and record source URL, retrieval date, edition/revision, riwaya, tariq where supplied, orthography, verse-numbering scheme, attribution text and original hash.
2. Preserve an immutable original. Build a deterministic importer that changes only the storage container, never the canonical Arabic text. Do not OCR, use an LLM to transcribe, infer missing words, or transform Hafs into Warsh.
3. Produce a manifest, chapter metadata, canonical text/page files, font resources where needed, and a separate derived search index. Record exact byte lengths and SHA-256 hashes. An asset key is permanent; its version changes when bytes change.
4. Verify all structural invariants against the source edition: 114 unique surahs, edition-specific verse counts and order, no duplicate/missing IDs, exact text round-trip, basmala handling, sajda/stop marks, font glyph coverage and expected page mapping. Do not use one global verse-count assumption for every edition.
5. Review source-to-render samples with a qualified reader for each edition, including known Warsh/Hafs differences, basmala treatment, dense diacritics, long verses and chapter boundaries. Hashes prove byte integrity, not religious correctness; human review complements mechanical checks.
6. Record the validation report and immutable version in the catalog. Only verified, acquired packs are installable. A maintainer refresh produces a new version and changelog; existing installed packs continue working offline.

Tanzil provides downloadable text and specific preservation/attribution conditions; use its download export rather than copying rendered website text. The French Hamidullah entry is listed in Tanzil's translations catalog. Translation terms and exact files are separate acquisition records. The English “The Clear Quran” label in the mockup is a candidate, not a confirmed Tanzil export or guaranteed distributable pack. RQ-026 resolves the English edition and updates its UI label to the actual source. [Tanzil download](https://tanzil.net/download/), [text conditions](https://tanzil.net/docs/Text_License), [translations](https://tanzil.net/trans/).

Al Mushaf Al Mohammadi's website was reachable, but this planning pass did not establish a documented bulk text export, stable download endpoint, font package or verse API. RQ-016 must produce that artifact evidence. If only approved pages are available, keep their contents intact and declare page-only capabilities. Do not promise text search, dynamic Quran font size, word selection or Western embedded page numerals without a source-supported method. The desired reflowable Warsh reader remains a release gate rather than a fabricated dataset.

## Identity and edition boundaries

Edition identity includes provider, edition, riwaya/tariq, numbering scheme and version. A verse locator is `(editionId, numberingScheme, surahNumber, verseNumber)` with a source record ID when available. A page locator is editionId + pageId + optional normalized viewport offset. Bookmarks preserve edition identity even when the preferred edition changes.

Never join translations to Warsh solely by a Hafs verse number. RQ-026 supplies a reviewed correspondence map if Warsh translations are enabled; otherwise offer French/English with Hafs and explain unavailability on Warsh. A translation expresses meanings and is not displayed as replacement Arabic scripture.

Recitation selection is independent of the written mushaf's publisher but must match the selected riwaya/tariq. Do not swap to a Hafs recording when a Warsh surah is unavailable. Cross-edition “continue reading” should open the original edition or ask to download it, not silently use a similarly numbered verse.

## Runtime behavior

- Library (22): surah list, search, resume, edition picker and downloads. With no installed mushaf, show the choice/download action while the existing devotional core remains usable offline.
- Selection/download (23–24): Warsh is the recommended initial choice for the target audience; Hafs is equally accessible. Show actual pack size/capabilities. Selection alone downloads nothing. Skip returns to the app. Installed editions can be switched without deleting the other.
- Readers (25–27): render canonical text from installed files with the edition font. Western verse badges are separate controls. Chapter boundaries and basmala come from source metadata. Provide read/play/bookmark/settings actions. No ayah highlight synchronized to audio until timing data for that exact recording exists.
- Translations (28): none/French/English from available catalog packs. Download status and source information are visible. Unavailable combinations are explained. Language text renders LTR; Arabic stays RTL.
- Preferences (29): independent scripture size/line spacing, verses/continuous view, translation visibility and keep-awake. Apply only supported options. Keep-awake is active only while a reader is visible and is released on exit/background.
- Search (30): surah search works from local metadata without a Quran text pack. Verse search needs an installed text-capable pack. Normalize a derived index (diacritics, tatweel and defined Arabic variants), store canonical offsets/IDs, and show untouched source text. Highlighting must map to canonical offsets or fall back to a whole-result emphasis.
- Bookmarks (31): save/remove and resume per edition. Missing pack keeps the bookmark and offers re-download. Empty and invalid-locator states are explicit; deletion of a pack never erases progress.
- Sources (32): publisher, edition, translator/reciter, version, attribution and link. Show actual metadata, not “verified” badges based on a successful network response. Reporting a content issue opens a user-controlled email draft with edition/locator/version; never auto-send.

## Pack update and deletion

Installed versions never mutate in place. Download and validate a new version beside the old; activate transactionally. A failed update leaves the old pack usable. On deletion, close/pause dependent reader/audio use, keep personal bookmarks, remove files and then update registry through an idempotent deletion state. On restart reconcile disk and registry. Render a helpful missing-content state rather than an empty reader.

No Quran corpus, translation corpus, Warsh font or audio recording is included in this design kit. The assets supplied here are UI assets only.
