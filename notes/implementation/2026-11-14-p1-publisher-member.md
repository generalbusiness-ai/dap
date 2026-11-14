# Lending shelf publication by an appointed member

**UNRUN source draft.** P1 is request `bea87570`, under promise
`3acac812` and the ratified note `notes/2026-11-13-publisher-member.md`.
The source baseline is `45421de7`. No compiler, test, formatter,
generator, build or gate has run for this draft or its source-review
repairs. Head A owns the executable slot.

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

## Evidence remains unrun

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

No raw evidence or manifest exists for these unrun checks. Source reads,
Git diffs and `git diff --check` supply no runtime or compiler evidence.
The root schedules validation after the current slot.

## Open limits

- P1 request `bea87570` still owes its owning checks, meaningful control,
  one gate and checker review. This note claims no approval.
- P1 uses the local Git path of `d2d431a9`. P2 owns remote credential
  delivery and later replacement of the shipped Lending package.
- The in-memory witnesses expose scripted membership and read authority.
  They establish no native enrollment, session renewal or real member
  revocation behavior.
