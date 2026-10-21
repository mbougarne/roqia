# iPhone Quran division index

The app bundles only section coordinates. Quran strings, fonts, source packs,
audio identities and canonical ayah numbers remain unchanged.

## Reference inputs

- Hafs: `src/lists/HafsLists.ts` from [Quran-Center/quran-meta](https://github.com/quran-center/quran-meta/blob/3b7afc7f8c905da3d8fb3e8725f86805bd76b2bd/src/lists/HafsLists.ts), MIT. Hizb starts are every fourth entry of its quarter index, excluding the leading sentinel. The original file hash is pinned in `boundaries.reference.json`; its full license is retained here and in the app's Sources screen.
- Warsh: `data/hizbs.json` from [Nur al-Hifz / Noureddine El-Ahmadi](https://github.com/smartmaker-devs/nuralhifz-data/blob/365910bc8bf6309765156f221c52d1f6c5813cc0/data/hizbs.json), CC BY 4.0. Only whole-ayah start coordinates are extracted. Original data has no partial-ayah hizb starts. Attribution, adaptation notice and license are included in Sources.

Warsh coordinates are independent: do not copy Hafs ordinals or use a constant
offset. For example, juz 2 starts at Hafs 2:142 / Warsh 2:141; juz 4 starts at
Hafs 3:93 / Warsh 3:91. Some circulated Warsh tables attach Hafs-like metadata
to Warsh text; those were rejected during comparison.

## Reproducible verification

With the previously locked original archives in `.roqia-feasibility/sources`:

```sh
python3 tools/quran-navigation/verify.py --check
node --test tools/quran-navigation/*.test.cjs tools/phase4/reader-navigation.test.cjs
```

The verifier checks archive size/SHA-256, JSON/CSV agreement, all 60 section
starts against exact surah/ayah identities, original division ornaments (or
surah openings), ordering, all 30 juz starts and complete coverage. Juz starts
are every other hizb start. Warsh's 30 starts agree with every publisher `jozz`
transition. Hafs has two publisher label discrepancies: `jozz` changes at 3:92
instead of the 3:93 division marker, and 9:94 instead of the 9:93 marker. The
reference index follows the original division marker at those two locations;
the original data is never edited. Any new discrepancy fails verification.

Runtime tests additionally enumerate every verse in all 114 surahs, 30 juz and
60 hizbs for each edition, rejecting gaps, overlap and out-of-range targets.

## Navigation and saved state

iPhone has a compact library with three remembered index tabs. Reader title
and index button open the same in-screen picker; `surah:ayah` supports direct
jumps. The picker avoids overlapping native modals and remains above the
keyboard. Reading settings have one entry in the reader header.

Juz/hizb reading is bounded to the selected unit. Each surah uses the existing
verified reader and verse actions. At a surah boundary, “متابعة الجزء” or
“متابعة الحزب” opens the next surah within that unit. At its final ayah, next
and previous actions move between units. A mid-surah opening never inserts a
basmala. Saved reading positions retain the selected section and canonical
surah/ayah; bookmarks keep their existing canonical identities.

Android retains its existing library and reader flow. This change neither
uploads a binary nor changes a store submission.
