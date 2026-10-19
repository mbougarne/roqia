# Code quality

Use Node 24 (the version files at the repository root), Yarn 1.22.22, Python
3.11 or newer, and JDK 21. Swift checks also need a Swift 6 or newer toolchain
with `swift format`, supplied by Xcode on macOS. The style-only Gradle project
uses the existing wrapper without configuring Android or requiring an Android SDK.

```sh
yarn install --frozen-lockfile
yarn quality:setup
yarn format
yarn quality
yarn test:regression
```

`quality:setup` installs pinned Ruff and clang-format releases into
`.venv-quality`; it does not change the system Python installation.
`format` applies ESLint fixes and formatting. Review its diff before committing.
`quality` checks lint, formatting and TypeScript without changing source files.
CI checks the same source families on every PR and on `main`.

| Source | Lint/style check | Formatter |
| --- | --- | --- |
| JavaScript, TypeScript, React, web JSX | ESLint 10, typescript-eslint, React and Hooks rules | Prettier 3 and ESLint import/spacing rules |
| CSS, HTML, workflow YAML, selected configuration JSON | Prettier check | Prettier |
| Python tools | Ruff correctness and import rules | Ruff format and import sorting |
| Java | Spotless check | google-java-format, grouped imports |
| Kotlin and Gradle Kotlin scripts | Spotless/ktlint check | ktlint (ready for future Kotlin sources) |
| Gradle Groovy scripts | Spotless check | Groovy-Eclipse |
| Objective-C / Objective-C++ / headers | clang-format dry run | clang-format |
| Swift | `swift format lint --strict` | `swift format format` |

Native checks enforce source style; they do not replace compiler checks, Android
Lint, device testing or an iOS build. The Swift check uses the host toolchain;
the other formatters and ESLint dependencies are pinned in the repository.

## Imports and spacing

ES modules use separate blocks for Node built-ins, third-party packages, and
local modules, in that order. Imports are alphabetized within each block, with
a blank line before declarations. Functions and exports have separating blank
lines. Side-effect imports retain their position when automatic reordering
would cross them.

CommonJS test adapters deliberately install loaders and native-module stubs
between `require()` calls. Their execution order is preserved rather than
automatically sorted. They still receive lint and whitespace checks. Existing
untyped native/navigation boundaries and intentional empty catch blocks are
allowed; the configuration documents these exceptions.

## Focused commands

- `yarn lint:js`, `yarn lint:python`, `yarn lint:native`
- `yarn format:js`, `yarn format:python`, `yarn format:native`
- `yarn format:check`, `yarn typecheck`
- `node tools/quality/native.cjs check jvm` (Java/Kotlin/Gradle)
- `node tools/quality/native.cjs check objc`
- `node tools/quality/native.cjs check swift`

Use `apply` instead of `check` in the native commands to format that family.
On Linux, run the JVM/Objective-C commands separately; run Swift checks on a
host with the Swift toolchain. CI includes a separate macOS Swift job.

## Protected inputs and evidence

Canonical religious text (`src/data`), content JSON, source archives, dependency
patches and their hash manifests, media, generated output, and historical
design/verification evidence are excluded from automatic formatting. Root
`package.json`, `app.json`, `tsconfig.json` and `web/package.json` are the
configuration JSON exceptions. Installed dependencies, build directories and
tool caches are also excluded. Vendor wrappers, Ruby/CocoaPods configuration,
and Android/iOS resource XML are outside this source-formatting baseline.

`docs/implementation/`, `docs/feasibility/` and `design/` contain saved evidence
and references, so linting and formatting leave them untouched. The current
configuration excludes the entire `docs/` tree.

Keep maintained code in `tools/` covered: regression tests, content importers
and validators, dependency-patch scripts, and quality tooling can affect the
application or its verification. Exclude historical device capture/probe code:
`android-*.py`, `verify-android.py`, `androidProbe.ts`, the feasibility probe
screens/launcher, the phase-4 probe/check harness, the UI hierarchy helper and
the phase-12 gallery generator. Their original sources are preserved in this
PR. Generated fixtures, source data and patch files also remain untouched.
These exclusions affect linting/formatting; they do not disable regression
tests or content-integrity checks.

Run existing source-integrity tests when updating content. The complete local
Python regression suite additionally checks Quran font coverage using the
prepared source packs in `.roqia-feasibility`; CI runs the portable Python and
native tests without downloading those private maintainer fixtures.

The legacy `yarn test` Jest setup is separate: it currently discovers Node-runner
tests and lacks the native mocks needed by its app-render scaffold. Use
`yarn test:regression` for the maintained Node suites; this PR does not rewrite
the old Jest harness.

Editors can read `.editorconfig` and the formatter configurations at the root.
Use the repository's Prettier/ESLint installations and the local virtual
environment's Ruff/clang-format to match CI.
