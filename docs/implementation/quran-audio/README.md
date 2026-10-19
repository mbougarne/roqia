# Quran audio and offline verse timing

Requested 19 October 2026. Branch: `codex/quran-audio-offline-timing`, based on merged PR #18 (`0161a28`).

## Behavior

The reader's whole-surah listening action opens the surah player directly. Existing audio links and library entry points use the same flow. Single-ayah actions play in the reader, in both continuous reading and verse cards, with pause/replay available in the existing mini player. Missing audio or timings open a preparation sheet over the reader, reusing the same reciter selection, downloader and timing checks. The sheet closes after successful playback starts; dismissing it or leaving the reader cancels pending automatic playback. An authorized download may continue. Audio download progress no longer reloads the reader text or changes its position.

Reciter selection is constrained by the reader's riwaya. The whole-surah player includes surah selection, missing-recording states, download progress, pause/resume/cancel/retry and playback after the complete file is installed. Download and storage management remain available separately. iPhone work is deferred until Android is complete.

The offline reciter snapshot contains every recording returned by the official Arabic Hafs and Warsh catalogs on 19 October: 221 Hafs recording choices from 219 reciters, and 13 Warsh recordings. The timing catalog matches 98 Hafs and five Warsh recordings. Availability is displayed before selection. The bundled snapshot is refreshed explicitly with `tools/quran-audio/update-catalog.py`; the app does not claim it updates automatically.

Per-verse listening uses the complete local surah file and a validated local timing sidecar. Verse actions never call the timing API. Before enqueuing audio, download preparation obtains/caches recording-level and surah-level timing coverage and the selected surah's raw timing source. That source is not playable until it is bound to the completed file's verified hash and measured duration. Binding can finish locally after the player is closed or the app restarts, without another network request. A timing-source network failure does not block whole-surah download. Existing audio can acquire its sidecar from the whole-surah player or an explicit retry. An unavailable or invalid timing set offers whole-surah listening and an explicit choice of another timed reciter of the same riwaya. The app never silently substitutes a recording.

Android uses a pinned Track Player/Media3 patch with a native `ClippingMediaSource`. The source starts and ends at the selected segment; seek, progress, repeat and remote controls are segment-relative. A saved segment restores paused with its original boundaries. Whole-surah playback removes segment clipping and starts with repeat off. iOS segment playback is explicitly unavailable until its native adapter is implemented and verified; whole-surah playback remains available.

## Source and integrity boundary

