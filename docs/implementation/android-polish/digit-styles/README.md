# Persisted digit styles

Requested item 6 replaces Settings' fixed digit sample with Western `0123456789` and Eastern `٠١٢٣٤٥٦٧٨٩` choices. Western remains the default for existing records without the new field and for fresh installs. The preference is stored in the existing settings transaction; a failed or invalid update leaves the previous saved value in force. Quran reading preferences link to this shared setting and show the selected sample.

A shared formatter hook subscribes to the saved appearance choice, so already mounted screens update immediately. It covers devotional counts and repetition metadata, Quran library/search/bookmark numbers, byte sizes and download progress, sliders, prayer dates/times/countdowns, Qibla bearings, reminder times, playback duration including padded seconds, queue labels and onboarding examples. Numeric inputs display the chosen digits and normalize Eastern/Persian input digits back to ASCII before existing parsing and validation. Numeric Quran chapter search accepts either script.

Only interface values are formatted. Storage values, counters, locators, IDs, URLs, timing calculations, source Quran text, translations and copied canonical devotional content are unchanged. Warsh's embedded font-specific verse markers remain verbatim; Hafs's existing inline marker formatting stays Western independently of the interface choice. Technical identifiers, source/license versions and the literal figure-eight calibration gesture are retained.

## Native captures

The light/dark `47-app-settings.png` references were inspected before editing the setting.

| Check                              | Capture                                                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Original Settings                  | [Before](screenshots/before-digit-settings-light.png)                                                                     |
| Western default                    | [Settings](screenshots/after-digits-settings-western-light.png)                                                           |
| Eastern choice                     | [Settings](screenshots/after-digits-settings-eastern-light.png)                                                           |
| Same saved Tasbihat count, Eastern | [Light](screenshots/after-digits-tasbihat-eastern-light.png) · [Dark](screenshots/after-digits-tasbihat-eastern-dark.png) |
| Switch back to Western             | [Tasbihat](screenshots/after-digits-tasbihat-western-dark.png)                                                            |
| Prayer date, times and countdown   | [Prayer](screenshots/after-digits-prayer-eastern-light.png)                                                               |
| Byte sizes                         | [Storage](screenshots/after-digits-storage-eastern-light.png)                                                             |
| Reminder numeric field             | [Input](screenshots/after-digits-reminder-input-eastern.png)                                                              |
| Playback minutes and seconds       | [Player](screenshots/after-digits-player-eastern-light.png)                                                               |
| Hafs source text                   | [Before](screenshots/before-digits-hafs.png) · [Eastern interface](screenshots/after-digits-hafs-eastern-light.png)       |
| Hafs continuous inline markers     | [Markers retained](screenshots/after-digits-hafs-continuous-eastern.png)                                                  |
| Warsh text and embedded markers    | [Before](screenshots/before-digits-warsh.png) · [Eastern interface](screenshots/after-digits-warsh-eastern-light.png)     |

## Verification and limits

All 141 Node tests, TypeScript, formatting, diff checks and the Android arm64 review build pass. New checks cover both scripts across Arabic/French/English locales, fractions, dates, padded duration, input normalization, old settings records, persistence through unrelated settings writes, invalid-setting rollback and unchanged counters. The existing isolated slider tests use the default formatter through their test adapter.

The hash-verified build is installed in place on `emulator-5554`, user 0. Native checks cover immediate style switching, cold restart, real saved Tasbihat progress, prayer time/date/countdown, sizes, reminder input, both themes and padded player time. The same visible Hafs and Warsh source text matches the pre-update hierarchy exactly. A separate continuous-reading check confirms Hafs inline markers remain Western with Eastern interface digits.

After QA, the original reader preferences/positions, theme, playback and other settings are restored. All 207 counter rows remain byte-exact, and original bookmark, reminder and vibration records remain intact. Startup adds the new Western default field to old settings; only that field, the settings write timestamp and automatic prayer renewal may differ from the private baseline. Private backups stay outside Git, and the user-approved temporary emulator reserve setting is restored immediately after installation.

No physical device, other app, uninstall, data clear, device-network toggle, OS display/font change or iOS work is used. TalkBack listening, native keyboard entry of every alternate digit form and OS-owned media-clock digit presentation are unverified. Existing ESLint 10/legacy configuration mismatch remains outside scope. This is functional digit-style verification, without a whole-screen visual-parity claim. Build hashes and preservation results are in [verification.json](verification.json).
