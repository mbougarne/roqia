# Phase 9 — French and English Hafs translations

Branch: `phase_9/hafs-translations`. Ticket: [RQ-026](../../../design/roqia-v2/implementation/tickets/RQ-026.md). Android testing first; iOS remains deferred. This phase implements translation delivery; whole-app screenshot parity remains in the later visual queue.

## Delivery and sources

The normal app offers two optional, independently removable/downloadable translation packs:

| Language | Translator credited by source | Tanzil ID | Original size | Source update |
| --- | --- | --- | --- | --- |
| French | Muhammad Hamidullah | `fr.hamidullah` | 948096 bytes | 18 July 2011 |
| English | Mohammed Marmaduke William Pickthall | `en.pickthall` | 864918 bytes | 4 September 2010 |

[Tanzil's translation page](https://tanzil.net/trans/) was checked on 18 October 2026. It allows non-commercial use of the listed translations, requires permission for other use, and restricts republication of its translation listing. Roqia is free, ad-free and non-commercial. We use only these two selected original downloads, retain attribution/source notices and link to Tanzil; we do not republish its listing or a translation corpus. This is separate from Tanzil's Arabic text licence. English is Pickthall, not the unconfirmed “The Clear Quran” mockup candidate. Tanzil itself does not guarantee translation accuracy; no qualified editorial certification is claimed here.

Original URLs, byte lengths and SHA-256 are pinned in [the acquisition lock](../../../tools/phase4/translations.lock.json). The normal app downloads directly from Tanzil over HTTPS; no backend or new corpus mirror is needed. A changed or unavailable upstream file cannot silently replace a pinned version. Existing verified offline files continue working. Future source updates require a new pack version and regenerated/validated metadata.

`translations.data.json` contains metadata and notices only. The app verifies the original, checks its exact footer and ordered 6236 Hafs records, then writes 114 chapter containers. All 114 expected derived sizes and hashes must pass before activation. Every source translation string is preserved, including accents, punctuation and whitespace. The original remains in private storage with its footer. Each language occupies its own pack; nothing is downloaded merely by choosing Hafs.

## Reading and boundaries

From a Hafs reader, open **الترجمات**, download French or English, return and select the installed language. **دون ترجمة** hides it. Text appears LTR below each Arabic verse; translation names and Tanzil attribution are visible, and source notices are available under **معلومات الترجمة**. The chosen language is persisted per edition. Arabic text/font files are unchanged.

The descriptor, importer and reader bind translation ID, Hafs edition, numbering, source text version, surah and complete verse order. Warsh does not accept these descriptors or join numerically equal ayah IDs. It shows an explicit unavailable state. Missing/corrupt selected translations leave Arabic reading available, with an action to manage/redownload the translation. Storage deletion retains the saved choice and personal reading data, so reinstalling the same pack restores that choice.

## Reproduce

```sh
python3 tools/phase4/acquire-translations.py --out .roqia-feasibility/translations
python3 tools/phase9/catalog.py --check
node tools/phase9/verify-source.cjs
node --test tools/foundation/*.test.cjs tools/phase3/*.test.cjs tools/phase4/*.test.cjs tools/phase5/*.test.cjs tools/phase6/*.test.cjs tools/phase8/*.test.cjs tools/phase9/*.test.cjs
./node_modules/.bin/tsc --noEmit
cd android
ANDROID_HOME="$HOME/Library/Android/sdk" JAVA_HOME="$HOME/.sdkman/candidates/java/current" ./gradlew :app:assembleReview -PreactNativeArchitectures=arm64-v8a
```

`tools/phase9/android-translations.py` drives the normal app on **emulator-5554 only** using the phase 6 hierarchy helper. Back up app data first. Run sections `download`, `capture`, `recovery`, `corrupt` in that order with `--output <directory>`. The capture section disables network temporarily and restores it; the recovery section deletes only the newly downloaded French pack through Storage and downloads it again. The corruption section changes one byte in the new French chapter file, confirms rejection while Arabic stays visible, then restores the original bytes in a `finally` block. The Android review variant bundles production JavaScript, with no fixture catalog or Metro dependency. Do not uninstall/clear existing app data.

## Validation

Android 16 / API 36 arm64 (`emulator-5554`) passed real French/English downloads, cold restart in each language with Wi-Fi/data off, None selection, both themes, Warsh unavailability, selective French deletion/re-download and same-size file corruption rejection. All 230 installed translation files (2 originals + 228 chapters) match their expected hashes. No fixture catalog or local source server was used.

The in-place upgrade preserved 207 counter rows, 1 bookmark, 3 reminders, prayer preferences/selected sounds, app settings (apart from the expected write timestamp), and all 239 pre-existing content files byte-for-byte. Existing reader settings remain unchanged except the intentionally selected French translation. Both saved reading-position identities remain; positions may reflect test navigation. No app data was cleared. The emulator retains both new translation packs, French selected, its original dark theme and network enabled.

TypeScript, Android build and 71 automated tests passed. [Source validation](evidence/source-validation.json), [installed-file/data preservation](evidence/android-integrity.json), [validation/build identity](evidence/validation.json), [test log](evidence/tests.log) and [individual screenshots](SCREENSHOTS.md) are recorded. Structural checks prove exact source preservation and alignment, not a qualified judgement on translation wording. Full TalkBack listening, physical/older Android coverage and iOS verification remain separate acceptance work. The user's deferred exhaustive Quran reading review is not reinstated as a download gate.

Next functional pickup: **RQ-020 → RQ-021**, download recovery/network policy; then follow the remaining functional queue before the all-screen visual pass.
