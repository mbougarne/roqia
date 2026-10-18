# Roqia v2 — design and implementation kit

Prepared on 17 October 2026 for the next Android release. This folder adds design resources and planning documents only. It does not implement the redesign, change the running app, install dependencies, or publish content.

Start with the [ordered implementation checklist](implementation/IMPLEMENTATION-ORDER.md): one explicit sequence covering all 50 tickets, with direct next-ticket links. The [backlog](implementation/BACKLOG.md) remains the ID-sorted catalog; [START-HERE.md](START-HERE.md) explains the milestones. The first 10 steps now have [Android feasibility evidence](../../docs/feasibility/android/README.md); source, review and device gates remain open.

| Resource | Where to look |
| --- | --- |
| Visual system and component rules | [Design system](specs/DESIGN-SYSTEM.md), [components](specs/COMPONENTS.md) |
| Color, typography, spacing, sizing and motion values | [tokens/](tokens/colors.json) |
| 53 icons, 18 themed illustration files, Arabic font and licenses | [Assets](assets/README.md) |
| UI text keys and Western-digit rules | [Copy](copy/README.md) |
| All 48 screens, light/dark references and ticket links | [Screen index](reference/SCREEN-INDEX.md), [screen registry](screens.json) |
| Architecture, storage and decisions | [Architecture](architecture/ARCHITECTURE.md), [decisions](architecture/DECISIONS.md) |
| Quran content and source validation | [Quran solution](specs/QURAN.md) |
| Offline downloads and audio | [Downloads](specs/DOWNLOADS.md), [audio](specs/AUDIO.md) |
| Prayer times, Qibla and adhan | [Prayer solution](specs/PRAYER.md) |
| Current issues and their resolution tickets | [Gap register](implementation/GAPS.md) |
| Upgrade and data preservation | [Migration](architecture/MIGRATION.md) |
| Test and release requirements | [Acceptance plan](qa/ACCEPTANCE.md), [release checklist](implementation/RELEASE.md) |
| Checks completed on this kit | [Kit validation report](qa/KIT-VALIDATION.md) |
| Research evidence and unresolved facts | [Sources](architecture/SOURCES.md) |

The product remains free, ad-free, Arabic-first and usable offline after optional downloads. There are no accounts, subscriptions, analytics SDKs, backend application services, or server databases in this design. Local device storage and optional static file hosting are separate from a backend.

Warsh uses Al Mushaf Al Mohammadi; Hafs uses Tanzil. The source choices are retained. Exact downloadable editions, fonts, verse maps, translations and reciter catalogs still need the evidence described in their acquisition tickets. A source website is not itself a verified distributable content pack.

The screenshots establish visual direction. The tokens, component contracts and feature specifications resolve inconsistencies between generated images. They take precedence over illustrative sizes, times, unverified Quran glyphs, source labels, and unavailable controls shown in a mockup. The 96 PNGs are reference material and must never enter the app bundle.

The HTML gallery is an offline review aid, not application code: [Open gallery](preview.html). Open it in a browser to inspect colors, assets and individual screenshot links.
