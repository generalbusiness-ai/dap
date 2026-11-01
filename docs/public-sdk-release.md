# Produce the public SDK

The public SDK is eight npm packages that let a program outside this
repository build, sign, shape and replay dap records. Two scripts produce
it. `scripts/public-release.mjs`, the producer, builds and packs the
packages into a staging directory. `scripts/check-public-release.mjs`,
the checker, inspects what the producer staged. Neither script publishes,
installs application packages, configures accounts or deploys a service.

Read [Test dap](testing.md) first. The evidence rule there applies to
every run on this page.

## Versions

The sources in `packages/*/package.json` carry version `0.1.0-dev.1`.
The producer stamps the version you give it with `--version`, and the
reviewed release uses `0.1.0-dev.2`. On 30 October 2026, `npm view`
showed `0.1.0-dev.2` for `@generalbusiness/dap-contract`,
`@generalbusiness/dap-derive`, `@generalbusiness/dap-bytes`,
`@generalbusiness/dap-platform`, `@generalbusiness/dap-client` and
`@generalbusiness/dap-replay`. It found no `@generalbusiness/dap-package-graph`
or `@generalbusiness/dap-git`.

## Run the producer and the checker

Run the scripts only after a reviewer has approved the exact producer
source and the tool view, and has released the run.

