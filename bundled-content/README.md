# Offline source packs

These three originals are copied byte-for-byte from the pinned Quran catalog sources. Regenerate with `python3 tools/offline-quran/bundle.py` after acquiring the catalog's source files in `.roqia-feasibility`.

- Warsh: King Fahd Complex Uthmanic Warsh v2.1 source archive; provenance and notices in `src/features/quran/catalog.data.json`.
- English: Mohammed Marmaduke Pickthall, Tanzil translation source.
- French: Muhammad Hamidullah, Tanzil translation source.

Translations retain their original footers and the catalog's non-commercial usage restriction. See https://tanzil.net/trans/ and `src/features/quran/translations.data.json`. Source notices are shown in the app. No Arabic or translation content is rewritten.

Android additionally bundles five adhan MP3 resources in `android/app/src/main/res/raw/roqia_adhan_*.mp3`. These have separate [content licenses and attribution](ADHAN-LICENSES.md), also displayed offline in the app. Existing Doha downloads remain compatible; no adhan download is required by the bundled Android choices.
