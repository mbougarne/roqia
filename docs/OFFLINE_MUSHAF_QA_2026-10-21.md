# Included offline mushafs

## Behavior

Both iPhone and Android now include the original King Fahd Complex Warsh and Hafs packages, including their paired fonts. The first launch verifies and prepares them locally; reading requires no text download or network consent. Only audio uses on-demand network downloads; existing optional translations and their controls remain available.

The separate mushaf-download screen and route are removed. Edition selection returns to the library, retaining source information and translation controls. Reading positions, bookmarks and preferences remain independent. Storage shows included mushafs as read-only; audio, optional translations and obsolete versions remain removable. A previously removed or incomplete included mushaf is restored locally on startup.

## Size and provenance

The unchanged Hafs archive adds 10,729,285 bytes to bundled assets. Warsh and the two translations were already included. Both platform projects already include the shared asset directory. No source string or original font is edited; hashes, byte counts, paired fonts and original license notices remain pinned. See [bundled sources](../bundled-content/README.md).

## Validation

- 189 regression checks pass, including source integrity, no-network bundled installation, old-removal recovery, missing-file recovery, text deletion protection and selection without a download step.
- Project quality checks pass. Both originals match every expected chapter hash, with 6,214 Warsh ayahs and 6,236 Hafs ayahs; the separate 30-juz/60-hizb boundaries remain verified per riwaya.
- The portable Java source importer passes archive safety checks and all three original basmala prefixes, including both complete original Word documents. This does not establish Android device acceptance.
- A fresh isolated iPhone simulator imported both originals locally: four ready built-in jobs, zero network-task IDs and zero download attempts. All 238 mushaf files match their pinned hashes. This is local-import evidence; the simulator's network connection was not disabled.
- Visually checked Warsh Al-Fatihah and Hafs An-Nisa with their original fonts, single verse markers and separate openings. Selection returns directly to the library, and storage shows both mushafs as included nonselectable text while translations remain removable. The final Release build launches successfully after an in-place simulator update.
- The signed update is installed in place on the owner's iPhone 15. Post-install database checks preserve all 207 counters, nine bookmarks, three reminders, preferences, existing downloads and timing records. Owner confirmation with Wi-Fi/mobile data disabled is pending.

Android device testing and store updates are intentionally deferred until after the iPhone submission. No App Store binary upload or review resubmission is part of this change.
