# Roqia v2 — implement one ticket at a time

Updated 18 October 2026. This is the authoritative execution order for all 50 existing tickets. Work down this checklist from the latest explicit implementation checkpoint below; unchecked acceptance gates remain tracked even when independent implementation is authorized to continue. You do not need START-HERE.md, milestone tables or dependency lists to decide what comes next.

The RQ numbers remain stable identifiers; the step numbers below define the work order. RQ-001 is the single baseline prerequisite, then the new-feature work starts with RQ-016 as requested. Earlier foundation tickets are included at the point where they are needed. Do not assume RQ-001–RQ-015 are complete: the current backlog records partial Android feasibility work and open gates. If work is already implemented, verify its acceptance evidence and mark it complete instead of doing it twice.

## Working rule

Finish the current ticket's implementation and acceptance checks, record evidence in its ticket, then check its item here and update its status in backlog.json. Each ticket now has Previous and Next links, so you can continue directly from that ticket. Specifications and screenshots remain linked there for implementation detail; they are not additional queues.

All start dependencies and completion-integration dependencies occur earlier in this sequence. In particular, RQ-033 is finished before RQ-007–RQ-010, so those screens can be completed in one pass with the shared player.

If an acquisition or feasibility ticket is blocked, record the missing evidence and resolve the issue or explicitly revise the scope/order. Do not mark it complete or silently skip it to build an unsupported feature. A documented page-only Warsh capability or native-platform limitation is an output to resolve against the intended feature; it is not permission to substitute content or promise unavailable behavior.

## Platform sequence and branches

Implement shared React Native features for both platforms; the current Android focus is the testing sequence, not an Android-only product architecture. Test each ticket on Android now and record iOS verification as deferred. After all tickets have completed their Android implementation/acceptance work, perform iOS build, native integration and device acceptance as a separate pass before claiming iOS readiness. Do not require iOS testing to advance the current Android sequence or count Android evidence as iOS proof.

Name branches `phase_<number>/<short-description>`. Phase 2 uses `phase_2/foundation-shared-services`; phase 3 uses `phase_3/existing-app-redesign`. The next group should use `phase_4/<short-description>`.

## Ordered checklist

### Steps 01 onward · Baseline and source/native feasibility

**2026-10-18 Android progress:** the first 10 steps have an executable feasibility pass and [evidence report](../../../docs/feasibility/android/README.md). RQ-019 and RQ-037 remain blocked; RQ-016 is now in progress after King Fahd acquisition and font testing. All ten still require the remaining checks listed in their tickets. No checkbox below implies an unperformed content or physical-device review. Independent probes were exercised across this section; dependent product integration remains gated.

1. [ ] **[RQ-001 — Capture current release and compatibility baseline](tickets/RQ-001.md)**

   **Deliver:** Record current dependency APIs, build/install path, app ID, released version and device baseline. Inventory content IDs, bundled audio, reminder behavior and existing screen routes. Record failures before changing dependencies.

   **Finish when:** A reproducible current install and in-place upgrade route are recorded; Current source versus Play release differences are explicit; Existing counter/audio/notification journeys have baseline evidence.

2. [ ] **[RQ-016 — Acquire and prove the Warsh source format](tickets/RQ-016.md)**

   **Deliver:** Use the selected King Fahd Warsh v2.1/update 6 package and its matching font. Verify publisher provenance, redistribution scope, source numbering/tariq and exact text preservation; retain Android comparison evidence and qualified review requirements.

   **Finish when:** Actual source artifact and provenance exist; Reflow/verse search/Western badges are proved or explicitly unavailable; No OCR, generated text or Hafs-to-Warsh substitution.

   **Current evidence:** King Fahd v2.1/update 6 acquired; exact JSON/CSV checks and Android matching-font comparison completed. AL Maghribi is incompatible with this dataset. Finish the specific redistribution and qualified-review items in [WARSH.md](../../../docs/feasibility/android/WARSH.md); no Al-Mohammadi API/contact dependency.

3. [ ] **[RQ-017 — Acquire and package Tanzil Hafs](tickets/RQ-017.md)**

   **Deliver:** Acquire the chosen Tanzil export, preserve original notice/hash and exact text, then produce per-surah files and edition metadata using a deterministic importer.

   **Finish when:** 114 surahs and source-edition structure validate; Canonical text round-trips exactly; Attribution/source version travels with the pack.