1. Make a clean checkout of the reviewed head.
2. Make a new evidence directory outside the checkout, as
   [the evidence rule](testing.md#the-implementation-note-and-its-evidence)
   says: `~/play/artroom-evidence/<date>-<head-slug>/`. Use its absolute,
   canonical path. The staging directory goes inside it, and must not
   exist yet.
3. Prepare the tools from the reviewed lock. Never install a tool in a
   checkout. For `--npm-cli`, give the pinned npm's own
   `bin/npm-cli.js`, not a shell wrapper, and give its exact version.
4. Run the producer:

   ```
   node scripts/public-release.mjs --source /absolute/clean/checkout --head <full-commit> --version <reviewed-version> --output <evidence-directory>/sdk-stage --npm-cli /absolute/npm/bin/npm-cli.js --npm-version <exact-npm-version>
   ```

   It prints `SDK producer output sealed` and writes
   `sdk-stage/release-manifest.json`.
5. Put the reviewed native capture in the evidence directory. See
   [The native capture](#the-native-capture).
6. Run the checker with the pinned native esbuild binary:

   ```
   node scripts/check-public-release.mjs --manifest <evidence-directory>/sdk-stage/release-manifest.json --native-capture <evidence-directory>/native-capture.json --native-capture-sha256 <reviewed-SHA256> --esbuild /absolute/pinned-native-esbuild/bin/esbuild --esbuild-sha256 <reviewed-SHA256>
   ```

   It prints `Compiled SDK output checked` and writes its result to
   `sdk-stage/checks/result.json`.
7. Write `SHA256SUMS`, make the evidence directory read-only, and commit
   its manifest, as [File the evidence](testing.md#file-the-evidence)
   says. The checker's result is the proof. Producer output alone is not
   a pass.

If a run fails, keep the staging directory and its diagnostics. Fix the
source and send the new head for review. Do not retry, widen a deadline
or publish. The next run needs the affected source and compiler checks,
one build and output check, and one gate at the changed head. Do not
repeat platform permutations.

## Publish the packages

Publishing is a separate step with its own authority. The release owner
assembles and checks the sources and the artifacts. A separately
verified namespace administrator publishes to npm. A GitHub App's
authority gives no npm publishing rights. An operator controls each
deployed service: its HTTPS URL, version, bindings, migration and real
provisioning.

Publishing the eight packages is not atomic. Publish the whole set, and
check every public version and integrity before you call it a
coordinated release. A consumer installs the published registry
packages, with a public lockfile. Producer stages and local tarballs do
not take their place.

## What the release contains

### Packages

The eight packages, in build order:

1. `@generalbusiness/dap-contract`
2. `@generalbusiness/dap-bytes`
3. `@generalbusiness/dap-derive`
4. `@generalbusiness/dap-package-graph`
5. `@generalbusiness/dap-git`
6. `@generalbusiness/dap-platform`
7. `@generalbusiness/dap-client`
8. `@generalbusiness/dap-replay`

Every coordinated source dependency must equal its source package's
version before the producer maps it to the release version. Staged
manifests carry the eight names, the coordinated dependencies at the
selected version, and the dap repository and homepage.
[`scripts/public-release.json`](../scripts/public-release.json) holds the
plan: each package's exports, excluded source exports and dependencies.

The command is `dap`, and `artroom` stays an alias. The
`artroom-replay` command, `ARTROOM_HOME`, `refs/artroom/`, protocol
names and Worker names do not change.

### Exports

The export and dependency lists are exact. An unknown export, an unknown
dependency, a changed exclusion or a changed pin refuses the release.
Each export lists `types` before the JavaScript `default`.

The table holds the plan in `scripts/public-release.json`. The release that
npm serves at `0.1.0-dev.2` is older: platform and client export only `.`,
and derive exports `.`, `./rule` and `./testing`.

| Package | Planned exports | Excluded source exports | Coordinated dependencies |
|---|---|---|---|
| contract | `.` | | |
| bytes | `.`, `./web` | | contract |
| derive | `.`, `./rule`, `./field-types`, `./testing` | | bytes, contract |
| package-graph | `.` | | contract, derive |
| git | `./tree-proof`, `./checkout-types`. No root export | `.` and every other subpath | bytes, contract |
| platform | `.`, `./membership-actions`, `./application`, `./application-v2`, `./package-validation` | `./testing`, `./application-install` | bytes, contract, derive, package-graph, git |
| client | `.`, `./application` | | bytes, contract, platform |
| replay | `.` | `./git` | bytes, contract, derive |

The third-party pins are `@noble/curves` and `@noble/hashes` 2.4.0, and
jsonata 2.2.2.

**Git.** The two subpaths need five unchanged pure source files:
`tree-proof.ts`, `checkout-types.ts`, `reader.ts`, `ascii.ts` and
`pure-names.ts`. The source allowlist accepts only those files. Every
other tracked Git input goes to an excluded evidence directory, outside
the compiler's inputs. The output and declaration checks refuse any
other Git module, including Node and host transports. The internal
`Reader` has no public export. Platform uses the pure object parsers at
runtime, and its public `StageSnapshot` extends `OwnedCheckoutSnapshot`.
Git's hash dependency stays pinned to `@noble/hashes` 2.4.0.

**Platform.** The excluded `./application-install` rules stay inside the
hosting Worker. The exclusion removes them from the export map, not from
the compiled platform code. Platform also carries the canonical
`skills/dap-application` tree. The producer copies its committed bytes
and file modes into the platform stage and lists `skills` in the
package's files. The release manifest records each file and the tree
digest. Installing the repository plugin stays the main way to install
the skill.

**Replay.** The root export holds the portable library and the pure
command function. The Node process wrapper `src/bin.ts` and `src/git.ts` are
copied only into an excluded evidence directory, hashed, and kept out of
the compiler's inputs and the public output. The release has no
`artroom-replay` executable. Replay's source-only dependency on platform
serves that wrapper. The checker checks its exact pin and removes it
from the published manifest.

**bytes/web.** `bytes/web` is a types-only, opt-in ambient declaration,
with no exported types and no runtime module. Do not add it to a
consumer's default globals. The client's narrow WebCrypto declaration
compiles the client's input and is not added to a consumer's globals
either.

**derive/rule.** `RULE_PROFILES` supplies the restricted-rule validator.
It pins jsonata 2.2.2 and its engine fingerprint. The default profile
table does not check rule syntax. Call
`validateDefinition(value, bounds, RULE_PROFILES)` for declared input,
without `platform: true`. A pass grants no authority and does not show
that a deployed runtime supplies every capability or platform rule.

**derive/testing.** The release keeps the compiled fixture export. It
uses fixed keys, made-up grants and scopes in memory. It is not a test
SDK for native membership or a private Worker. The producer includes
only that fixture and the production code it needs. The fixture clones a
`DeclaredDefinition` with the native one-argument `structuredClone`,
declared privately in its own module, with no polyfill and no global
type.

## What the producer does

The producer copies each tracked SDK input into an owned build root
outside the checkout and keeps an exact original and a compiler-input
copy. The root holds the copied, pinned third-party dependencies and the
dap stages already built, and no source-workspace alias or dap fallback
link. The compiler's file list stays inside those inputs and the pinned
compiler's own directories.

For each package, in order:

1. A resolution-only pass, `--listFilesOnly --noEmit`, records the
   canonical input paths and their hashes.
2. TypeScript 7.0.2 emits ES2022 ESM and declarations, without maps. The
   file set and input hashes must match the first pass.
3. The producer converts relative declaration module specifiers to `.js`
   where needed, checks each one against a real `.d.ts` file in the same
   stage, and records the rewrite in the manifest.

The producer and the checker share one reader of module references. It
finds literal `import`, `export`, type and dynamic module references, and
does not read strings or comments as module clauses. Declaration
rewriting changes only those literal offsets. A computed module form is
refused. `node --test scripts/public-release-modules.test.mjs` runs its
witness.

Each stage holds its manifest, `dist`, README, LICENSE and NOTICE. The
producer packs offline, with scripts turned off, an owned npm cache and
empty owned user and global npm configuration files. It sends no
registry query. Before it seals the release manifest, it checks the
checkout's HEAD, its clean state and the copied bytes again. The
manifest records the source, tree, lock, tool, input, dependency and
file identities, and each tarball's length and SHA-256 and SHA-512
integrity.

## What the checker does

The checker compares each tarball's contents with every staged file, and
checks both input copies against the original bytes. It never installs
the tarballs and never loads raw SDK TypeScript. Then it runs one
journey through the compiled output: bytes, signing, client shaping,
declaration and rule validation, the jsonata engine, the testing
fixture's clone, and a replay of the native capture. It checks the
types in three strict contexts, NodeNext, Bundler and the opt-in ambient
declaration, each with `skipLibCheck: false`. Last, it bundles the same
replay journey for a browser.

### The native capture

The capture is a public journal recorded from the first rules
publication of `packages/scope/test/creation-real.test.ts`, before its
scripted lane facts. To record it, run that file alone with
`DEMO_RECORD=1`, under a reviewed capture plan. The test prints numbered
`PUBLIC-SDK-NATIVE-CAPTURE` base64url chunks and an end marker. Extract
only that channel into a new file in the evidence directory, and seal
its bytes with the tested source, the target and the native run before
the checker reads it. The gate leaves recording off.

The test refuses the whole capture, before any marker, when a decoded
entry or retained input holds a credential field, or when the text holds
a known fixture secret or the session secret. It never redacts hashed
bytes. The capture's directory genesis and summary must match the exact
`DIRECTORY` pin. A retained entry's `under` holds
`platformName(DIRECTORY)`: the platform prefix with no version.

The checker binds the capture to the SHA-256 you give it. Its replay
must match the capture's own native report: the target, full coverage of
the target, the verified foreign dependencies and the trust labels. A
missing dependency, and trust in an authority, an anchor or a target
head, must be absent explicitly. A consistent replay alone does not
imply them. With the directory source removed, the replay must report
the exact missing dependency, with no anchor or test-authority grant in
its place. The capture comes from a local fixture with real Durable
Objects and SQLite and a stand-in Git host. It shows nothing about a
deployed service.

The public platform catalog must match every target and foreign genesis
pin that the capture selects. Do not infer platform versions from
`NEWEST`. Supply the real `hold@1` and `git-read@1` code where the
journal needs it.

### The browser bundle

The checker checks the esbuild 0.28.1 binary against the SHA-256 you
give it, before and after use. The bundle's metafile may name only the
journey, the compiled stages and the copied dependencies, with no
external module. It accepts one exception: the synthetic `<runtime>`
input edge that esbuild adds for jsonata's helper import, in its exact
path, kind and three-field shape. The bundle shows that the browser
closure builds. It does not run in a browser. Packaging does not establish
browser cross-origin access. The producer adds no CORS, grant, hosting or
onboarding protocol, and no universal durable outbox.

## Source

Checked against main `5dc9765f` on 30 October 2026. Sources:
[`public-release.mjs`](../scripts/public-release.mjs),
[`check-public-release.mjs`](../scripts/check-public-release.mjs),
[`public-release-modules.test.mjs`](../scripts/public-release-modules.test.mjs),
[`packages/platform/package.json`](../packages/platform/package.json),
and `npm view` on 30 October 2026. The commands on this page were not
run for this revision.
