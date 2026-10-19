# Offline source packs

These three originals are copied byte-for-byte from the pinned Quran catalog sources. Regenerate with `python3 tools/offline-quran/bundle.py` after acquiring the catalog's source files in `.roqia-feasibility`.

- Warsh: King Fahd Complex Uthmanic Warsh v2.1 source archive; provenance and notices in `src/features/quran/catalog.data.json`.
- English: Mohammed Marmaduke Pickthall, Tanzil translation source.
- French: Muhammad Hamidullah, Tanzil translation source.

Translations retain their original footers and the catalog's non-commercial usage restriction. See https://tanzil.net/trans/ and `src/features/quran/translations.data.json`. Source notices are shown in the app. No Arabic or translation content is rewritten.

Android additionally bundles the five user-provided `src/assets/audio/Adhan-01.mp3` through `Adhan-05.mp3` originals and a separate 15-second clip from the start of Adhan-05. The originals are copied byte-for-byte into Android raw resources; no adhan download is required. See `tools/adhans/bundled-sources.json` for pinned source/output hashes and the clip recipe. The app labels the recordings by number without location or performer claims.