4. [ ] **[RQ-018 — Build content validation and editorial records](tickets/RQ-018.md)**

   **Deliver:** Validate canonical content, IDs, counts, basmala, fonts and asset hashes. Inventory existing devotional provenance and remove unverified additions. Define correction/version process and reviewer evidence.

   **Finish when:** No missing/duplicate source records; Hash and structural failures block publication; Religious rendering/source review is recorded separately from mechanical checks.

5. [ ] **[RQ-019 — Publish a versioned static content catalog](tickets/RQ-019.md)**

   **Deliver:** Create immutable ready pack metadata using the schema. Choose approved direct files or static host, record sizes/hashes/attribution and bundle a small seed catalog. Exclude drafts from installable UI.

   **Finish when:** Every ready entry resolves to validated artifacts; No secret or executable code in catalog; Offline last-good catalog works; provider failure preserves installed content.

6. [ ] **[RQ-031 — Acquire reciter and recording catalog](tickets/RQ-031.md)**

   **Deliver:** Evaluate King Fahd recordings first, then Al-Mushaf Al-Mohammadi where suitable recordings are unavailable. Retain the existing MP3Quran adapter as feasibility evidence. Verify selected recording identities, riwaya/tariq, actual chapter files, hashes, redistribution and offline download support before curating the production catalog.

   **Finish when:** Reciter + recording-set identity is stable; Warsh and Hafs recordings cannot be mixed silently; Partial recordings and unavailable qualities are represented honestly.

7. [ ] **[RQ-020 — Prove native downloads and file operations](tickets/RQ-020.md)**

   **Deliver:** Evaluate/pin the documented downloader and file/hash adapter on current RN. Prove pause/resume, native reattachment, Wi-Fi restriction, Range/entity validation, durable app-private writes and atomic rename.

   **Finish when:** Target runtime builds and downloads to private storage; Process death/reopen recovers jobs; Range 200/206/416 and entity changes cannot corrupt appended files.

8. [ ] **[RQ-032 — Prove a single native player API](tickets/RQ-032.md)**

   **Deliver:** Test current Track Player alpha APIs on RN 0.84 and pin a proven compatible choice. Prove setup, queue/events, background/remote controls, focus, seek, repeat/speed and sleep timer behavior.

   **Finish when:** One session survives normal navigation/background; Chosen API/version evidence is recorded; Unsupported native capabilities are explicit before UI integration.

9. [ ] **[RQ-037 — Validate local prayer engine and Morocco profile](tickets/RQ-037.md)**

   **Deliver:** Pin Adhan JS and create a sourced custom Morocco profile; do not assume a named Morocco preset. Compare cities/seasons against authoritative local schedules and implement civil-date/UTC rules.

   **Finish when:** Method parameters/provenance and residual differences recorded; Africa/Casablanca Ramadan/DST tests pass; Invalid/high-latitude results do not become fake times.

10. [ ] **[RQ-040 — Prove Android full-adhan scheduling](tickets/RQ-040.md)**

   **Deliver:** Prove native exact alarm → permitted media playback path, permission checks, stop control, audio focus and reboot reconciliation under target SDK. Record fallback if unavailable.

   **Finish when:** Locked/background adhan behavior is proven per OS; Permission/channel/force-stop limitations are explicit; No JavaScript timer or notification-sound shortcut is presented as reliable full adhan.

### Steps 11 onward · Foundation, migration and shared services

**2026-10-18 phase 2 checkpoint:** shared foundations are implemented with [Android evidence](../../../docs/implementation/phase-2/README.md). RQ-002/RQ-004/RQ-033/RQ-022 are complete for this foundation scope. RQ-003/RQ-005/RQ-015/RQ-021 retain the specific notification, signed-upgrade, accessibility, source or physical-device acceptance work in their tickets. The user authorized proceeding after phase 1; the explicit scope adjustment is to build/test generic download and playback infrastructure with isolated fixtures while keeping the production catalog empty. No source or release gate is waived.

**Phase 2 pickup was step 19 / RQ-006; phase 3 has now implemented steps 19–27.** Follow the phase 3 checkpoint below. Revisit named open acceptance checks at their integration/release tickets; do not rebuild completed work or present unchecked items as accepted.

11. [x] **[RQ-002 — Implement tokens and shared UI primitives](tickets/RQ-002.md)**

   **Deliver:** Adopt kit tokens and supplied assets. Build text, icon, button, card, row, header, sheet and state components. Support light/dark/system and actual Arabic font weights; forward Text props.

   **Finish when:** Semantic colors and type roles drive both themes; 48 dp targets and compact headings work at 200% text; No screenshot PNG is imported into the app.

