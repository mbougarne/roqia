# iOS development and release validation

The iOS app uses the same Arabic content, database, screens and navigation as Android. Its bundle identifier is `name.roqia.app`; the registered React component is `roqia`.

## Local setup

Use a Node version supported by the installed React Native package (the recovery was verified with Node 24), CocoaPods 1.16.2, and Xcode. The app and its native dependencies require iOS 15.1 or newer. Open `ios/app.xcworkspace`, including its Pods project.

From a shell where `node` and a working CocoaPods installation are on `PATH`:

```sh
yarn install --frozen-lockfile
cd ios
pod install --no-repo-update
```

On this Mac, `/opt/homebrew/bin/pod` uses the working Homebrew Ruby installation. The separate `/usr/local/bin/pod` uses an older system Ruby installation and can fail before reading the project.

Xcode reads `ios/.xcode.env` and then the ignored `ios/.xcode.env.local`. The local file must point to an existing Node executable. A blank `NODE_BINARY` or a path from a removed Node version breaks Hermes and React Native build phases. If necessary, update that local file to the path returned by `command -v node`; preserve any other local settings.

Commit `ios/Podfile.lock`. Use `pod install`, rather than updating dependencies as part of an unrelated build. The Podfile raises older dependency and resource-bundle deployment targets to React Native's minimum because Xcode 27 rejects targets below iOS 15.

The existing `postinstall` also applies `tools/ios/patch-downloader.py` to downloader 4.6.3. Its pinned iOS patch carries each file's cellular permission on the URL request, including retries. The app avoids the library's global session setters on iOS because those setters cancel and recreate an active background session. The coordinator already limits concurrent jobs. The patch verifies its input/output hashes and fails on dependency drift.

## Standalone simulator run

Find an available iPhone simulator:

```sh
xcrun simctl list devices available
```

Then target its UUID explicitly:

```sh
yarn ios:simulator --udid <IPHONE_SIMULATOR_UUID>
```

This command builds Release with local ad-hoc signing, installs in place, and launches the app. It does not require Metro and never uninstalls or clears app data. It accepts only an available iPhone simulator, not a physical-device identifier. Build output goes to a checkout-specific temporary directory; `ROQIA_IOS_DERIVED_DATA` can select another build directory. Signing is necessary even on the simulator: the background URL-session service rejects an unsigned app because it cannot establish the app's bundle identity.

Xcode 27 moved the simulator UI into Device Hub. The pinned React Native CLI's `run-ios` command still opens the older `Simulator.app` path. The standalone command supports both locations. Select the named simulator in Device Hub if it opens on another device.

## Debug and native tests

For Debug development, start Metro from this repository with `yarn start`, then run the `app` scheme in `ios/app.xcworkspace` on the chosen simulator. Debug uses Metro; Release loads the embedded `main.jsbundle` and bundled media.

Run the native tests on an explicitly chosen simulator:

```sh
xcodebuild -workspace ios/app.xcworkspace -scheme app \
  -configuration Release \
  -destination 'platform=iOS Simulator,id=<IPHONE_SIMULATOR_UUID>' \
  CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- \
  -collect-test-diagnostics never test
```

The native tests exercise the original Warsh source archive, all 114 surahs' font coverage and opening verses, repeated loading of the bundled legacy UI font, rejection of altered sources and paths outside private content, native audio-duration reading, and bounded verse export/reuse/range rejection. New Hafs rendering is checked separately with its bundled original pack. The test bundle includes the original audio fixture so Debug tests do not depend on Metro's asset layout. The hosted test target inherits dependency search paths; the app links the native libraries. Tests use a unique temporary directory inside the test app and remove only that directory.

## Native integration

- `RoqiaSceneDelegate` retains the React Native factory and its dependency provider, creates the scene window, selects the Debug/Release bundle, and forwards warm and cold links. Scene-based startup is required when running apps built with the latest SDK on iOS 27.
- `AppDelegate` retains application launch options and forwards background URL-session completion to the downloader.
- `RoqiaReader` verifies and imports named archive members, extracts source opening verses, registers the original font, rejects fallback font runs, and manages the reading screen's idle timer. When the font is already bundled, its registered file must match the pinned hash before reuse.
- `RoqiaPrayer` requests foreground location only after the user chooses that action. It exposes true-heading readings when authorized hardware is available. The simulator has no compass, so the existing static direction display remains the expected fallback. The adapter does not reverse-geocode coordinates through an external service.
- `RoqiaAudio` reads duration from a private downloaded recording and prepares native, bounded M4A verse files from its verified timing ranges. Track Player handles foreground/background playback and seeks within the exported verse, including when JavaScript is suspended. These derived files live in the OS-purgeable cache; the original recording remains unchanged.
- iOS downloads acknowledge background-session completion after verification and journal persistence. Source import still verifies every expected output before marking a pack ready.

