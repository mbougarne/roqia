# Upgrade and persistence migration

The existing app stores @roqia/app-state (mode and repeatCounts), @roqia/walkthrough-seen and @roqia/intro-note-seen in AsyncStorage. Repeat keys concatenate scope, category, caption, audioFile, content and array index. Any reorder or text correction can therefore break identity.

## Stable identities first

Assign permanent IDs to every existing devotional item. Prefer explicit IDs such as devotional.ruqya.0001 and devotional.adhkar.morning.0001; do not regenerate them from current text or position. Keep source/revision metadata separately. Produce a checked-in mapping from every legacy persisted key to a stable ID, derived from the exact pre-migration datasets. Include historical released datasets if they differ from the current checkout. Do not guess matches by similar Arabic text.

The current AdkarScreen correctly retains each item's original full-array index while filtering categories. Preserve that behavior during migration; do not derive legacy keys from a filtered-array index. Check released datasets before assuming they match this checkout. If a historical release produced two proved key forms for the same item, retain both in the backup and define a documented conflict rule; never infer identity from a count or similar Arabic text. Unknown keys remain in the backup and are reported in development diagnostics, not silently mapped to another item.

## Idempotent migration transaction

1. Read legacy values without modifying them. Record schema and a SHA-256 checksum of the raw payload in a local backup. Parse with a realistic bounded input size; reject nonfinite values, clamp known counts to integer 0..defaultRepeat.
2. Prepare schema version 2 in the local metadata DB. Seed defaults only for absent items. Import known counts and preserve existing light/dark preference. Existing explicit modes stay explicit; fresh installs default to system.
3. Import walkthrough/guidance flags. Existing users do not repeat first-run education; optionally show a skippable “what is new” entry separately.
4. In one DB transaction write migrated settings/counts and a completed migration marker with input checksum. If any step fails, roll back and continue using the legacy reader with a recoverable error; never clear storage.
5. After commit, hydrate UI from the new repository. Do not run new-state persistence before hydration and migration complete. Serialize writes so older asynchronous saves cannot overwrite newer state.
6. On next launch, verify the marker and data integrity. Keep legacy keys/backup for at least one release. A future cleanup is its own reviewed ticket; never delete unrecognized user data during startup.

## Additional migrations

Migrate existing notification IDs deliberately: cancel adhkar-morning-0600, adhkar-night-1800 and adhkar-before-sleep-2230 only when replacement preferences/events are saved. Preserve their current times 06:00, 18:00 and 22:30 for existing users. The mockup 07:00/18:00/22:00 values are sample/new-user suggestions, not grounds to silently change current reminders. Query effective OS permission separately; migration must not show another permission prompt on launch.

Existing audio is bundled (188 MP3 files, about 73.7 MiB in this checkout). Keep it for the initial redesign. Optional downloadable devotional packs may reduce a later app bundle only after verified equivalence, appropriate source metadata and a working offline upgrade path. Do not auto-download a replacement over cellular or delete existing offline capability.

Edition pack updates install beside the old version. Validate the new pack, switch the active registry entry transactionally, then clean the old version when no reader/player references it. Bookmark migration requires an explicit edition revision map; leave unmapped bookmarks visible with a recovery explanation. Deleting audio does not delete Quran bookmarks or reading positions.

## Required proof

Test a real in-place update from the released package using the same application ID/signing identity; fresh install alone does not qualify. Seed nondefault counts across all categories, different theme, seen/unseen education flags and active reminders. Cover filtered-index collisions, changed text/order, corrupt JSON, Infinity-like parsed values, missing keys, repeated migration, disk failure and interruption before/after commit. Confirm reset-page and reset-all scopes remain correct after migration.

## Phase 3 counter commands

`src/repositories/counters.ts` owns atomic decrement/reset transactions. The UI acknowledges a new remaining value only after the transaction commits; completion announcements follow that acknowledged transition. A failed command leaves the displayed value intact and offers retry. Theme/UI settings are persisted independently. Do not reintroduce a whole-counter React persistence effect: an older asynchronous UI snapshot can otherwise overwrite newer command results.

The legacy full-snapshot persistence helper remains available for compatibility and repository checks. It compares values inside its serialized transaction and leaves unchanged counters alone. It is not the live reader/tasbih write path.