12. [x] **[RQ-004 — Define stable IDs and local repository foundation](tickets/RQ-004.md)**

   **Deliver:** Assign explicit permanent devotional IDs and define metadata records. Spike/pin the local SQLite adapter on RN 0.84. Add transactional repository APIs and serialized writes; keep UI state scoped.

   **Finish when:** No identity depends on current text or visible-list position; Local DB transaction/reopen works on target runtime; Settings, counters, bookmarks and job ownership match contracts.

13. [ ] **[RQ-005 — Migrate released state without data loss](tickets/RQ-005.md)**

   **Deliver:** Build verified legacy key mapping and idempotent migration with retained backup. Clamp finite counts, preserve flags/theme/reminder times, and prevent pre-hydration writes. Add recoverable persistence errors.

   **Finish when:** Populated released install retains progress after upgrade; Interrupted/repeated migration does not reset or duplicate state; Page/global reset scopes exclude downloads/bookmarks/preferences.

14. [ ] **[RQ-003 — Build five-tab shell and preserve deep links](tickets/RQ-003.md)**

   **Deliver:** Introduce typed root tabs and a shared detail stack, remove duplicate drawer entry points when parity exists, and preserve old URL aliases. Hold cold-start links until app readiness.

   **Finish when:** RTL tab order matches the kit; Details/setup/player have no root tab bar; Old and new valid links navigate once; invalid/missing-pack links recover.

15. [ ] **[RQ-015 — Complete accessibility and Arabic formatting foundation](tickets/RQ-015.md)**

   **Deliver:** Centralize latn number/time/byte formatting and Arabic plurals. Verify native Text prop forwarding, focus order, mixed-direction runs, labels and large text; fix shared components.

   **Finish when:** All generated UI numerals are Western under Arabic device locales; No harakat clipping or inaccessible icon action; French/English blocks and URLs retain LTR order.

16. [ ] **[RQ-021 — Implement durable download/install coordinator](tickets/RQ-021.md)**

   **Deliver:** Implement deduplicated jobs, bounded concurrency/retries, transport reattachment, integrity checks, staging/journal/activation and generation-safe events. Completed unrelated files remain usable.

   **Finish when:** Only validated installed bytes become ready; User pause differs from network wait; Crash during file rename/DB commit recovers idempotently.

17. [x] **[RQ-033 — Unify devotional and Quran playback](tickets/RQ-033.md)**

   **Deliver:** Define the controller interface independently of redesigned screen completion. Adapt the existing devotional screens first, then let RQ-007–RQ-010 compose that controller. Their final acceptance depends on this integration; this ticket does not depend on those UI tickets being done. Replace per-screen Video playback with the shared controller after parity. Preserve audio arrays/repeats, expose failures, keep paused mini player and stop on explicit action rather than screen blur.

   **Finish when:** No simultaneous players; All original devotional audio remains mapped; Counters remain independent and paused playback remains controllable.

18. [x] **[RQ-022 — Implement storage management and safe deletion](tickets/RQ-022.md)**

   **Deliver:** Show actual installed/partial bytes and selected-file totals. Confirm deletion, stop active file use, retain bookmarks and reconcile interrupted deletions. Preserve bundled core content.

   **Finish when:** Deleting selected audio leaves other packs untouched; Active playback is stopped before deletion; Missing files never remain marked ready.

### Steps 19 onward · Existing application screens

**2026-10-18 phase 3 checkpoint:** RQ-006–RQ-014 are implemented with [Android evidence](../../../docs/implementation/phase-3/README.md). RQ-010 retains TalkBack acceptance; RQ-013 retains owner/editorial approval of legal copy. Full device/lifecycle and iOS acceptance remain explicitly open at the integration/release gates.

**Next implementation pickup after phase 3 review: step 28 / RQ-023.** Recheck its source dependencies before creating a production pack. King Fahd Warsh must use its matching font; no unreviewed Quran text, translation or audio may enter the catalog. This checkpoint does not waive RQ-016–RQ-019 or other source gates.

19. [x] **[RQ-006 — Redesign launch, onboarding and guidance](tickets/RQ-006.md)**

   **Deliver:** Implement compact skippable guide and reviewed guidance, hydration barrier, replay entry and pending-link handling. Remove startup permission request from bootstrap.

   **Finish when:** Existing seen flags remain honored; No theme/counter flash or duplicate modal sequence; Skip/replay and pending deep links work without startup permission prompt.

