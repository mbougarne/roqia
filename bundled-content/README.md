# Offline source packs

These four originals are copied byte-for-byte from the pinned Quran catalog sources. Regenerate with `python3 tools/offline-quran/bundle.py` after acquiring the catalog's source files in `.roqia-feasibility`.

- Warsh: King Fahd Complex Uthmanic Warsh v2.1 source archive; provenance and notices in `src/features/quran/catalog.data.json`.
- Hafs: King Fahd Complex Uthmanic Hafs v2.0 / update 13 archive (10,729,285 bytes), with its unchanged paired font and license notices; provenance in the same catalog.
- English: Mohammed Marmaduke Pickthall, Tanzil translation source.
- French: Muhammad Hamidullah, Tanzil translation source.

Translations retain their original footers and the catalog's non-commercial usage restriction. See https://tanzil.net/trans/ and `src/features/quran/translations.data.json`. Source notices are shown in the app. No Arabic or translation content is rewritten.

Both iOS and Android package this directory. The first launch verifies and prepares both mushafs locally, without an HTTP request or download consent. The text and paired fonts stay available; storage management lists only user-downloaded packs for removal. Both included mushafs and the English/French translations are protected. Previously removed or incomplete included text and translations are restored locally at startup. Existing bookmarks, reading positions, preferences and audio downloads are preserved.

The Complex's original font license permits free use, copying and distribution and prohibits modification or sale of the font itself. We distribute the original archives unchanged, retain their notices, and load their original paired fonts. Keeping the full original archives avoids repackaging publisher material; installed storage also contains the verified extracted files and chapter cache.

Both Android and iOS additionally bundle the five user-provided `src/assets/audio/Adhan-01.mp3` through `Adhan-05.mp3` originals and a separate 15-second clip from the start of Adhan-05. The originals are copied byte-for-byte into Android raw resources, and Xcode references those same six reviewed MP3 files as iPhone resources; no adhan download is required. See `tools/adhans/bundled-sources.json` for pinned source/output hashes and the clip recipe. The app labels the recordings by number without location or performer claims.
