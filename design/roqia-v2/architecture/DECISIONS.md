# Architecture and product decisions

These decisions turn the conversation into implementation rules. “Selected” records the user's direction; “proposed” is the technical baseline for implementation; “evidence gate” needs a concrete spike result before dependent work ships.

| ID | Decision | Status and consequence |
| --- | --- | --- |
| ADR-001 | Free, ad-free, no login or monetization | Selected. No payment, ads, subscriptions or account infrastructure. |
| ADR-002 | Offline after optional downloads | Selected. Bundled devotional core remains usable on a fresh offline install; Quran/audio packs need an initial connection. |
| ADR-003 | King Fahd Warsh v2.1/update 6; Tanzil for Hafs | Selected. Never relabel Hafs as Warsh or treat a font change as a riwaya change. |
| ADR-004 | Separate edition, translation and audio packs | Proposed. Download one edition initially; adding the other is optional. Audio is keyed by reciter + riwaya/tariq + recording set + surah + quality. |
| ADR-005 | Translation tied to verified verse mapping | Proposed. French/English available with Hafs after source acquisition. Warsh translations require explicit alignment; unavailable is preferable to a misleading mapping. |
| ADR-006 | No application backend | Selected. Bundle a small vetted catalog and fetch static HTTPS files. Optional static mirrors contain no user data or server logic. |
| ADR-007 | Static content hosting may still be necessary | Proposed. If the chosen source does not expose durable downloadable files suitable for the app, publish immutable approved packs on static storage. Do not scrape the live site at runtime or rely on internal endpoints. Hosting/bandwidth may cost the maintainer; the app stays free. |
| ADR-008 | Local metadata database plus immutable files | Proposed. SQLite is device-local. Canonical content is separate from mutable user metadata and derived search data. |
| ADR-009 | Five tabs and one shared audio session | Selected direction/proposed structure. Remove drawer duplication when the five-tab shell lands; keep old deep links. |
| ADR-010 | Western UI numerals and compact headings | Selected. Preserve scripture bytes; number badges and counters are separately rendered UI. |
| ADR-011 | Prayer/Qibla calculations do not require a public API | Proposed. Use local calculations, manual cities and sensors. Official Moroccan timetable equivalence is a validation task, not an assumption. |
| ADR-012 | Contextual permissions | Proposed. Ask notifications when enabling reminders/adhan; location only after “use my location”; no background location requirement. |
| ADR-013 | Exact/background adhan is platform-dependent | Evidence gate. Native Android proof is required across target OS levels, reboot and Doze. Provide honest notification-only fallback. |
| ADR-014 | Preserve released users' data | Required. Stable-ID migration precedes content reordering and redesign rollout. Reinstall is not migration validation. |
| ADR-015 | Tokens/contracts override generated-image inconsistencies | Proposed. Same navigation, icons, states and type roles in both themes. Actual data replaces sample values. |
| ADR-016 | No downloaded executable code | Required. Downloads contain approved text, metadata, fonts/images and audio only. No JS bundle, arbitrary HTML, scripts or remote feature logic. |

## Early evidence gates

RQ-016 must identify the actual Warsh artifact, release/version, orthography, numbering scheme, font or page assets, offline access and supported capabilities. The user changed the source choice to King Fahd on 2026-10-18. The package and matching font have [acquisition/Android evidence](../../../docs/feasibility/android/WARSH.md); AL Maghribi fails this dataset and must not replace the matching font. Text-pack redistribution and qualified review remain open. If the available artifact cannot provide reflow and Western verse badges, document the specific limitation and choose a source-supported presentation before implementation; never manufacture missing data.

RQ-020 must show native pause/resume, lifecycle recovery, Wi-Fi restriction and file verification on the pinned RN/Android stack. RQ-032 must establish one usable background audio API. RQ-037 must validate Moroccan parameters/time-zone handling against local references. RQ-040 must prove background adhan or record the bounded fallback and corresponding UI wording.

A blocked evidence gate does not block unrelated design-system or existing-feature work. It blocks the dependent release capability. No source permission or endorsement is claimed by this kit; retain the chosen source's attribution and exact edition metadata during acquisition without reopening the user's product choice.