20. [x] **[RQ-007 — Redesign Ruqya and counter interactions](tickets/RQ-007.md)**

   **Deliver:** Use shared reading cards and stable IDs. Preserve reviewed text/default repeats, copy/reset behavior and progress. Integrate the audio controller when RQ-033 is ready.

   **Finish when:** No content entry or audio association is lost; Copy/bookmark/audio controls never decrement parent counter; Counter completion and reset work in both themes.

21. [x] **[RQ-008 — Redesign adhkar categories and readers](tickets/RQ-008.md)**

   **Deliver:** Build category cards and shared morning/evening/sleep readers. Keep original identity through filtering and canonical content. Add progress, copy, bookmark hooks and error states.

   **Finish when:** Every existing category/item remains reachable; Reset affects only selected category; RTL text/diacritics and large text remain readable.

22. [x] **[RQ-009 — Redesign dua reader](tickets/RQ-009.md)**

   **Deliver:** Compose the shared devotional reader for dua with stable counters, copy/bookmarks, audio arrays and reset. Make navigation from More and Adhkar clear.

   **Finish when:** All dua entries remain available offline; Multi-audio entries retain their mapping; Reset/back behavior uses the current screen context.

23. [ ] **[RQ-010 — Redesign tasbih](tickets/RQ-010.md)**

   **Deliver:** Use readable counters and explicit completion/reset actions while retaining existing tasbih content and repeat semantics. Do not add automatic midnight reset or gamification.

   **Finish when:** Counts clamp to zero and persist; Reset restores reviewed defaults; Tap and accessible increment/decrement behavior are unambiguous.

24. [x] **[RQ-011 — Add devotional bookmarks and local discovery](tickets/RQ-011.md)**

   **Deliver:** Store typed devotional bookmarks using permanent IDs. Provide category filters and empty/missing-content states; share infrastructure with later Quran bookmarks.

   **Finish when:** Bookmarks survive text revisions with unchanged IDs; Removing a bookmark does not alter counter progress; No Quran/devotional ID collision.

25. [x] **[RQ-012 — Build More and app preferences](tickets/RQ-012.md)**

   **Deliver:** Expose all secondary destinations and settings. Implement light/dark/system, UI scale, fixed Western digits, download policy and preferred edition links. Separate reset from storage deletion.

   **Finish when:** System theme reacts to OS changes; Saved preferences survive restart; Every More row leads to a working destination or clear unavailable state.

26. [ ] **[RQ-013 — Redesign About, legal pages and link recovery](tickets/RQ-013.md)**

   **Deliver:** Bundle readable reviewed legal copy, retain contact identity and source links. Add explicit external-open, copy and failure actions; align privacy wording with optional downloads/location.

   **Finish when:** About/legal text works offline; External link failure is recoverable; No unsupported privacy claim or automatic email send.

27. [x] **[RQ-014 — Add user-controlled daily reminders](tickets/RQ-014.md)**

   **Deliver:** Save opt-in times/weekdays and desired state. Request permission only in context; display effective permission/channel status and test action. Migrate legacy notification IDs/times.

   **Finish when:** Fresh install sends nothing before opt-in; Existing times are preserved; Changing/turning off a reminder cancels old events without duplicates.

### Steps 28 onward · Quran reading and listening

28. [ ] **[RQ-023 — Build Quran library and edition selection](tickets/RQ-023.md)**

   **Deliver:** Build list/resume and Warsh/Hafs chooser with actual capabilities, installed state and optional download. Recommend Warsh without geographic gating; allow adding either edition later.

   **Finish when:** Fresh offline/no-pack state is useful; Selection alone does not download; Switching preferred edition preserves both installed packs and reading positions.

29. [ ] **[RQ-024 — Implement the Warsh reader](tickets/RQ-024.md)**

   **Deliver:** Render the approved Warsh artifact exactly, with only proved capabilities. Support source-aware locators, separate Western UI badges, toolbar and missing-pack recovery. Record any page-only limitation explicitly.

   **Finish when:** Canonical bytes and marks are preserved; No mislabeled Hafs or fallback glyph substitution; Reader honors verified source capabilities and offline use.

