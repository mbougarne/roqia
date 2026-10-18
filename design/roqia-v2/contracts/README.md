# Data and resource contracts

These JSON files describe future interfaces; they are not runtime configuration and are not imported by the app. Draft catalog entries are intentionally non-installable until acquisition tickets supply real files and validation.

- catalog.schema.json: draft/release content-pack metadata and file integrity contract.
- catalog.draft.json: selected sources and unresolved acquisition fields; no fabricated download URLs or hashes.
- key-registry.json: separate namespaces for routes, UI copy, content, storage, jobs and notifications.
- records.json: logical fields/constraints for local metadata records.

Only an entry with status ready, a real source version, required attribution, valid assets and completed validation evidence may be published to an installable catalog. Do not promote draft to ready because the source home page loads. IDs do not encode translated display text.

The schema checks shape. Semantic validators must also check edition compatibility, unique assets, HTTPS host allowlist, version monotonicity, byte totals, checksums, 114-surah completeness where claimed, canonical text round-trip and capability/file consistency. Runtime consumers reject unknown schema versions safely and retain the last-good installed content.