Full adhan background playback and the native sleep timer retain their existing platform capability checks. Their Android implementations are not evidence that these features are supported on iOS. Verify the visible iOS fallback and describe platform limits accurately in store materials.

## Bundled Quran sources

Both platforms use the shared `catalog.ts`: Hafs uses King Fahd Glorious Quran Printing Complex's UthmanicHafs v2.0, update 13.0, with its original paired Quran font. Warsh uses the unchanged Complex v2.1 archive. Both archives ship in `bundled-content/roqia-offline` and are verified/prepared locally on first launch, without network access. The old Tanzil descriptor remains in `legacy-hafs.data.json` for saved-reference and translation compatibility; it is no longer offered as a separate mushaf. Android physical-device validation of this source upgrade is deferred until after the iPhone submission.

The bundled archive was acquired from the same quran.ws mirror used for Warsh. Its MD5 `cf6841aea5b1d1fd70d032b43ff08278` and SHA-1 `36ea5ab0d7ea1702f17ff43f9b50924cccd77ebf` match the [Complex's developer page](https://qurancomplex.gov.sa/en/techquran/dev/); the exact archive's SHA-256, byte count and publisher provenance are pinned in `tools/feasibility/sources.lock.json`. No font editing or Quran string normalization is performed. The original font license permits free use/copy/distribution and prohibits font modification/sale; its complete notice travels with the pack.

`python3 tools/phase5/catalog.py --check` validates the locked originals, JSON/CSV agreement, counts, source openings and all generated chapter descriptors. Hafs has 6,236 verses: Al-Fatihah includes its basmala as verse 1, At-Tawbah has no opening, and 112 other openings are preserved verbatim from the original Word document. The source's differing shadda on the openings of At-Tin and Al-Qadr is preserved.

The old Hafs data/files remain intact. Its exact `source-1` resume/bookmark locations map to the new source's matching Madinah verse numbering; reader settings fall back to the old saved settings until changed. Translation originals retain their own source identity and use this explicit Hafs numbering correspondence. Warsh correspondence stays separate.

Both Complex sources contain their own verse-number ornaments. On iPhone the reader displays these original markers once, without adding another card badge or continuous-mode suffix. Continuous verse actions use an in-screen popover on iPhone, avoiding overlapping UIKit modal dismissal/presentation when opening audio or translation sheets. Recheck mini-player dismissal and subsequent reader interaction in both mushafs after changing this flow.

HTTP response field names are handled case-insensitively, including URLSession's `Etag`. For earlier iPhone downloads missing that stored validator, the app first verifies the local recording's pinned SHA-256, then computes its content MD5. Timing recovery succeeds only if that value exactly matches the provider's independently saved strong ETag. The reader waits for this local check before deciding whether preparation is needed, so a cached verse does not briefly show a download sheet. Different entities or invalid ranges remain unplayable as verses; whole-surah playback remains available. Hafs timing sidecars can be reused across the verified text-source change without a new network request.

## Physical iPhone and App Store boundary

The completed fixes and section-navigation checks are recorded in
[the October 21 iPhone QA notes](IOS_QA_2026-10-21.md).

Before installing on a real phone, inspect the existing bundle identifier, signing team and app data. Back up any existing app container that can be accessed, install in place, and never uninstall or clear data. Target the specific iPhone; keep unrelated devices untouched.

A simulator build is not device acceptance. Verify the signed Release app on the real phone for cold launch, actual Arabic rendering, stored Quran files, counters/bookmarks/settings, audio, location/compass availability and notification behavior. Keep private backups and detailed device evidence in ignored local storage.

Before submission, inspect the signed archive, app icon, privacy manifest and App Store Connect metadata, screenshots, support/privacy links, age rating and privacy declarations. Use the intended paid Apple Developer team. Upload and submission remain separate from local build/device verification.

References: [React Native 0.84 integration](https://reactnative.dev/docs/0.84/integration-with-existing-apps), [Apple scene lifecycle requirements](https://developer.apple.com/documentation/uikit/transitioning-to-the-uikit-scene-based-life-cycle), [Apple per-request cellular restrictions](https://developer.apple.com/documentation/foundation/urlrequest/allowscellularaccess).