30. [ ] **[RQ-025 — Implement the Hafs reader](tickets/RQ-025.md)**

   **Deliver:** Render canonical Tanzil Hafs, correct chapter/basmala boundaries, verse locators and toolbar. Share presentation primitives without conflating edition metadata.

   **Finish when:** Text matches approved export; Verse badges use Western digits independently; Large text and long-surah scrolling remain usable offline.

31. [ ] **[RQ-026 — Acquire and integrate French/English translations](tickets/RQ-026.md)**

   **Deliver:** Select actual distributable French and English editions and record source metadata. Download separately, render LTR below Arabic and validate mapping. Warsh requires reviewed correspondence or an unavailable state.

   **Finish when:** No translation joined to wrong edition/verse; French/English choice and offline status persist; Displayed translator/source names match actual files, not mockup placeholders.

32. [ ] **[RQ-027 — Implement reader preferences](tickets/RQ-027.md)**

   **Deliver:** Add scripture size/line spacing, supported view modes, translation visibility, latn badges and scoped keep-awake. Apply only edition capabilities and preserve canonical text.

   **Finish when:** Settings persist independently from UI text size; No clipped marks at allowed sizes; Keep-awake releases on background/reader exit.

33. [ ] **[RQ-028 — Implement local Quran search](tickets/RQ-028.md)**

   **Deliver:** Provide metadata-only surah search and installed-text verse search. Normalize a separate index, retain canonical ID/offset mapping, bound work and add recent/clear/no-result states.

   **Finish when:** Search never mutates canonical scripture; Page-only/no-pack states expose only supported search; Arabic variants find expected canonical results without wrong highlighting.

34. [ ] **[RQ-029 — Add edition-aware bookmarks and resume](tickets/RQ-029.md)**

   **Deliver:** Store verse/page locators per edition and current pack version, restore reading position, filter types and handle deleted packs. Do not transplant ordinal positions between editions.

   **Finish when:** Changing edition keeps independent positions; Deleting content preserves bookmarks with re-download action; Version mapping failures are visible and recoverable.

35. [ ] **[RQ-030 — Build source/edition information and reporting](tickets/RQ-030.md)**

   **Deliver:** Render actual publisher, edition, translator, reciter and version details, attribution and links. Provide user-controlled content-report draft with locator/version context.

   **Finish when:** Metadata comes from installed/catalog records; No invented verification or endorsement badge; Source details remain readable offline.

36. [ ] **[RQ-034 — Build reciter selection and audio download UI](tickets/RQ-034.md)**

   **Deliver:** Implement riwaya-filtered preview, actual quality choices, surah checkboxes, actual total bytes and selective/all downloads with Wi-Fi policy. Use canonical chapter numbers.

   **Finish when:** Repeated actions deduplicate; Whole-mushaf meaning reflects actual completeness; Completed files remain playable during unrelated failures.

37. [ ] **[RQ-035 — Build offline library and full player](tickets/RQ-035.md)**

   **Deliver:** Show installed audio by recording set, mini/full player, real duration/seek, repeat, speed, sleep timer and upcoming queue. Resume position without auto-play.

   **Finish when:** Library only claims verified local files; Deleted/missing active file has recovery; All visible player controls reflect proven native capabilities.

### Steps 38 onward · Prayer, Qibla and adhan

38. [ ] **[RQ-036 — Implement manual city and one-shot location](tickets/RQ-036.md)**

   **Deliver:** Bundle verified Moroccan city coordinates/zones and manual coordinate/zone fallback. Add contextual foreground GPS request, stale/denied/timeout handling and explicit travel behavior.

   **Finish when:** Prayer/Qibla work with manual city without location permission; Coordinates/zone/source are persisted correctly; No background tracking or silent city changes.

39. [ ] **[RQ-038 — Build prayer dashboard](tickets/RQ-038.md)**

   **Deliver:** Display calculated/attributed schedule, city, next prayer/countdown, informational sunrise and links to Qibla/adhan/method settings. Show effective notification modes.

   **Finish when:** Next prayer rolls to tomorrow correctly; Sunrise never has adhan toggle; Displayed values come from engine, not screenshot samples.

40. [ ] **[RQ-039 — Implement Qibla and sensor calibration states](tickets/RQ-039.md)**

   **Deliver:** Implement sourced-coordinate bearing, true-heading adapter, display rotation and circular smoothing. Add accuracy/no-sensor states, guidance and external-map/north-up fallback.

   **Finish when:** True and magnetic references are not mixed; No-sensor state never pretends to be live compass; Sensor listeners stop off-screen.

