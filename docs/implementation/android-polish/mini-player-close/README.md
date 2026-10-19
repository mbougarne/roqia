# Mini-player close

Requested item 5 adds a close icon to the shared mini-player, with the Arabic accessibility label **إيقاف الصوت وإغلاق المشغل** and a 48 dp target. It remains available for a playing track, a paused track and an error-only bar. The existing title/open action, play/pause control and progress strip remain available.

Close uses the existing serialized stop action: reset the native queue, clear the sleep timer and clear the saved playback session. A restore request captures the current dismissal version before reading storage; stopping invalidates it, including while downloaded-file integrity verification is pending. Explicitly starting another recording still works. Reader segments, source audio, numbering, timing and integrity verification are unchanged.

| State                       | Capture                                                    |
| --------------------------- | ---------------------------------------------------------- |
| Before, light               | [Before](screenshots/before-close-light.png)               |
| Playing, light              | [Close control](screenshots/after-close-playing-light.png) |
| Paused, light               | [Close control](screenshots/after-close-paused-light.png)  |
| Playing, dark               | [Close control](screenshots/after-close-playing-dark.png)  |
| After dismissal and restart | [Empty player](screenshots/after-close-empty-player.png)   |

The light/dark `08-ruqya.png` references were inspected for the existing mini-player composition. This adds the requested close action without claiming screen-wide reference fidelity.

TypeScript, changed-file formatting, diff checks and all 139 Node tests pass, including tests for playing/paused stop, native sleep cancellation, late progress writes and a saved-session read delayed past dismissal. The Android arm64 review build is hash-verified after an in-place update on `emulator-5554`, user 0. Real UI checks cover closing while playing/paused, navigating between tabs and detail screens, dark appearance, cold restart and an on-device null saved session after dismissal. TalkBack listening and iOS remain unverified. Existing ESLint 10/legacy configuration mismatch remains outside this change.

All 207 original counter rows remain byte-exact. Original settings and playback records are restored after QA; bookmarks and the user's vibration preference remain byte-exact. Automatic prayer renewal and the settings write timestamp are the only retained startup changes. Private backups stay outside Git. The previously authorized temporary emulator reserve adjustment is restored immediately after installation. No physical device, other app, uninstall, data clear, device-network toggle or OS display/font setting is used.

Build, UI and data-preservation evidence is in [verification.json](verification.json). Next are persisted digit styles and bundled regional adhans.
