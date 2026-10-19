# Bundled adhan choices

Requested item 7 keeps the original Doha normal/Fajr choices and adds two regional recordings plus a short spoken reading. All five are included in the Android APK and available without an audio download. Selecting a recording does not enable prayer alerts. Fajr retains its own independent selection.

| Choice                     | Duration    | Provenance and permission                                                                                                                                                   |
| -------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Doha                       | 179 seconds | Existing unchanged MP3; [Internet Archive source](https://archive.org/details/adhan.recordings.from.doha.qatar), uploader's Public Domain Mark 1.0                          |
| Doha Fajr                  | 217 seconds | Existing unchanged Fajr MP3, same collection and permission                                                                                                                 |
| Makkah, field recording    | 199 seconds | Recorded by 3omar Faruq at Masjid al Haram; [source and CC BY 3.0](https://commons.wikimedia.org/wiki/File:Maghrib_Adhan_at_the_Masjid_al_Haram,_Mecca_-_25_Feb,_2012.webm) |
| Shalqar, Kazakhstan        | 155 seconds | Own recording by Esetok at Matey Qoqanuly mosque; [source and CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Adhan_in_Shalqar_mosque.webm)                           |
| Short, fast spoken reading | 27 seconds  | Own reading by Jarih; [source and selected CC BY-SA 3.0](https://commons.wikimedia.org/wiki/File:Adhan_wiki.oga). No regional claim                                         |

Regional names identify the documented recording locations. Recordist credits do not invent a muezzin identity; the regional sources do not identify the performers. The regional recordings retain ambient sound and are not represented as studio recordings.

Makkah uses source seconds 95–294 to omit waiting before the call and trailing ambience while retaining the call's opening and closing. Shalqar's entire audio track and the entire short reading are retained. Those three are extracted/converted to mono MP3; Doha remains byte-for-byte original. The two share-alike audio adaptations retain their respective source licenses. Credits, alterations, original source URLs and license URLs are displayed offline in each information section, with [separate bundled content notices](../../../../bundled-content/ADHAN-LICENSES.md). Primary source/license pages were inspected directly. Automatic transcription supported content/boundary checks but is approximate; it does not certify spoken accuracy or recording quality.

## Playback and integrity

Android prepares a private copy of the selected APK resource, verifying its expected size and SHA-256 before atomically committing it. A damaged owned cache can be recreated from the APK. Preview, future prayer alarms and background playback then use the same existing verified local-file path. No audio URL is requested by the bundled path. Existing Doha pack descriptors/IDs and previously downloaded files remain compatible.

The short option is explicitly labelled as a short spoken reading in the chooser and native playback notification. Prayer controls say “play adhan” rather than promising a full-length recording for every selection. A failure to prepare a selected recording leaves the prior saved choice intact; unavailable audio permits the existing notification fallback. A bundled-only choice is disabled on a platform without the native capability. iOS remains deferred.

The light/dark `44-adhan-sound.png` references were inspected for the selector/preview hierarchy. This change implements bundled audio and source information without claiming full visual parity.

## Verification

| Native review                  | Capture                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Original choices               | [Before](screenshots/before-bundled-sounds-light.png)                                                                     |
| Bundled choices                | [Light](screenshots/after-bundled-sounds-light.png) · [Dark](screenshots/after-bundled-sounds-dark.png)                   |
| Additional regional choices    | [Makkah](screenshots/after-bundled-adhan-makkah-light.png) · [Shalqar](screenshots/after-bundled-adhan-shalqar-light.png) |
| Labelled short reading         | [Short](screenshots/after-bundled-adhan-short-light.png)                                                                  |
| Temporary prayer-routing check | [Routing](screenshots/after-bundled-prayer-routing-light.png)                                                             |

All 145 Node tests, TypeScript, changed-file formatting, diff checks and the Android arm64 review build pass. Tests cover packaged file hashes and source metadata, original Doha bytes, independent normal/Fajr selection without any installed/download record, preparation failure, fallback and disabled-choice semantics. Earlier phase-8 tests retain their original 230-file source audit through the legacy pack descriptors.

The final APK is hash-verified after an in-place update on `emulator-5554`, user 0. Every bundled recording is selected and previewed through the real UI; its local file is checked against the packaged hash. Each recording also starts from a real 10-second native alarm while Roqia is backgrounded. The short reading runs to natural completion and stops automatically. Native future prayer events route Fajr to its Doha Fajr choice and Isha to the selected Makkah choice. An intentionally damaged new Makkah cache is repaired from the APK and hash-verified again. Independent choices persist across restart, and both themes are inspected.

Device networking stays unchanged. Immediate offline availability is established by packaged resources, verified native local-file playback, no new audio download/install records and a resolver that does not read a network or installed-pack source for bundled audio. An airplane-mode run is not claimed. Home is used only to background Roqia; no other app content is inspected. Notification/exact-alarm permissions were already available and are not changed.

After QA, original prayer modes, sound selections, playback and appearance preferences are restored. All 207 original counter rows remain byte-exact. Original installed/download records, bookmarks, reminders and vibration preference remain intact. Native schedules are reconciled from the restored preferences; automatic coverage/renewal and the settings write timestamp may refresh. Private backups and raw app databases stay outside Git. The previously approved temporary emulator install reserve is restored immediately after installation.

There is no uninstall, data clear, physical-device use, OS font/display change or iOS verification. Physical speaker quality, TalkBack listening, incoming-call/Doze/reboot repetition and human audio-content acceptance are not newly certified by this run. Existing ESLint 10/legacy configuration mismatch remains outside scope. Results are in [verification.json](verification.json); source/packaged hashes and encoder version are in [source-verification.json](source-verification.json).

## Reproducing assets

`python3 tools/adhans/acquire-bundled.py --cache /private/tmp/roqia-adhan-sources` retrieves only the pinned sources, verifies source bytes, and reproduces the reviewed resources with FFmpeg/libmp3lame. It refuses changed source or encoder output rather than silently updating the reviewed hashes. The recipe and pinned outputs are in `tools/adhans/bundled-sources.json`. It was run successfully against the acquired sources during this review. No speech model, model files, private backup or source video is included in the application.