41. [ ] **[RQ-041 — Implement per-prayer adhan preferences](tickets/RQ-041.md)**

   **Deliver:** Add off/notification/full modes, pre-prayer reminder and effective permission state. Save desired settings then reconcile; pause Quran for adhan and leave it paused afterward.

   **Finish when:** No sunrise event or duplicate schedule; Desired versus effective mode is visible; Unavailable full adhan offers honest notification fallback.

42. [ ] **[RQ-042 — Acquire sounds and implement previews](tickets/RQ-042.md)**

   **Deliver:** Validate actual Moroccan/Makkah/short sound sources and normal/Fajr variants. Reuse bundled adan.mp3 only after review. Add preview, download status and supported volume behavior.

   **Finish when:** Attribution and Fajr variant match actual audio; No fabricated recording or synthetic phrase splice; Preview stops correctly and respects system audio policy.

43. [ ] **[RQ-043 — Implement calculation and time preferences](tickets/RQ-043.md)**

   **Deliver:** Expose method, supported Asr/high-latitude options, bounded per-prayer minute adjustments and 12/24-hour formatting. Reset defaults explicitly; changing settings invalidates schedules.

   **Finish when:** Offsets apply once; Setting changes update dashboard and scheduler generation; Unsupported/undefined method states are explained.

44. [ ] **[RQ-044 — Reconcile notifications across lifecycle/time changes](tickets/RQ-044.md)**

   **Deliver:** Implement deterministic IDs/generations, bounded scheduling window, cancellation/replenishment, boot/package/time/zone/permission handling and covered-until diagnostics.

   **Finish when:** No duplicate or expired adhan replay; Schedule remains within adapter capacity; Boot reschedules without starting playback; unsupported renewal is disclosed.

### Steps 45 onward · Verification and release preparation

45. [ ] **[RQ-045 — Complete missing, offline and permission states](tickets/RQ-045.md)**

   **Deliver:** Audit additional states listed in EXISTING-FEATURES.md. Replace false-ready/blank/silent-error states with localized explanation and a concrete recovery action.

   **Finish when:** Every unavailable capability has an honest state; Existing offline content remains usable; Actions do not loop or discard user progress on failure.

46. [ ] **[RQ-046 — Verify visual parity and accessibility](tickets/RQ-046.md)**

   **Deliver:** Capture all 48 screens in both themes from the running app and compare semantic layout to kit. Resolve differences consistently via tokens; validate TalkBack and large text.

   **Finish when:** 96 implementation captures indexed; Compact headings/Western digits and all target sizes pass; No clipped Arabic/translation text or inaccessible action.

47. [ ] **[RQ-047 — Verify religious content and media integrity](tickets/RQ-047.md)**

   **Deliver:** Perform release-version canonical/hash/structure verification and qualified edition/translation/recording review. Check attribution, source updates and correction response.

   **Finish when:** No unknown or draft pack is published; Edition/translation/audio mappings are accepted; Review scope, versions and unresolved issues are documented.

48. [ ] **[RQ-048 — Verify native offline and upgrade journeys](tickets/RQ-048.md)**

   **Deliver:** Run the device matrix in qa/ACCEPTANCE.md on a real upgrade and fresh install, including native download, audio, alarm and sensor limitations.

   **Finish when:** Populated upgrade preserves user state; Offline/download recovery and background scenarios pass; Actual device/OS evidence supports every reliability claim.

49. [ ] **[RQ-049 — Measure performance and app/storage size](tickets/RQ-049.md)**

   **Deliver:** Measure against RQ-001 and agreed targets; bound startup/corpus work, memory and network concurrency. Exclude design references from runtime and assess bundled-audio size without removing offline content prematurely.

   **Finish when:** Reference PNGs absent from APK/AAB; Measured startup/search/scroll/memory results recorded; Any audio size migration has a verified offline upgrade path.

50. [ ] **[RQ-050 — Prepare signed release candidate and rollout](tickets/RQ-050.md)**

   **Deliver:** Complete RELEASE.md, increment version safely, verify application/signing identity, prepare internal-track candidate and staged rollout/rollback criteria. Publishing remains a separate explicit action.

   **Finish when:** All release gates have evidence; No placeholder values or unverified capabilities shipped; Internal install/update and smoke journeys pass.

## Release question

The v2 Google Play update/testing distinction is recorded in [Release checklist](RELEASE.md#google-play-v2-update). This sequence includes internal-device and upgrade testing even though the initial production-access waiting period is not the routine requirement for an existing production app update.
