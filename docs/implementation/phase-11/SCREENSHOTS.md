# Phase 11 functional screenshots

Android 16/API 36, emulator-5554. Original source files/fonts and installed translations remain in use. These captures verify functional flows; whole-app visual matching and approval belong to Phase 12.

| Capture | Function |
| --- | --- |
| [Dark sleep timer](captures/sleep-timer-dark.png) | Normal 15-minute selection and cancellation controls |
| [Light sleep timer](captures/sleep-timer-light.png) | Same native timer in the light theme |
| [Warsh offline](captures/warsh-offline.png) | Original King Fahd text with matching font |
| [Hafs/French offline](captures/hafs-french-offline.png) | Original Tanzil Hafs and installed French translation |
| [Prayer offline](captures/prayer-offline.png) | Cached source-backed dashboard |
| [Qibla offline](captures/qibla-offline.png) | Existing compass/fallback screen; no physical accuracy claim |
| [Renewal coverage](captures/prayer-renewal-coverage.png) | Background renewal disclosure and actual saved horizon |

Fresh UI hierarchy XML is stored beside each PNG. Python runner: `tools/phase11/android-ui.py`; no design approval is inferred from these captures.
