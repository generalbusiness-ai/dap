# Lending shelf publication by an appointed member

P1 is request `bea87570`, under promise `3acac812` and the ratified note
`notes/2026-11-13-publisher-member.md`. The standalone checkpoint below
records actual-main composition and dependency setup on 2026-11-14.
It preserves earlier development/control results at their original heads;
the standalone Lending compiler and directory control later passed at
`146dcb26`. The full gate and checker review remain unrun.

The separate definition and publisher live in
`examples/lending/publisher/`. They add optional publisher, repository,
head and cursor slots, the four guarded publication acts, derived roles,
the five-row publication map, a deterministic journal fold, a local bare
Git port, a publisher script and a reader script. Scope exchanges use the
client library. IPC witnesses use real Node children and file custody,
with the parent owning the in-memory judge. Membership rows and read
credentials are scripted and grant no enrollment or production-authority
claim.

## Decisions and source-review repairs

Ruling `36915a7c` places the new reporting action in P1's own role table.
P1 derives that table from the shipped Lending roles and changes no
shipped definition, role table, manifest, package input, pin or release
constant. Its package identity is
`ai.generalbusiness.lending.publisher@0.1.0`; P1 makes no release,
signature or trust row. Rulings `ced41b00` and `b976446a` permit the source
layout and existing test/compiler include edits. No kernel file changes.

Ruling `d2d431a9` limits the first script to local bare Git. The room's
owner carries the local branch to a remote Git host with their own Git.
P1 reads no Git credential and builds no authenticated remote connector;
P2 owns credential delivery.

Source-only finding `365ad077` identified two errors at baseline
`45421de7`. The repairs preserve the existing assertions and add two
owning witnesses.

1. The reader recognized a staff-adopted baseline only when it lacked a
   publisher trailer. It now checks the object's identity and commit
   syntax, then honors the exact recorded adoption before interpreting
   that trailer. An adopted foreign trailer is opaque baseline data. An
   unadopted foreign trailer and a corrupt adopted-object read still
   refuse. This preserves the existing adopted-set semantics.
2. The fold bounded files but could add more directory path occurrences
   than `snapshotFiles` can read. Before applying a mapped write, it now
   counts existing directories, prospective new prefixes and the root
   against `SNAPSHOT_BOUNDS.trees`. An excess write changes neither map
   and appears in the deterministic message as `tree-limit`. Aliased Git
   objects do not reduce that traversal count.

The new adoption witness uses a small real bare repository: an external
writer supplies a foreign trailer, the unadopted branch refuses, staff
adopt it, and a legitimate child publication becomes readable. A single
labelled corrupt-read substitution checks that adoption still follows
integrity validation.

The directory witness runs the pure fold over a baseline file list at
`SNAPSHOT_BOUNDS.trees` including the root. Its many directory paths alias
one leaf tree, so the baseline has only two distinct tree objects and
requires no large on-disk fixture or Native item count. It checks the
exact skipped fact and reason, unchanged tree and message, then accepts a
write from the adjacent lower directory count.

## Historical validation plan at `f3765537`

The existing owner is
`examples/lending/publisher/publisher.test.ts`, included by the existing
Lending Vitest configuration and TypeScript context. All original nine
required witnesses and earlier supplemental assertions remain. The two
new full titles are:

- `the reader honors an adopted foreign trailer after integrity checks and refuses it before adoption`
- `the fold skips a write beyond the directory bound and accepts the adjacent tree count`

| Check | Planned boundary | Result |
|---|---|---|
| Compiler | `examples/lending/tsconfig.json` | UNRUN |
| Owning witnesses | `publisher/publisher.test.ts` in the existing Lending project | UNRUN |
| Affected existing Lending owners | Existing included definition, shelf and browser cases | UNRUN |
| Directory control | Replace `if (1 + directories.size + introduced.length > SNAPSHOT_BOUNDS.trees)` with `if (false)`; the tree-limit assertion must fail | UNRUN |
| Gate | One final gate at the review head | UNRUN |

At that source checkpoint, these checks remained unrun. Later results
below keep their actual head and input qualifications. Source reads and
Git diffs supply no runtime or compiler result.

## Open limits

- P1 request `bea87570` still owes one gate and checker review. The bounded
  standalone development/control results below do not supply those results.
- P1 uses the local Git path of `d2d431a9`. P2 owns remote credential
  delivery and later replacement of the shipped Lending package.
