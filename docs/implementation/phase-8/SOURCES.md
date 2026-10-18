# Phase 8 audio sources · 18 October 2026

Quran text/font selection is unchanged. These are independently identified **whole-surah recordings**, not verse-synchronized audio. No audio timing or cross-riwaya verse mapping is inferred.

## Quran

King Fahd was evaluated first. Its [audio usage statement](https://qc-dev.qurancomplex.gov.sa/quran-audios/) permits its listed recordings in applications. Its listing contains Hafs and several other riwayas but no Warsh entry; the primary audio pages repeatedly timed out during acquisition. The [Moroccan publisher](https://almoshaf-almohammadi.ma/) client sends an authorization header, but a final direct check of its reciter-list endpoint returned HTTP 200 without credentials. The initial inference that authorization was required was incorrect. A subsequent sample recording request (`surah_number=1&recitant=118`) returned HTTP 403 without credentials. Listing access and recording access are different; no blanket API-authorization claim is made. Its public listing is a candidate for additional recordings; no credentials were copied or reused. This phase retains the complete MP3Quran sets whose file coverage and explicit developer-use terms were verified. This is a curated provider choice, not a claim that Moroccan audio is inaccessible.

Use MP3Quran's public direct MP3 files for this phase:

- **Warsh:** Mahmoud Khalil Al-Hussary, reciter 118, recording 120, rewaya 2; 114 chapters. [Publisher metadata](https://www.mp3quran.net/api/v3/reciters?language=eng&rewaya=2).
- **Hafs:** Ibrahim Al-Akdar, reciter 1, recording 1, rewaya 1; 114 chapters. [Publisher metadata](https://www.mp3quran.net/api/v3/reciters?language=eng&rewaya=1).
- [Publisher permission](https://www.mp3quran.net/ar/privacy), section الحقوق, expressly permits visitors/developers to use material or links. Live page and current selected metadata were checked on 18 October 2026. This is the publisher's permission, not an invented CC/MIT license or a claim of exclusive rights clearance. Attribution and the rights URL travel with every installed pack. No provider analytics are embedded.
- Tariq is not specified by the metadata, so it remains null. Never advertise a guessed tariq or claim verse timing compatibility with the written edition.

All **228 actual files** were acquired from the listed publisher CDN, checked with ffprobe for MP3 decoding metadata and positive duration, and pinned by exact size/SHA-256 in the shipped catalog. See [file verification](audio-verification.json). Files are unchanged. Only metadata enters the APK/repository; the recordings download directly to app-private phone storage on explicit user action. No app backend, account, subscription, ads or bundled full Quran audio.

## Adhan

[Adhan Recordings from Doha, Qatar](https://archive.org/details/adhan.recordings.from.doha.qatar) supplies original, independently labeled Fajr and Dhuhr MP3 recordings, recorded in 2013–2014. The uploader marks the collection with [Public Domain Mark 1.0](https://creativecommons.org/publicdomain/mark/1.0/). This is the source's public-domain assertion, not a new license grant or a guarantee from Roqia. The source does not identify the muezzin; the UI says so, and does not label it Moroccan or Makkah.

Use `Adhan_Doha_Qatar_01_Fajr_Adhan.mp3` only for Fajr and `Adhan_Doha_Qatar_02_Dhuhr_Adhan.mp3` for the other four prayers. Both are unmodified original MP3s with size/hash/duration evidence. No phrases were synthesized, spliced, removed, normalized or appended. The existing unattributed bundled `adan.mp3` is not repurposed or renamed as a new verified source. Full human listening/religious acceptance is not claimed by decoder checks; the user can review both explicit previews.

## Reproduction

`python3 tools/phase8/acquire-audio.py --cache /private/tmp/roqia-phase8/audio` acquires all offered originals, rejects invalid MP3 files, and deterministically emits the two catalogs and verification inventory. Requires curl and ffprobe; uses four concurrent requests and retries transient failures. Cache files are outside the repository. Check current publisher metadata/terms before publishing a new source version; never silently update hashes under a previously distributed version.

## Android platform basis

- [Exact alarms](https://developer.android.com/develop/background-work/services/alarms): user-granted SCHEDULE_EXACT_ALARM; no restricted USE_EXACT_ALARM or full-screen intent.
- [Media foreground service](https://developer.android.com/develop/background-work/services/fgs/service-types): declared mediaPlayback type/permission, ongoing notification with Stop.
- [Audio focus](https://developer.android.com/media/optimize/audio-focus): start foreground service before requesting focus on Android 15+, stop on focus loss; Quran remains paused after an interruption.
- [Boot restrictions](https://developer.android.com/about/versions/15/changes/foreground-service-types): boot only restores future alarms, never starts media playback.
