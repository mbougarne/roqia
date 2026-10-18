# Start implementing here

**Use the [ordered implementation checklist](implementation/IMPLEMENTATION-ORDER.md) to choose and finish tickets one by one.** It supersedes the sequencing suggestions below; this page remains background on milestones and working principles.

The first useful deliverable is a stable app shell with the new typography, colors, navigation and preserved counters. Do not begin by replacing every screen at once.

## First implementation session

1. Read the [design system](specs/DESIGN-SYSTEM.md), [architecture](architecture/ARCHITECTURE.md) and [gap register](implementation/GAPS.md).
2. Complete RQ-001: capture the current Android behavior and a reproducible install/update baseline. Keep existing application ID and signing identity.
3. Start the early feasibility work RQ-016, RQ-020, RQ-032, RQ-037 and RQ-040. These answer the content-format, native-download, player, Moroccan timetable and background-adhan questions before dependent UI work grows.
4. Implement RQ-002: tokens, text, icon wrapper, button, card, row, header, theme selection and RTL/Western-digit formatting. Use a development-only component preview; the design kit itself is not a runtime import barrel.
5. Implement RQ-004 then RQ-005 before changing content keys. Seed current persisted data in an upgrade install and prove that counters survive.
6. Implement RQ-003, then the existing-feature tickets RQ-006–RQ-015. Bring the shared audio controller RQ-033 forward once RQ-004/RQ-032 are complete so those screens can finish their audio integration. Add Quran and prayer routes behind local development flags until their underlying capabilities work.

## Delivery sequence

| Milestone | Result | Exit evidence |
| --- | --- | --- |
| M0: baseline and feasibility | Compatibility and content unknowns resolved | RQ-001; source, downloader, player, prayer and adhan spike reports |
| M1: foundation | Shared components, stable IDs, safe migration, five tabs | RQ-002–RQ-005; old-install upgrade proof |
| M2: existing experience | Ruqya, adhkar, dua, tasbih, settings, information and reminders redesigned | RQ-006–RQ-015; both themes and TalkBack |
| M3: offline content | Verified packs and reliable download/storage pipeline | RQ-016–RQ-022; interrupted install/recovery proof |
| M4: Quran | Edition choice, readers, translations, search and bookmarks | RQ-023–RQ-030; offline and source-integrity evidence |
| M5: listening | One audio session and selective downloads | RQ-031–RQ-035; lock-screen, focus and restart evidence |
| M6: prayer | Location, calculations, Qibla and reliable adhan | RQ-036–RQ-044; real Android device matrix |
| M7-UI: visual implementation | All 48 screens matched in both themes | RQ-051–RQ-062, then RQ-046 final visual/accessibility audit |
| M7: release | Failure states, accessibility, performance, upgrade and release verification | RQ-045–RQ-050; signed internal-track candidate |

Milestones describe outcomes, not calendar estimates. Tickets have dependencies; independent feasibility work can happen early. A visual screen is not complete until its missing/error/offline/permission states and relevant acceptance checks work.

## How to work a ticket

Use one branch/PR per coherent ticket or small closely related pair. For the initial Android feasibility section, the user explicitly requested all 10 steps in one PR; its evidence and unresolved gates are recorded together. Move status from planned → in_progress → review → done in the backlog data and ticket together. Record changed paths, actual test commands, device/OS/build, screenshots and unresolved limitations. A screenshot, mocked test or dependency README is not proof of native execution.

Keep the existing app releasable after each merge. Never clear user storage as a shortcut to migration. Never remove bundled devotional audio before a replacement pack and upgrade behavior are verified. Do not ship placeholder download URLs or pretend that generated Quran text is canonical data.

After the foundation is stable, the practical tab order is **Ruqya → Adhkar → More/settings → Quran → Prayer**. The visual RTL tab order stays **الرقية، القرآن، الأذكار، الصلاة، المزيد** throughout.