- The in-memory witnesses expose scripted membership and read authority.
  They establish no native enrollment, session renewal or real member
  revocation behavior.

## Historical source composition onto AE-1

The local branch `builder/p1-on-ae1-combined-source-20261114` starts at
AE-1 source `327191d447dd53fc2ae964d9d066ed5eecad33bb`, which carries
CB-1 source `8b1a37344c01a2611f92f8ad37dd3be97528d957`. This prepares
dependencies before their actual main integration. It does not claim
that either feature has landed.

Only two own commits enter this composition:

| Original commit | Composed commit |
|---|---|
| `45421de7d32ad4e5d5303c029fb261313392ea05` | `ec00a3a77411f1bc25c7dd22280c87cebd4b4f33` |
| `f376553740107d0b874b48ad105728b259441e6b` | `d907497f946e3235668d5f2063e54a8aeecc22cc` |

Both replay without conflicts. No dependency merge enters the branch.
Before this note update, all 18 P1-owned files match the original final
source exactly. The publisher, IPC children, file custody, reader,
adopted-baseline repair, directory bound, and every existing witness keep
their original bytes. The original branch and preservation ref
`builder/p1-before-ae1-composition-20261114` still name `f3765537`.

Rulings `36915a7c`, `d2d431a9`, `ced41b00`, and `b976446a` still govern
the separate metadata and local bare Git boundary. The shipped Lending
package, Grow packets, identifiers, trust, hosted configuration, and
operator values match the AE-1 base. No kernel or client-library source
changes. The only shared Lending edits remain the two accepted compiler
and test includes. No frontend or DOM source needs adaptation.

This composition remains **UNRUN** and has no dependency view. No
compiler, test, control, publisher Git program, generator, pack, model,
build, install, signing, network request, push, or deployment ran. Actual
main integration, owning development checks, the promised directory
control, the final gate, and checker review remain owed under the same
P1 request and promise. The earlier unrun history above remains unchanged.


## Standalone actual-main checkpoint on 2026-11-14

Source commit `54792a3a0ae333ff376cdeb185f411fc468e17da`, tree
`f063ea55369994f7038600620817e953ead82885`, starts directly at actual main
`26d1e65cd9a6815abc70c832f1e61b893bb8b689`. Its only parent is that main.
The new branch is `builder/p1-on-main-standalone-20261114`; the worktree is
`.builder-worktrees/p1-on-main-standalone-20261114`. This composition
extracts only P1's 18 owned paths. It carries no AE1 feature ancestry or
source, expectations or tests. Both old P1 branches, their dependency
views and all prior raw results remain intact.

The exact own source set comes from `327191d4..9df2c223`, not a diff of
the later `7858ce9e` dependency merge. All 18 extracted blobs matched
`9df2c223` and `7858ce9e` at the source commit: the 15 files under
`examples/lending/publisher/`, the two accepted Lending include edits and
this note. The five later P1 repairs retain read/custody narrowing,
concrete types, IPC close ownership, canonical fixture/session times and
the external fixture-head fetch. Only this later note update changes the
historical note blob. Main's two config blobs matched the pre-P1 base, so
both include additions applied without conflict or changed compiler options.
Root's current `lending` project still extends that existing Vitest config.

All 17 root/workspace manifest and lock bytes matched actual main and the
authentic C2 donor at
`.builder-worktrees/c2-lifecycle-repair-20261114`, source
`47760bdbf831cef5e72f6c57a024811da3ec508c`. Main now carries the client to
Derive workspace edge. Its actual lock and the donor's existing stamp are
`8b2ae5f7108ce36cf84753d99d4248d59cc21251d5e01da3da37a111bb495e20`.
The old P1 `f2885ca5` view was not reused or restamped. After confirming
that the new target had no `node_modules`, one `/bin/cp -cR` from the
matching authentic C2 view exited 0. The copied stamp stayed exact;
15 actual relative workspace bindings resolve inside the new worktree,
with matching package names and 57 existing unique source export targets.
Root and client cache namespaces are real owned directories. No package
install, module import, tool probe or project check ran in this setup.

The shipped Lending descriptor, definition JSON/source, roles, pin,
scenario, browser sources/assets, release identifiers, manifests and
signatures retain actual main's bytes. New publisher files are not
reachable from those shipped browser roots. The two allowed include edits
preserve compiler options. The canonical browser builder still uses normal
esbuild module/tsconfig resolution: this source comparison does not prove
emitted identifier equality. No pack, producer, version change, signing or
release refresh occurred. Ruling `ced41b00` still requires a planner question
if packing reaches a newly changed shipped input.

