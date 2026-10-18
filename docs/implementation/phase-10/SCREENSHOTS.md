# Phase 10 — functional Android captures

Android 16 / API 36, arm64, emulator-5554. Normal review APK with bundled production JavaScript; original dark theme. These captures demonstrate state and recovery, not screenshot parity or user visual acceptance. Each PNG has a same-name fresh hierarchy XML in `captures/`; generated numerals were checked for Western 0–9.

| Capture | Evidence |
| --- | --- |
| [Waiting for permitted network](captures/waiting-wifi-dark.png) | New MP3Quran file remains queued while network is unavailable; per-file consent is explicit. |
| [User pause](captures/paused-user-dark.png) | Separate persisted user intent and continuation control. |
| [Pause after cold reopen/network return](captures/pause-retained-after-reopen-and-network.png) | Returning connectivity does not override a user pause. |
| [Real provider failure](captures/real-provider-failure-retained.png) | Failed cellular-only attempt retains intent and unrelated ready content; retry remains available. |
| [Real MP3Quran file ready](captures/real-audio-ready-dark.png) | Wi-Fi retry installed the pinned 243008-byte Warsh surah 112 file. |
| [Real Tanzil import restored](captures/real-tanzil-restored-dark.png) | Selective English removal/re-download/import; French remains selected. |
| [Offline Hafs/French](captures/existing-hafs-french-offline.png) | Cold-start reading without network after the in-place upgrade. |
| [Offline King Fahd Warsh](captures/existing-warsh-offline.png) | Original Arabic text and matching font remain readable offline. |

The test surah 112 audio was subsequently removed through Storage. Both translation packs and all original content remain installed and hash-verified.
