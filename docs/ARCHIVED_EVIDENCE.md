# Archived design and verification evidence

`design/`, `docs/implementation/` and `docs/feasibility/` are historical
references, screenshots, recordings and verification reports. They are no
longer tracked and are Git-ignored. Existing local copies are preserved.
Untracking them does not rewrite Git history or reduce an existing clone's
historical object storage.

The complete archive is retained in the existing main-branch commit
`b4c8644b6cdf72e30eb32ea0985a4df1efbec484`:

- [Design references and planning](https://github.com/mbougarne/roqia/tree/b4c8644b6cdf72e30eb32ea0985a4df1efbec484/design)
- [Implementation evidence](https://github.com/mbougarne/roqia/tree/b4c8644b6cdf72e30eb32ea0985a4df1efbec484/docs/implementation)
- [Feasibility evidence](https://github.com/mbougarne/roqia/tree/b4c8644b6cdf72e30eb32ea0985a4df1efbec484/docs/feasibility)

To restore an optional local archive from that history:

```sh
git archive b4c8644b6cdf72e30eb32ea0985a4df1efbec484 design docs/implementation docs/feasibility | tar -x
```

Application builds, CI and maintained tests must work without these folders.
The following inputs remain tracked, with their original bytes:

| Input | Tracked location |
| --- | --- |
| Application colors, layout and typography | `src/design/tokens/*.json` |
| Debug-provider audio inventory and fixture preparation | `tools/feasibility/fixtures/audio-inventory.json` |
| Prayer source checksums and provenance | `tools/phase6/habous-sources.fixture.json` |
| Historical recording verification fixture | `tools/phase8/audio-verification.fixture.json` |
| Official Beni Mellal timetable HTML fixture | `tools/reader-prayer/fixtures/beni-mellal-source.html` |
| UI font license (already tracked before the cleanup) | `src/assets/fonts/OFL-NotoSansArabic.txt` |

Generators and tests use these tracked locations. `tools/` remains versioned,
including the scripts and manifests needed to patch dependencies during
installation and Android builds. The old screenshot-gallery generator is an
optional archive consumer and still needs the local design-reference archive.

New private captures and device backups belong in `.roqia-feasibility/`.
