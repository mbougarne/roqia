# One audio experience

Screens 03, 08–14 and 33–38; tickets RQ-031–RQ-035 and relevant devotional tickets. The current home uses Track Player while other reading screens mount react-native-video. Replace these paths with one app-level audio controller after a compatibility spike; do not allow simultaneous players.

## Track and queue identity

A Quran track key includes provider recording-set ID, reciter ID, riwaya/tariq, surah number, quality and recording version. Human names are display data, not keys. MP3Quran's public catalog exposes reciters with moshaf entries and available surah lists; use those records to establish available combinations, then validate the chosen file URLs. Do not infer a Warsh recording from a reciter's name or assume every recording set has all chapters. [MP3Quran developer documentation](https://www.mp3quran.net/ar/api).

Devotional tracks have stable content IDs and existing asset mappings. Flatten audioArray entries explicitly and preserve the selected repeat behavior. Manual reading counters do not decrement because an audio track finished. Starting a new playlist replaces the active queue only after the UI makes that action clear; no hidden second session.

## Player behavior

- One controller initializes the native service once; screens subscribe to current state and do not own playback lifetime.
- Play/pause/stop, previous/next, seek, repeat off/track/queue, speed and sleep timer share the same native state. Unsupported controls are disabled with explanation.
- Local installed audio is the default. A preview may stream only after the user presses preview and has a connection; respect metered-network preference. Offline preview uses installed files. Selecting a reciter does not start a download or playback.
- Queue and mini player persist across navigation; paused playback remains visible. Exiting the app follows verified native behavior and the explicit stop action. Restore position after relaunch but never auto-play merely because state exists.
- Save playback position periodically (proposed 5 seconds), on pause and background, using asset/version identity. Clamp to the actual duration and handle deleted/replaced files.
- Sleep timer stores an absolute deadline and stops through the native controller even when JS is suspended; RQ-032 proves this or records the supported limitation before exposing the feature.
- Remote/lock-screen controls, notification metadata, wired/Bluetooth disconnect, calls, audio-focus loss and errors are part of acceptance. Do not suppress errors with a silent reset.
- Adhan and Quran share an audio-focus policy. Pause Quran before adhan; never play both. After adhan, leave Quran paused for explicit user resume. A call has priority. Do not bypass Do Not Disturb or force system volume.

## Recording integrity and capabilities

Verify reciter, riwaya/tariq, file availability, duration and playback for each published recording set. Calculate actual sizes; mockup values are illustrative. Do not transcode into an invented “high quality” option. A full-mushaf download reports the verified set completeness.

The first release supports whole-surah audio. Verse highlighting, word highlighting, verse-repeat ranges and automatic text follow require timing aligned to the exact edition and recording. They remain deferred capabilities until those artifacts exist; do not interpolate timing from duration.

## Compatibility gate

The repository pins Track Player 5.0.0-alpha0. RQ-032 tests initialization, queue APIs, events, background controls and RN 0.84/new-architecture compatibility. Choose and pin a proven version in that ticket; keep its actual installed API as the implementation reference. If an alternative is necessary, document the reason and adapt the same controller contract rather than introducing another player path.
