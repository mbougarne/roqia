# User-provided adhan recordings

The chooser includes the five MP3 files supplied by the user, labelled **الأذان الأول**, **الأذان الثاني**, **الأذان الثالث**, **الأذان الرابع**, and **الأذان الخامس**. The five originals are unchanged. **أذان قصير** is a separate 15-second MP3 derived from Adhan-05, from 00:00 to 00:15, without fades or normalization. No location or performer claims are added.

The rejected recordings are removed from Android resources and the download catalog. The information disclosures, source/rights links and their delayed-test controls are removed. Selection and play/stop controls remain, with independent **الفجر** and **باقي الصلوات** choices from the same six recordings. The reference selector hierarchy was inspected; full design parity is not claimed. This replacement awaits user review; the other polish items are accepted.

## Playback and saved data

All six options are included in the APK. The existing native preparation path verifies size and SHA-256 before atomically creating the private playback file; previews and scheduled prayer alarms use this same file. Selecting or previewing a recording does not enable prayer alerts. Preparation failure leaves the previous saved choice intact and unavailable selected audio uses the existing notification fallback.

A saved choice referring to a removed recording is deliberately unavailable until the user selects one of the new recordings. The chooser prompts for a selection; the app does not silently substitute another recording. Original prayer modes, saved data and legacy downloaded files are not deleted. Those old recordings are no longer offered by the product. The phase-8 source audit uses a historical fixture, and its acquisition script cannot overwrite the new product catalog.

## Verification

The five packaged originals match the supplied source bytes exactly. The short output decodes to exactly 240,000 mono samples at 16 kHz (15 seconds); correlation against the source's first 15 seconds is 0.997957, accounting for MP3 re-encoding. Its pinned duration is 15.000 seconds. The packaging script reproduces all six pinned outputs without network access.

All 146 Node tests, TypeScript, changed-file formatting, diff checks and the Android arm64 review build pass. Asset tests reject leftover old recordings, verify original/output hashes and the short recipe, and cover independent selection, missing audio fallback and selection preservation on failure. The prayer service test verifies routing using the new bundled recordings.

On emulator-5554, each of the six choices is selected and previewed; all six private native files match their packaged hashes. The short preview continues after Roqia is backgrounded through Home and naturally completes in 15.120 seconds. Independent short/second selections for other prayers/Fajr persist after restart. Temporarily configured future prayer events route Fajr to the second recording and Isha to the short recording. Both themes are inspected and no information/source/rights controls remain.

After testing, the original 39 record keys and all 207 counter rows are preserved. Original prayer modes, sound-selection records, installed/download records, bookmarks, playback and vibration preference are restored exactly. Only automatic prayer coverage/renewal and the settings write timestamp refresh. No test alarm remains. Old sound IDs remain saved but unavailable, prompting an explicit new selection. The final app is left on the [updated chooser with original preferences restored](screenshots/after-numbered-restored-light.png).

Device verification and preservation results are in [verification.json](verification.json). Screenshots show the [light chooser](screenshots/after-numbered-sounds-light.png), [dark chooser](screenshots/after-numbered-sounds-dark.png), [short option](screenshots/after-numbered-6-light.png), and [Fajr choice](screenshots/after-numbered-fajr-light.png). Source and packaged hashes are in [source-verification.json](source-verification.json).

Only emulator-5554, user 0, name.roqia.app is used. The update is installed in place; the previously authorized temporary emulator install reserve is restored immediately. There is no uninstall, data clear, physical-device use, device-network change or OS font/display change. iOS, physical speaker quality, human content acceptance, TalkBack listening and a new background alarm-start test are not certified. The existing ESLint configuration/version mismatch remains outside scope.

## Reproduction

Run `python3 tools/adhans/acquire-bundled.py` with FFmpeg/libmp3lame available. It verifies the five originals under `src/assets/audio`, copies them unchanged, creates the requested first-15-second clip, and checks every result against `tools/adhans/bundled-sources.json` before replacing a packaged resource. It does not download audio. No private backup, app database or device log is committed.
