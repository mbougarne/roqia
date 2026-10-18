# Gap register

This is a source-backed planning review, not a claim that every behavior was reproduced on a device. Existing strengths are retained: scoped counter contexts, original adhkar indices during filtering, native navigation, some accessible controls, local devotional content and existing notification deep-link handling.

| ID | Evidence / missing capability | Impact | Resolution |
| --- | --- | --- | --- |
| G-01 | getRepeatItemKey in src/store/index.ts uses text, metadata and array index | Reordering/correcting content can lose counter association | RQ-004, RQ-005: stable IDs and legacy mapping |
| G-02 | persistence.ts accepts numeric nonfinite values other than NaN, has no upper count bound, merges unknown keys and uses a 512 MiB guard | Invalid values and excessive/stale payloads are not bounded sensibly | RQ-005: validation, bounded records and retained recovery backup |
| G-03 | App.tsx writes whole count state on each update; persistence errors are swallowed | Save ordering/failure is not surfaced or proven | RQ-004, RQ-005: serialized durable writes and recoverable status |
| G-04 | Main navigation is gated by splash rather than isStateHydrated | Startup can render before stored state/education decisions settle | RQ-006: hydration barrier and pending-link sequencing |
| G-05 | Home uses Track Player; Adkar/DevotionalList use react-native-video | Competing session models and inconsistent lifecycle behavior | RQ-032, RQ-033: one shared controller |
| G-06 | Playback errors commonly call the finish handler or are ignored | Failure looks like normal stop/completion | RQ-033, RQ-045: typed errors and retry/file recovery |
| G-07 | Home's isPlayerVisible requires not paused; screens stop playback on blur | Paused controls disappear and navigation breaks continuity | RQ-033, RQ-035: persistent mini/full player and explicit stop |
| G-08 | initializeDailyReminders requests permission on startup | Prompt precedes a meaningful user action | RQ-006, RQ-014: contextual permission request |
| G-09 | notifications.ts hard-codes three times and daily frequency | No user-selected schedule, weekdays or effective-state UI | RQ-014, RQ-044 |
| G-10 | mode is only light/dark and device mode is read as initial default | No persisted system-following preference | RQ-002, RQ-012 |
| G-11 | StyledText consumes children/customStyle and drops other TextProps | Callers' accessibility/selection/scaling props do not reach Text | RQ-002, RQ-015 |
| G-12 | Header includes 36 sp title; some controls are 36 dp; background textures cover reading | Conflicts with compact design and target sizes | RQ-002, RQ-007–RQ-015 |
| G-13 | Navigation has two tabs plus drawer and untyped any paths | New features need consistent hierarchy without losing old deep links | RQ-003 |
| G-14 | No stable content-source registry/editorial validation report | Provenance and corrections need a repeatable process | RQ-018, RQ-030, RQ-047 |
| G-15 | 188 bundled MP3s (~73.7 MiB) in current checkout | App size and later download migration need measurement | RQ-049; preserve current offline core initially |
| G-16 | Only a basic render smoke test is present in __tests__/App-test.tsx | Upgrade, lifecycle and native behavior lack demonstrated acceptance | RQ-001, RQ-046–RQ-050 |
| G-17 | Quran corpus, edition switching, translation/search/bookmarks absent | New core functionality | RQ-016–RQ-030 |
| G-18 | Selective downloads, integrity checks, recovery and storage UI absent | Offline optional-content architecture required | RQ-019–RQ-022, RQ-034–RQ-035 |
| G-19 | Prayer engine, location selection, Qibla and per-prayer adhan absent | New local calculations and native permissions/services | RQ-036–RQ-044 |
| G-20 | Generated references differ in icons, headings and example data | Blind screen copying would create inconsistent behavior | RQ-002, RQ-045, RQ-046; tokens/specs take precedence |

Historical discussion identified usability gaps and new functionality; this register captures what can be substantiated from the current checkout plus the complete approved 48-screen catalog. It does not label hypothetical historical defects as currently reproduced bugs.