Official documentation: [catalog](https://www.mp3quran.net/eng/api), [timing](https://www.mp3quran.net/eng/timing-api), and its [OpenAPI schema](https://www.mp3quran.net/api-doc/timing_api_openapi.json).

Timing `read` is the recording/moshaf ID, not the author's ID: Al-Husary's Warsh author is 118 and recording is 120. Start/end fields use milliseconds; optional `ayah=0` is the basmala and does not shift reader numbering. The timing cache binds read, riwaya, numbering scheme, surah, audio version, source URL, the exact local SHA-256 and the download's strong HTTP ETag. Timing preparation checks the current source audio entity; its ETag must match the actual completed download before raw timings become playable. Missing or changed entity validators disable verse playback rather than attaching a new provider timing set to an older local file. Folder URLs and riwaya labels must also match the timing catalog. Hafs and Warsh counts are checked separately. No translation alignment is reused for audio. An unspecified tariq stays unspecified.

The two previously pinned recordings retain their original pack versions and SHA-256 values. Newly selected recordings enter the existing durable downloader lazily. MP3Quran does not publish file checksums: an explicitly scoped publisher-HTTPS intake validates complete length and MP3 signature, computes a local SHA-256 before activation, persists it in the job and checks it again before playback. This protects subsequent local integrity; it is not a publisher checksum or independent listening certification. Intake is restricted to MP3Quran's CDN and numbered audio servers. Metadata is restored before download reconciliation after restart.

The timing API does not supply an immutable audio checksum/version or an explicit numbering-scheme identifier. Exact read/folder matching, the acquired file hash, edition-specific structural validation and measured audio duration are therefore required, alongside sampled listening acceptance. Structurally valid data alone cannot establish that every boundary matches the spoken verse.

The initial audit checked all 114 timing responses for each existing recording. Number coverage matched Warsh's 6214 and Hafs's 6236 verses. Source defects include reversed Hafs intervals for Maryam 98 and Ya-Sin 83, a zero-length Ad-Duha 10, and an Al-Husary Warsh Al-Kawthar final boundary roughly 540 ms beyond the pinned file duration. Invalid sets are quarantined rather than guessed or repaired. Only at EOF, at most 100 ms of MP3 duration rounding is bounded to the actual file end.

## Validation

Automated checks cover source URL restrictions, complete-download hash pinning, persistence of the learned pin, catalog coverage, numbering isolation, invalid intervals, cache reuse/no-network verse reads, segment persistence and paused restoration. The pinned dependency patch applies once, is idempotent and rejects drift. Android review builds use the existing temporary JitPack repository filter; no repository or dependency override is committed.

130 Node tests, TypeScript, formatting and the Android arm64 review build pass. Three Phase 11 Python checks (dependency patch, native sleep logic and font coverage) and the downloader patch check pass. The network-denied sidecar regression confirms local binding after restart without fetching repairs, including refusal to bind a different downloaded ETag. Run the focused new suite with `yarn quran-audio:test`.

Physical Samsung SM_A566B checks passed:

- The reader's whole-surah action opens the player directly; its central control starts an already downloaded surah. Existing audio links resolve to the same flow.
- Warsh and Hafs selectors show their own reciters, partial coverage and timing availability.
- First-time downloads for Al-Koshi, Ibrahim Aldosari and Yassen use the app's downloader and persist complete-file integrity hashes. Al-Koshi and Yassen verse timing caches match their own recording IDs and files. Aldosari remains available for whole-surah listening without timings.
- Al-Husary's Warsh Fatiha verse 1 uses `[13240,18720]` ms. Warsh Baqarah verse 275 seeks to `[11739200,11759600]` ms, over three hours into the existing local recording. The native player stops at the selected segment; displayed positions/durations are segment-relative. Native reported progress can include MP3 frame granularity.
- Closing the player after starting a Yassen download, then selecting a verse, uses the saved recording and timing source. Light and dark player views were inspected. The final entity-validation build was installed in place and smoke-tested again with the matching Al-Husary recording.
- The known invalid Al-Kawthar timing set disables verse playback and offers an explicit whole-surah action; that action plays the complete local recording.

All 25 pre-existing records remain present. After restoring QA preferences, 24 are byte-for-byte identical; the remaining record is automatic prayer renewal. All 207 counter records are unchanged. Original edition, theme, reading and playback preferences are restored. Newly acquired audio and public timing caches remain available for review. Temporary device test helpers were removed. Backups, location data and app-private database copies stay outside the repository.

No gallery, other apps or global settings were used. Device networking was left unchanged: offline behavior is supported by native file playback, cached source binding and the network-denied regression, rather than an airplane-mode claim. This is sampled Android functional/UI verification, not exhaustive listening approval of every recording, whole-app visual acceptance or iOS verification. See [verification.json](verification.json) for the final review APK hash and preservation checks.

| Evidence | Capture |
| --- | --- |
| Direct player, light | [PNG](screenshots/entity-verified-player-final.png) |
| Direct player, dark | [PNG](screenshots/player-dark-final.png) |
| Warsh reciters | [PNG](screenshots/warsh-reciter-selection.png) |
| Hafs reciters | [PNG](screenshots/hafs-reciter-selection.png) |
| Verse end, final entity check | [PNG](screenshots/entity-verified-verse-ended.png) |
| Late Baqarah verse end | [PNG](screenshots/baqarah-275-ended-verified.png) |
| Untimed reciter | [PNG](screenshots/untimed-reciter-downloaded.png) |
| Invalid timing fallback | [PNG](screenshots/invalid-timing-fallback.png) |
| Whole-surah fallback playing | [PNG](screenshots/invalid-timing-whole-surah-playing.png) |
| Return after closing player | [PNG](screenshots/cached-verse-after-player-close.png) |

## In-reader verse playback follow-up

The follow-up passes 133 Node tests, TypeScript, formatting and the Android arm64 review build. New regressions exercise cached verse playback without a player screen or timing request, explicit missing-timing preparation, dismissal while local timing resolution is pending, and cancellation before the native queue is replaced or started. Playback intent is checked again after asynchronous file integrity verification, so a dismissed or superseded reader request cannot start later.

Samsung checks cover the continuous floating toolbar, verse-card listening with the reader retained, first-time Al-Qazabri Al-Kawthar download/preparation over the reader, and the existing separate whole-surah player. The preparation sheet handles missing timing locally and offers explicit preparation, whole-surah playback or a timed reciter of the same riwaya. See the follow-up entries in [verification.json](verification.json) for the final build and data-preservation checks.

All 56 records present before this follow-up remain, and all 207 counters are unchanged. After restoring QA preferences, 52 original records are byte-for-byte identical. The four retained changes are automatic prayer renewal, two refreshed public timing-catalog records and Al-Qazabri's expanded recording metadata for the newly downloaded Al-Kawthar. The restored database was checked on the device; the temporary inspection helper was removed. Original reciter, reader mode, settings, position and saved playback preferences are restored.

| Evidence | Capture |
| --- | --- |
| Continuous reader, verse playback | [PNG](screenshots/inline-continuous-final.png) |
| Verse card, verse playback | [PNG](screenshots/inline-verse-card-final.png) |
| Missing audio over reader | [PNG](screenshots/inline-missing-audio.png) |
| Download progress over reader | [PNG](screenshots/inline-download-progress.png) |
| Missing/invalid timing over reader | [PNG](screenshots/inline-timing-fallback.png) |
