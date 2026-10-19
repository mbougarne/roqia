# Bundled Quran and translations

Owner request, 2026-10-19: postpone visual work and audio-resource work. Make Warsh the offline default and offer the existing French/English translations alongside both editions. This change does not claim visual acceptance of any screen.

## Behavior

- Warsh remains the default when no edition preference exists. Explicit existing Hafs preferences, bookmarks and reading positions are preserved.
- The pinned Warsh ZIP and French Hamidullah/English Pickthall originals ship in the app. On first Quran-service initialization they pass the existing size/hash, preparation, derived-file and durable activation checks. No download or shared-storage permission is required.
- Already-ready installations remain untouched. Explicitly removed bundles stay removed on restart and can be restored locally by choosing them again.
- Translations remain optional to display; both are installed by default. Existing source notices and translators' wording remain unchanged.
- Warsh and Hafs verse boundaries differ. The reader groups complete source verses between shared boundaries, labels both ranges, and displays each group after its last Warsh verse. Fatiha's source basmala is attached to the opening rather than numbered as Warsh verse 1.

## Sources and alignment limits

Bundled originals are byte-identical to the existing reviewed catalog assets, including source footers. French and English originate at https://tanzil.net/trans/ and retain the catalog's non-commercial usage restriction. Warsh originates from the King Fahd Complex source already recorded in the catalog. No Arabic or translation source text is edited.

`tools/offline-quran/bundle.py` regenerates the three packaged originals from the local source cache and checks pinned hashes. `align.py` checks both Arabic originals against catalog hashes and generates the passage map. Comparison-only normalization removes marks and normalizes letter variants; stored/rendered Arabic remains unchanged. Exact matching passages establish common boundaries; intervening whole verses remain grouped. The generator rejects groups over four verses or with normalized similarity below 0.8.

The 6,153 groups cover all 114 chapters and all 6,214 Warsh verses. Tests verify that every one of the 6,236 source translation verses appears once, in order, for each language, including Fatiha's separate opening. This is computational alignment, not a qualified editorial review of differences in readings. The UI explicitly identifies these as Hafs-source translations of meanings that may not convey reading-specific differences.

## Verification

- 104 Node regression tests pass, including nine new bundle/alignment/runtime tests: source hashes, both-language coverage, Fatiha boundary behavior, malformed input, no-network installation, idempotent restart, removal/restoration, corrupted copy, interrupted copy and disk-sync recovery.
- TypeScript and changed-file formatting checks pass.
- Android arm64 review APK builds successfully.
- Physical-device verification is recorded in `verification.json` and the adjacent screenshots. No uninstall or app-data clear is used. App-private backups remain local and are not committed.
- iOS resource wiring is included but unverified. Automatic Warsh import requires the existing native ZIP importer; platforms without that capability skip it rather than failing initialization. Full iOS Warsh import remains an existing limitation.

## Review order after this work

1. Owner reviews offline Quran/translation behavior.
2. Discuss audio download/storage requirements.
3. Resume design comparison screen by screen, starting with splash in both themes; prior broad UI work is not accepted parity.

## Phone results

Samsung SM_A566B: in-place review installation succeeded. Warsh appears as the default and saved on device; both translation selectors show saved offline. English and French Fatiha render with the separate opening, and French Al-Baqarah groups Hafs-source 1–2 beside Warsh 1. All 349 original/derived installed files match catalog size/hash expectations. All seven pre-existing database records remain; only onboarding/guidance completion and the settings update timestamp changed in existing records. Reading checks added edition-scoped preferences and positions.

Phone connectivity was not changed. No-network initialization is covered by transport tests; installed bundled jobs have no native download task. The phone checks demonstrate locally installed/readable content, not an airplane-mode test. No gallery, private album, or other app was opened or interacted with. No new permission was required.