The source imports existing public Client/node custody, Git/node,
Define, Contract/Bytes, Derive/rule/testing, Replay and CLI file/signer
helpers. It imports no AE1 archive API. Current main retains those public
names, but its C2/client and earlier Define/derive changes meant the prior
compiler/owner results could not establish standalone readiness. At this
source/setup checkpoint, the new compiler and owner remained unrun; the
later standalone results appear below with their actual tested head.

The most recent prior control is act
`d3e2e86244358e4bd303e46d0776171a4bd63811`, at clean `7858ce9e`, tree
`7dcf99a402674dac6800d383700bed8fb6644a53`. The Lending compiler passed
in 0.361 s; compatibility passed in 0.089 s without copying. The whole
publisher owner ran once as each control arm: baseline child exit 0 with
13 passes; mutant child exit 1 with 12 passes and one assertion failure;
helper exit 0 **DISTINGUISHES**, wall 26.261 s. The actual fault changed the
unique directory comparison from `>` to `>=`. The existing directory-bound
case failed directly at line 387: the adjacent accepted write returned a
`tree-limit` skip instead of the expected empty list. No name filter,
separate positive owner or third green ran.

Those raw results remain under
`/Users/hughpyle/play/artroom-evidence/2026-11-14-p1-directory-control-attempt1`;
`tmp/artroom-control-txamDj/before.json` has SHA-256
`e334d223f4beb42625b937ea3a85a1931f4c4c41d9518c399487f6f6f01094cd`,
and `after.json` has
`83a869719a95484b233fabb732ed13f6a8fc0bba9d44334ccd04142902ea0774`.
The control restored `fold.ts` SHA-256
`0511e0f891971f232b5eba2fe9031bb01a99cfe1bdda23f97c775401feb88f8e`
and mode `0644`; the owner SHA remained
`b3929103b47ac0dfa3b2619b65e75b5ce24856906b7e20cfdba0a65bd33c06ee`.
These P1-owned source bytes enter the standalone checkpoint unchanged.
The checks used local bare Git and IPC with scripted membership/read
authority. They establish no network, credential/Gateway, hosted-room or
operator acceptance. At that note-only checkpoint, the standalone
compiler/owner, full gate and checker review remained **UNRUN**.

## Standalone development and control on 2026-11-14

END `1bf6851054fa7cfdc085c8dd7804d9945b395ab7` records the clean tested
source `146dcb26a3c7d6558ae21936be47ac7d2ee8e7fa`, tree
`ef2bc8d6822a4ed721c11c71f054dfeb89019fcf`. The run finished at 20:08 EST
on 2026-11-14 (2026-11-15 01:08 UTC). This later documentation commit
changes only this note; it is not the tested head.

Raw directory:
`/Users/hughpyle/play/artroom-evidence/2026-11-14-p1-standalone-development-control-attempt1`.
Its `commands.json` records full structured argv, cwd and environment,
SHA-256 `058e84df676c6c53b5dcf1b448ffd65ed5c66cf02b6709d6f5c40e92a9a36998`.
All three commands ran from the standalone worktree with
`/opt/homebrew/bin/node`. The compiler arguments were
`node_modules/typescript/bin/tsc -p examples/lending/tsconfig.json`;
compatibility used `scripts/cloudflare-pool-compat.mjs`.

The control used the retained helper in that raw directory, changed only
`if (1 + directories.size + introduced.length > SNAPSHOT_BOUNDS.trees)`
to the same condition with `>=`, and required
`--expect 'the fold skips a write beyond the directory bound and accepts the adjacent tree count'`.
Its owner arguments were
`-- . --config examples/lending/vitest.config.ts publisher/publisher.test.ts`.
The `--expect` assertion identifies the required failure; it filters no
tests. Both children ran the whole 13-case publisher owner.

Paths in this evidence table are relative to the raw directory:

