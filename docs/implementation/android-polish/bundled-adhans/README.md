# User-provided adhan recordings

The chooser includes the five MP3 files supplied by the user, labelled **الأذان الأول**, **الأذان الثاني**, **الأذان الثالث**, **الأذان الرابع**, and **الأذان الخامس**. The five originals are unchanged. **أذان قصير** is a separate 15-second MP3 derived from Adhan-05, from 00:00 to 00:15, without fades or normalization. No location or performer claims are added.

The rejected recordings are removed from Android resources and the download catalog. The information disclosures, source/rights links and their delayed-test controls are removed. The page keeps its title, six recording rows with selection and play/stop controls, and the original bottom controls. Only the **الفجر** / **باقي الصلوات** tabs and introductory/prompt/success text are removed from the header. The bottom **إيقاف الأذان** and **إذن المنبهات والتذكيرات** buttons and original volume/DND banner are retained. Choosing an item saves the same verified recording for all prayers, including Fajr. Existing saved choices are preserved until the user makes a new selection; different saved normal/Fajr choices do not display a shared checked row. Errors appear in a dialog only when an operation fails. The reference selector hierarchy was inspected; full design parity is not claimed. This replacement awaits user review; the other polish items are accepted.

## Playback and saved data

All six options are included in the APK. The existing native preparation path verifies size and SHA-256 before atomically creating the private playback file; previews and scheduled prayer alarms use this same file. Selecting or previewing a recording does not enable prayer alerts. Preparation failure leaves the previous saved choice intact and unavailable selected audio uses the existing notification fallback.

A saved choice referring to a removed recording is deliberately unavailable until the user selects one of the new recordings. No row is checked for an unavailable choice; the app does not silently substitute another recording. Original prayer modes, saved data and legacy downloaded files are not deleted. Those old recordings are no longer offered by the product. The phase-8 source audit uses a historical fixture, and its acquisition script cannot overwrite the new product catalog.

## Verification

The five packaged originals match the supplied source bytes exactly. The short output decodes to exactly 240,000 mono samples at 16 kHz (15 seconds); correlation against the source's first 15 seconds is 0.997957, accounting for MP3 re-encoding. Its pinned duration is 15.000 seconds. The packaging script reproduces all six pinned outputs without network access.

The unchanged media/selection implementation retains its 147-test passing baseline. The footer correction passes TypeScript, changed-file formatting, diff checks and the Android arm64 review build. Asset tests reject leftover old recordings, verify original/output hashes and the short recipe, and cover existing per-prayer selection, the new shared selection, missing audio fallback and selection preservation on failure. The prayer service test verifies routing using the new bundled recordings.

The earlier media checks verified all six previews and native cache hashes, natural 15.120-second completion of the short preview after backgrounding through Home, persistence, and future prayer event routing. The audio files and playback implementation are unchanged by the final screen simplification.

The simplified screen is checked in both themes on emulator-5554. All six choices remain available. Selecting a recording saves it for normal and Fajr together; the saved choice survives restart. Preview and stop still work without inserting success text above the list. The header tabs and helper text remain absent. The bottom stop and alarm-permission buttons and volume/DND note are restored in both themes; the bottom stop button is verified against real native playback without inserting a success message in the header.

After testing, the original 39 record keys and all 207 counter rows are preserved. Original prayer modes, sound-selection records, installed/download records, bookmarks, playback and vibration preference are restored exactly. Only automatic prayer coverage/renewal and the settings write timestamp refresh. No test alarm remains. Old sound IDs remain saved but unavailable, with no replacement selected automatically. The app is left on the [simplified chooser with original preferences restored](screenshots/after-list-restored-light.png).

Current device results are in [verification.json](verification.json), with earlier unchanged-media checks retained separately as the baseline. Screenshots show the [light chooser](screenshots/after-list-light.png), [dark chooser](screenshots/after-list-dark.png), and [restored bottom controls](screenshots/after-list-short-light.png) and [dark footer](screenshots/after-footer-dark.png). Source and packaged hashes are in [source-verification.json](source-verification.json).

Only emulator-5554, user 0, name.roqia.app is used. The update is installed in place; the previously authorized temporary emulator install reserve is restored immediately. There is no uninstall, data clear, physical-device use, device-network change or OS font/display change. iOS, physical speaker quality, human content acceptance, TalkBack listening and a new background alarm-start test are not certified. The existing ESLint configuration/version mismatch remains outside scope.

## Reproduction

Run `python3 tools/adhans/acquire-bundled.py` with FFmpeg/libmp3lame available. It verifies the five originals under `src/assets/audio`, copies them unchanged, creates the requested first-15-second clip, and checks every result against `tools/adhans/bundled-sources.json` before replacing a packaged resource. It does not download audio. No private backup, app database or device log is committed.
