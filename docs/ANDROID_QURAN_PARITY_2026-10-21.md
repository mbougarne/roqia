# Android Quran navigation parity

The Quran library and reader had restricted the new surah/juz/hizb navigation
to iOS. Android therefore retained the old surah-only screen even when built
from the same main commit.

The library now uses one shared Quran index. Both platforms expose 114 surahs,
30 juz and 60 hizbs for each mushaf. Reader section validation, bounded reading,
continuation across surahs, saved section context, the title/index button and
direct surah:ayah jumps use the same implementation. Android Back dismisses the
keyboard and index before leaving the reader. Keyboard avoidance keeps the
verse-jump field and result above the Android keyboard. Android keeps its existing native verse-options
modal; the iOS modal workaround remains specific to iOS. The shared source page
includes the division-index attribution and licence texts on Android too.

Both offline mushafs, French/English translations, bundled-content protection,
reader source/font handling, and completion styling were already shared. The
remaining platform branches address native presentation, keyboard handling or
audio-cache metadata recovery; they do not hide additional navigation features.

## Verification

- All 200 regression tests pass, including section boundaries, restoration and
  cross-surah continuation for both editions on Android and iOS.
- Repository quality checks pass (lint, formatting, native style and TypeScript).
- Android physical-device validation uses the separate `name.roqia.app.qa`
  application. The Play-signed app and its data remain untouched. This does not
  validate an in-place production upgrade or publish an Android release.

Physical Samsung Galaxy A56 (Android 16) checks confirmed:

- The shared library shows السور، الأجزاء، الأحزاب.
- Hafs juz 2 opens at Al-Baqarah 142; Warsh juz 2 opens at 141.
- Warsh hizb 1 continues from Al-Fatihah into Al-Baqarah while retaining hizb 1.
- Direct `2:255` selection works in both editions and closes the picker.
- The direct-jump result remains visible above the keyboard. Android Back
  dismisses the keyboard, then the index, retaining the reader.
- The QA app is left on the Quran library with the new tabs visible.

Local screenshots, APK, check logs and earlier offline/storage validation are
retained under `.roqia-feasibility/android-storage-20261021/`. These checks do
not establish whole-app acceptance, notification delivery, or store acceptance.