| Check or record | Actual result | Evidence and SHA-256 |
|---|---|---|
| Lending compiler at `146dcb26` | PASS; exit 0; 0.714517833 s | `result.json` stage `compiler`; `478eb30aef9a07aea9f807674da068158d3564bb1b30b59f486d2862deacc78e`; both compiler streams retained |
| Maintained compatibility | PASS; exit 0; 0.085508375 s; copied false, before/after equal | Same `result.json`, stage `compatibility`; compatibility streams retained |
| One directory-bound control | DISTINGUISHES; helper exit 0; 26.106929417 s | `control.stderr.log`; `353456df4642772d21b411c98548c284505abe2cf751beef77b86ea279e702d5` |
| Baseline child | PASS; exit 0; 13 passed, 0 failed or pending | `tmp/artroom-control-tXUFy3/before.json`; `bc4f4cb890aea2b8b715f93a13132729ad6bf493a5fece288db2c3f3d48fd793` |
| Fault child | Exit 1; 12 passed, 1 direct assertion failure; none pending | `tmp/artroom-control-tXUFy3/after.json`; `bdbf181569112fe69e6dd98c4b20338165ef9769788cd2c5b97ee5379e9af8d3` |
| Outer result | PASS; exit 0; 26.907420792 s; source restored, owner unchanged | `result.json`; `478eb30aef9a07aea9f807674da068158d3564bb1b30b59f486d2862deacc78e` |

The fault fails the actual adjacent-bound assertion at
`publisher/publisher.test.ts:387`: expected skipped `[]`, received the
`tree-limit` skip. Both arms retain the same 13 identities, with no
filter, separate positive owner, third green, timeout, setup failure or
sweep. Each child's JSON, stdout and stderr remains beside the other raw
outputs.

The retained helper differs from the maintained helper only by
`preserveScratch = false` becoming `true`. The original SHA-256 is
`8d7ba44b672b1c84c2272dd185661c77ecc06b958e59fb83b5b4a0d0562aa818`;
the retained copy is
`d427d567599c45b69c4e7faf55fbf93956602b1ab02d897cd7163dbf2a925140`.
Classification, timeout, runner and restoration logic stay unchanged.
`fold.ts` restored exactly to mode `0644`, SHA-256
`0511e0f891971f232b5eba2fe9031bb01a99cfe1bdda23f97c775401feb88f8e`;
the owner stayed at
`b3929103b47ac0dfa3b2619b65e75b5ce24856906b7e20cfdba0a65bd33c06ee`.
The tested checkout ended clean.

These results cover local bare Git and IPC under scripted membership and
read authority. They establish no network, Gateway, credential, operator,
hosted-room, enrollment, live publication or deployment acceptance. The full
gate and checker review remain **UNRUN**. This note update ran no project
check and changed no publisher, package, configuration or dependency byte.

## Source refresh onto published main on 2026-11-15

The new worktree `.builder-worktrees/p1-on-main-source-20261115`, branch
`builder/p1-on-main-source-20261115`, starts at published main
`ce6f02ba164982dce9ead6b85c9e482ca1829f07`. Ruling `c378009c` permits
source work while LS3 holds the executor. The refresh copies only the
18 P1-owned paths from `26d1e65c..fe0409e6`; it carries no old AE1
dependency merge. All 15 publisher blobs initially matched `fe0409e6`.
The later README correction dates the standalone results and describes
the already-tested adopted-foreign-trailer behavior. The initial composition retained all 14 publisher TypeScript files.
The current Client accommodation below changes only `publisher.ts` and
its existing restart witness; all original assertions remain.

The two shared configs add only `publisher/**/*.ts` and
`publisher/publisher.test.ts`, preserving main's removal of dormant
`browser/custody.test.ts`. Every other blob from the `ce6f02ba` base,
including shipped Lending inputs and identifiers, stays unchanged. The old standalone and
AE1-composed lanes remain intact. Historical `146dcb26` compiler and
13-case baseline/control results above retain their original source
bindings. The new import closure, gate and review remain **UNRUN**.
No project check, dependency setup, producer, package release or hosted
operation ran for this source preparation.

## Current Client unsent result

Ruling `c8572723f70243904d887165f79648cc673e823b` requires
`{ status: "stopped", reason: "report-unsent" }` for a retained unsent
decision and either send result. Folded remains `custody-mismatch`. The
publisher signs no replacement, resends no ended original and invents no
Native answer or receipt. Its key combines the commit and Library
revision, so each cycle stops again until the Library revision moves;
P1 adds no second report.

The existing restart witness retains all original assertions and adds a
scripted preexisting ending through real file custody. Stale enumeration
reaches the settled-decision arm, and the next cycle reaches final-send
reuse. This checks publisher handling, not a journal-absence algorithm or
Native refusal. The owner still has thirteen identities and the same
deadlines. Current-source compiler, owner and gate checks remain UNRUN;
the historical results above do not validate this accommodation.
