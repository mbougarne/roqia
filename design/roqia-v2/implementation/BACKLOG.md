# Implementation backlog

**For day-to-day work, follow [IMPLEMENTATION-ORDER.md](IMPLEMENTATION-ORDER.md) from top to bottom.** This file remains the ticket catalog, sorted by stable ID; its numerical order is not the execution sequence.

50 local implementation tickets. None has been created in an external issue tracker. The first 10 execution steps have Android feasibility evidence; their ticket statuses distinguish work in progress from blocked source/review gates. No feature is marked complete solely from a spike. Dependencies are start dependencies; integration completion requirements are explicit inside each ticket.

Phase 2 delivers shared foundations for steps 11–18 with [Android validation](../../../docs/implementation/phase-2/README.md). Follow the current checkpoint in the ordered plan for the next implementation pickup (step 19 / RQ-006). Unchecked source, signed-upgrade, accessibility and device acceptance gates remain open.

Early feasibility tickets RQ-016, RQ-020, RQ-032, RQ-037 and RQ-040 should be resolved before dependent feature work is committed to a release. Existing-feature UI can proceed independently.

| Ticket | Work | Milestone | Start dependencies |
| --- | --- | --- | --- |
| [RQ-001](tickets/RQ-001.md) | Capture current release and compatibility baseline | M0 | — |
| [RQ-002](tickets/RQ-002.md) | Implement tokens and shared UI primitives | M1 | RQ-001 |
| [RQ-003](tickets/RQ-003.md) | Build five-tab shell and preserve deep links | M1 | RQ-002 |
| [RQ-004](tickets/RQ-004.md) | Define stable IDs and local repository foundation | M1 | RQ-001 |
| [RQ-005](tickets/RQ-005.md) | Migrate released state without data loss | M1 | RQ-004 |
| [RQ-006](tickets/RQ-006.md) | Redesign launch, onboarding and guidance | M2 | RQ-002, RQ-003, RQ-005 |
| [RQ-007](tickets/RQ-007.md) | Redesign Ruqya and counter interactions | M2 | RQ-002, RQ-003, RQ-005 |
| [RQ-008](tickets/RQ-008.md) | Redesign adhkar categories and readers | M2 | RQ-002, RQ-003, RQ-005 |
| [RQ-009](tickets/RQ-009.md) | Redesign dua reader | M2 | RQ-002, RQ-003, RQ-005 |
| [RQ-010](tickets/RQ-010.md) | Redesign tasbih | M2 | RQ-002, RQ-003, RQ-005 |
| [RQ-011](tickets/RQ-011.md) | Add devotional bookmarks and local discovery | M2 | RQ-004, RQ-007, RQ-008, RQ-009, RQ-010 |
| [RQ-012](tickets/RQ-012.md) | Build More and app preferences | M2 | RQ-002, RQ-003, RQ-005 |
| [RQ-013](tickets/RQ-013.md) | Redesign About, legal pages and link recovery | M2 | RQ-002, RQ-003 |
| [RQ-014](tickets/RQ-014.md) | Add user-controlled daily reminders | M2 | RQ-005, RQ-012 |
| [RQ-015](tickets/RQ-015.md) | Complete accessibility and Arabic formatting foundation | M2 | RQ-002, RQ-003 |
| [RQ-016](tickets/RQ-016.md) | Acquire and prove the Warsh source format | M0 | RQ-001 |
| [RQ-017](tickets/RQ-017.md) | Acquire and package Tanzil Hafs | M3 | RQ-001 |
| [RQ-018](tickets/RQ-018.md) | Build content validation and editorial records | M3 | RQ-016, RQ-017 |
| [RQ-019](tickets/RQ-019.md) | Publish a versioned static content catalog | M3 | RQ-018 |
| [RQ-020](tickets/RQ-020.md) | Prove native downloads and file operations | M0 | RQ-001 |
| [RQ-021](tickets/RQ-021.md) | Implement durable download/install coordinator | M3 | RQ-004, RQ-019, RQ-020 |
| [RQ-022](tickets/RQ-022.md) | Implement storage management and safe deletion | M3 | RQ-021 |
| [RQ-023](tickets/RQ-023.md) | Build Quran library and edition selection | M4 | RQ-003, RQ-015, RQ-021 |
| [RQ-024](tickets/RQ-024.md) | Implement the Warsh reader | M4 | RQ-016, RQ-018, RQ-023 |
| [RQ-025](tickets/RQ-025.md) | Implement the Hafs reader | M4 | RQ-017, RQ-018, RQ-023 |
| [RQ-026](tickets/RQ-026.md) | Acquire and integrate French/English translations | M4 | RQ-018, RQ-023, RQ-025 |
| [RQ-027](tickets/RQ-027.md) | Implement reader preferences | M4 | RQ-024, RQ-025, RQ-026 |
| [RQ-028](tickets/RQ-028.md) | Implement local Quran search | M4 | RQ-024, RQ-025 |
| [RQ-029](tickets/RQ-029.md) | Add edition-aware bookmarks and resume | M4 | RQ-011, RQ-024, RQ-025 |
| [RQ-030](tickets/RQ-030.md) | Build source/edition information and reporting | M4 | RQ-013, RQ-018, RQ-019, RQ-026 |
| [RQ-031](tickets/RQ-031.md) | Acquire reciter and recording catalog | M5 | RQ-018, RQ-019 |
| [RQ-032](tickets/RQ-032.md) | Prove a single native player API | M0 | RQ-001 |
| [RQ-033](tickets/RQ-033.md) | Unify devotional and Quran playback | M5 | RQ-004, RQ-032 |
| [RQ-034](tickets/RQ-034.md) | Build reciter selection and audio download UI | M5 | RQ-021, RQ-031 |
| [RQ-035](tickets/RQ-035.md) | Build offline library and full player | M5 | RQ-022, RQ-033, RQ-034 |
| [RQ-036](tickets/RQ-036.md) | Implement manual city and one-shot location | M6 | RQ-004, RQ-012 |
| [RQ-037](tickets/RQ-037.md) | Validate local prayer engine and Morocco profile | M0 | RQ-001 |
| [RQ-038](tickets/RQ-038.md) | Build prayer dashboard | M6 | RQ-003, RQ-036, RQ-037 |
| [RQ-039](tickets/RQ-039.md) | Implement Qibla and sensor calibration states | M6 | RQ-036 |
| [RQ-040](tickets/RQ-040.md) | Prove Android full-adhan scheduling | M0 | RQ-001, RQ-032 |
| [RQ-041](tickets/RQ-041.md) | Implement per-prayer adhan preferences | M6 | RQ-038, RQ-040 |
| [RQ-042](tickets/RQ-042.md) | Acquire sounds and implement previews | M6 | RQ-031, RQ-032, RQ-040 |
| [RQ-043](tickets/RQ-043.md) | Implement calculation and time preferences | M6 | RQ-036, RQ-037, RQ-038 |
| [RQ-044](tickets/RQ-044.md) | Reconcile notifications across lifecycle/time changes | M6 | RQ-014, RQ-041, RQ-042, RQ-043 |
| [RQ-045](tickets/RQ-045.md) | Complete missing, offline and permission states | M7 | RQ-006, RQ-012, RQ-013, RQ-023, RQ-027, RQ-028, RQ-029, RQ-030, RQ-035, RQ-039, RQ-044 |
| [RQ-046](tickets/RQ-046.md) | Verify visual parity and accessibility | M7 | RQ-015, RQ-045 |
| [RQ-047](tickets/RQ-047.md) | Verify religious content and media integrity | M7 | RQ-018, RQ-024, RQ-025, RQ-026, RQ-029, RQ-031, RQ-035, RQ-042 |
| [RQ-048](tickets/RQ-048.md) | Verify native offline and upgrade journeys | M7 | RQ-005, RQ-035, RQ-039, RQ-044, RQ-045 |
| [RQ-049](tickets/RQ-049.md) | Measure performance and app/storage size | M7 | RQ-035, RQ-044, RQ-045 |
| [RQ-050](tickets/RQ-050.md) | Prepare signed release candidate and rollout | M7 | RQ-046, RQ-047, RQ-048, RQ-049 |

## Completing existing audio integration

RQ-033 can start once the repository foundation and player spike are complete; it defines the shared controller and adapts the current screens. RQ-007–RQ-010 can develop their UI independently, but their completion requires RQ-033 integration. RQ-033 does not depend on those UI tickets, so both start and completion dependency graphs remain acyclic. The JSON field completionIntegrationRequires records these additional completion gates.

Use [START-HERE](../START-HERE.md) for the recommended sequence and [RELEASE](RELEASE.md) for final gates.
