# Evidence and source register

Checked 17 October 2026. External documentation can change; pin and verify the actual dependency/source version during its ticket. This research establishes planning inputs, not device or content acceptance.

| Source | Established here | Still required |
| --- | --- | --- |
| [King Fahd developer package](https://qurancomplex.gov.sa/en/techquran/dev/) | User selected Warsh v2.1/update 6 on 18 October. Mirror archive matches publisher-indexed MD5/SHA-1; 114 surahs / 6,214 records validate. Matching-font EULA and Android full-corpus shaping recorded. | [Detailed evidence and remaining text redistribution/qualified-review gates](../../../docs/feasibility/android/WARSH.md). Direct publisher download timed out; no endorsement/latest-version claim. |
| [AL Maghribi font](https://almoshaf-almohammadi.ma/fonts/AALMAGHRIBI/AALMAGHRIBI_v4.9.6.otf) | Official-host binary downloaded and tested locally. Incompatible with this KFGQPC dataset: missing mappings and visible incorrect verse markers. | Evaluation only; do not include it in the selected Warsh pack. |
| [Tanzil downloads](https://tanzil.net/download/) | Official downloadable Quran text entry point | RQ-017: acquire exact export, retain original hash/notice, validate importer |
| [Tanzil text conditions](https://tanzil.net/docs/Text_License) | Verbatim preservation, attribution/link and notice requirements are stated | Record the actual edition's notice in its pack |
| [Tanzil translations](https://tanzil.net/trans/) | French Hamidullah and multiple English translations listed | RQ-026: exact French/English file, edition and source terms; mockup Clear Quran is not a confirmed catalog file |
| [MP3Quran API](https://www.mp3quran.net/ar/api) | Public v3 reciter/riwaya/moshaf/surah catalog documentation | RQ-031: actual IDs, compatible recording sets, files, completeness, sizes and attribution |
| [Adhan JS](https://github.com/batoulapps/adhan-js) | Local prayer calculation library; MIT project | RQ-037: pinned version, Morocco custom profile and local timetable comparisons |
| [Adhan methods](https://github.com/batoulapps/adhan-js/blob/develop/METHODS.md) | Documented method profiles/custom parameters; no Morocco preset seen | Do not invent a Morocco API; record the validated custom profile |
| [Android alarms](https://developer.android.com/develop/background-work/services/alarms) | Exact-alarm and background scheduling requirements | RQ-040/RQ-044: target-device capability/permission matrix |
| [Android foreground service types](https://developer.android.com/develop/background-work/services/fgs/service-types) | Media playback service requirements and boot restrictions | Manifest/service proof; no playback from reboot receiver |
| [Notifee triggers](https://notifee.app/react-native/docs/triggers/) | Trigger API, permission considerations and bounded trigger capacity | RQ-014/RQ-044: real scheduled events and reconciliation |
| [Android position sensors](https://developer.android.com/develop/sensors-and-location/sensors/sensors_position) and [GeomagneticField](https://developer.android.com/reference/android/hardware/GeomagneticField) | Heading/reference frame and declination APIs | RQ-039: real sensors, orientation and known bearings |
| [Background downloader](https://github.com/kesha-antonov/react-native-background-downloader) and [API](https://github.com/kesha-antonov/react-native-background-downloader/blob/main/docs/API.md) | Candidate documents native transfers, resume and reattachment | RQ-020: RN 0.84 compatibility, target Android behavior, Range/entity validation, force-stop limits |
| [OP-SQLite](https://op-engineering.github.io/op-sqlite/) | Candidate local metadata database | RQ-004: pin compatible release, transactions and migration recovery |
| [React Native Text](https://reactnative.dev/docs/text) | Native text props/scaling reference | RQ-002/RQ-015: correct prop forwarding and actual Arabic font rendering |
| [Noto font OFL](https://raw.githubusercontent.com/google/fonts/main/ofl/notosansarabic/OFL.txt) | License copied; existing font name table identifies OFL, v2.004 and variable axes | Verify registered native names/weights; no Quran-font inference |

Current repository evidence: package.json and yarn.lock; src/App.tsx; src/store/index.ts; src/services/{persistence,notifications,audioPlaybackService}.ts; src/hooks/useHomeAudioPlayback.ts; src/screens/{HomeScreen,AdkarScreen,DevotionalListScreen}.tsx; src/components/{StyledText,Header,Section}.tsx; src/data/index.ts; Android build and manifest files. The old technical README is useful context but the current source takes precedence, particularly for audio playback.

Source-choice approval in the conversation is retained. This kit does not assert a new grant, certification or endorsement. Acquisition tickets record actual metadata and capabilities so implementation can use the selected sources correctly.

## Google Play update guidance — checked 18 October 2026

The [v2 release note](../implementation/RELEASE.md#google-play-v2-update) records the distinction between initial production-access testing and updates, based on [Google's testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en) and [update instructions](https://support.google.com/googleplay/android-developer/answer/9859350?hl=en). Account-specific production access remains unverified until checked in Play Console.
