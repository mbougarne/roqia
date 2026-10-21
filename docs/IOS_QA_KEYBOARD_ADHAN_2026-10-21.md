# iPhone Quran keyboard, bookmarks and adhan previews

## Changes

- Quran library/index search dismisses the keyboard before opening a result and when leaving for search, saved bookmarks or another screen. Returning preserves the query without retaining keyboard focus. A visible **تم** action hides the keyboard while searching; submitting and clearing also dismiss it. The reader's section picker uses the same behavior.
- Quran saved bookmarks use an **إزالة العلامة** text button instead of a trash icon. Only the saved reference is removed; source content is unchanged.
- All six adhan recordings are packaged for iPhone and available offline for selection and preview. Native preparation/playback checks the exact source byte count and SHA-256 and rejects external paths. Previews pause existing app playback, do not request notification permission, and stop on leaving the screen.
- The iPhone screen explains that prayer notifications still use the system sound. This change enables in-app recordings; it does not add full background adhan scheduling.

## Validation

- Project quality checks pass. Focused regressions cover focus cleanup, result selection, Done/clear/submit behavior, text-only bookmark removal and all six iPhone previews without notification permission.
- All 194 domain/UI regressions and eight native iPhone tests pass. Native tests verify all six packaged recordings and reject invalid resource names, hashes and external preview paths.
- Release simulator and signed iPhone builds succeed. The signed update is installed in place on the owner's iPhone 15.
- Simulator interaction confirms the visible Done action, clearing and result navigation hide the keyboard; returning from full search and saved bookmarks keeps the query without reopening the keyboard. The bookmark page visibly uses Arabic removal text. Full and short adhan previews resolve without a permission request or error, and Stop is available.
- Owner confirmation on the physical iPhone is pending.

Pre/post-install database checks preserve all 207 counters, seven bookmarks, three reminders, Quran preferences, downloaded packs and timing records. Android device testing and store releases remain outside this batch. No App Store resubmission is included.
