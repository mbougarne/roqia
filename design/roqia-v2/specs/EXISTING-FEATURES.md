# Existing features and supporting screens

Screens 01–21 and 46–47. Preserve religious content and behavior while replacing presentation through shared components. Do not rewrite Arabic devotional text from the screenshots.

## Launch, walkthrough and guidance

Bootstrap must wait for hydration/migration and then resolve one destination. The splash is not a fixed timer that can race saved state. New users get the skippable welcome/guide flow and reviewed ruqya guidance once. Existing flags are preserved. Notification/location prompts belong to the relevant feature action, not launch. Replay the guide and guidance from More. Honor a pending deep link after education completes, once.

## Ruqya, adhkar, dua and tasbih

Use stable item IDs, canonical reviewed content and original repeat defaults. Display remaining count, completion and progress. Page progress counts completed items with a clear denominator; it is not audio playback progress. Do not infer religious reward or add unsupported hadith references. Review existing content/source metadata as a separate editorial task before release.

The counter decrements only through the designated reading action, never below zero. Copy, bookmark, audio, overflow and reset do not decrement the parent card. A per-item reset restores its default; page reset affects the current visible category; global reset affects all devotional counters only. Confirm page/global actions. There is no automatic midnight reset unless explicitly added later.

Dua and tasbih remain reachable from More, with useful shortcuts from Adhkar. Preserve all existing entries and audioArray relationships. Bookmarking and local search may be shared with Quran through typed locators, not by mixing Quran verse IDs with devotional IDs. Empty bookmark state explains how to add one.

## More, settings and information

More replaces drawer duplication and makes downloads, bookmarks, reminders, appearance, sources, guidance, About and legal information discoverable. App settings include light/dark/system, UI text size, Western digits, preferred mushaf, translation preference and Wi-Fi-only download policy. Reset-all is clearly separated from delete-downloads.

About retains the actual project/contact identity. Privacy/terms have bundled readable content and optional external links, so reading them works offline. Review policy wording against the final implementation: public content hosts can receive ordinary network request metadata even without accounts/analytics. Do not claim zero network contact when users request downloads. External-link failure offers retry, copy link and return, never a blank modal.

## Additional states beyond the 48 reference images

No installed mushaf; no bookmarks; no search results; unsupported Warsh text/translation capability; edition/font unavailable; partial/corrupt content; missing/deleted audio; unknown download size; low storage; unsupported quality; denied notifications/location/exact alarms; blocked notification channel; missing compass sensor; stale city/time-zone information; undefined prayer times; migration recovery; large text layout; system theme change; and screen-reader focus after sheets.

These are states of existing routes/components, not necessarily new top-level screens. Every related ticket includes them and RQ-045 checks them across the app. Do not create a success-looking screen for a capability that is not available.
