# Kernel boundary

Applications on dap run for a long time, and they change more often than
they are replaced. That works only if a small part of the system changes
rarely and everything else can be replaced around it. This page names that
part, the kernel. It places every package, app and example in one of three
classes, states the test it applied, and lists the parts that fail the test
today. It ends with the kernel's promises and the rule for adding to the
kernel.

## 1. Classes

- **Kernel.** The code that gives a recorded entry its meaning: the entry
  and act forms, canonical bytes, hashes and signatures, the judges, the
  fold and the rule expressions, and the identity of a scope and of a key.
  A change here can change what a recorded entry means.
- **Platform service.** Code that a deployment runs: the runtime host, the
  platform's own definitions, publication, the MCP service, checkers and
  package checks. A service can be replaced, and every recorded entry keeps
  its meaning. Tools are platform services that a person or an agent runs
  to sign, read or verify: the CLI, the client library and the replay
  verifier. The table marks them as tools.
- **Application.** A definition pinned in a scope, with its package, views
  and files. Retiring it changes nothing outside it.

## 2. Test

Each part was asked one question: can this part be retired or replaced
with no change to `packages/contract` and `packages/derive`, and no change
to the meaning of any recorded entry?

That is two checks:

1. **Imports.** No kernel package imports the part.
2. **Replay.** No recorded entry needs the part's code to be derived
   again.

A part that passes both is not kernel. A part that fails either one, and
is not meant to be kernel, is listed in section 5 with what passing takes.

## 3. Every part

| Part | Class | Test | Note |
|---|---|---|---|
| `packages/contract` | Kernel | Kernel | Entry, act, seed and definition forms. It also names platform and application vocabulary (K4). |
| `packages/derive` | Kernel | Kernel | Validator, judges, fold, rule expressions and the code of three capabilities. |
| `packages/bytes` | Kernel | Kernel | Canonical JSON, hashes, signatures and byte domains. Application package, view and projection codecs live in platform (K3). |
| `packages/package-graph` | Platform service | Passes | Package composition checks. Field assignability lives in `derive/src/field-types.ts`, and package validation in `platform/src/validate-package.ts` (K2). |
| `packages/platform` | Platform service | Fails | Replay needs its code to derive platform scopes (K1). |
| `packages/scope` | Platform service: the runtime host | Passes | It holds the runtime's host details (section 8). It re-exports `HOLD_VERSION` from `derive` (K7). |
| `packages/mcp` | Platform service | Passes | The runtime imports it (`packages/scope/src/worker.ts`). |
| `packages/git` | Platform service | Passes | `derive` has its own commit parser for `git-read@1` (`commitParents` in `derive/src/capability/ancestry.ts`). |
| `packages/checkers` | Platform service | Passes | A checker signs ordinary intents (`checkers/src/signing.ts`). |
| `packages/replay` | Platform service (tool): the independent verifier | Passes | It names platform versions and lane names (K6). Its local Git source is a Node adapter (section 8). |
| `packages/cli` | Platform service (tool) | Passes | It gives replay the platform code (`ARCHIVE_REPLAY_CODE`) and the capability code (`CAPABILITY_CODE`, `derive`'s one table) in `replayOf`, in `cli/src/commands.ts` (K8). |
| `packages/client` | Platform service (tool): the client library | Passes | None. |
| `apps/counter` | Application | Passes | None. |
| `apps/jam` | Application | Passes | A static page with no scope. |
| `apps/room` | Application | Passes for the kernel | Its lanes are definitions pinned by digest. It also holds the production entry of the platform Worker (`apps/room/worker.ts`, `wrangler.jsonc`), and the kernel names its lane actions (K4, K10). |
| `examples/grow` | Application | Passes to retire, fails to replace | `contract` fixes the device kinds at fan, heater and vent (`DEVICE_COMMAND_KINDS` in `contract/src/device-command.ts`, K4). |
| `examples/lending` | Application | Passes | None. |

The runtime host and the verifier are outside the kernel. Another host can
replace the runtime host with no change to the meaning of an entry
(section 8), and the verifier is a second caller of `derive`. Promise 9
keeps both honest: the runtime and the verifier call the same functions.

## 4. Platform services: definitions or special cases

[Write an application](write-an-application.md) describes an application
as a definition pinned in a scope. For each platform part, this table says
whether it is one, or a special case that the kernel knows.

| Part | Kind | What the kernel knows about it | What retiring it takes |
|---|---|---|---|
| Register, directory, directory partition, membership, rules, destination, inbox, task | Special cases | Their kinds are a closed list (`ScopeKind` in `contract/src/scope.ts`), and the kind is in every seed, so in every scope ID. Their `platform:` names (`PlatformDefinition`, same file). Parts of their rules: a register opens only by `install` and a directory with no creator only by `found` (`genesisJudged` in `derive/src/genesis.ts`). Only membership issues grants (`observationOf` in `derive/src/grant.ts`). Literal destination versions in `judgeTimed` (`derive/src/judge.ts`). Their own rules are code in `packages/platform`. | Their rules as declared forms, or as code pinned by digest (K1), and their kinds out of the closed list. |
| Issue and change lanes | Definitions pinned by digest | `derive` names their actions: `issue.comment` and `change.comment` (`COMMENTS` in `grant.ts`), `work.export` and `change.check` (`windowOf` in `grant.ts`). Replay names the lanes (`replay/src/identity.ts`). | Move those names into the lane definitions as data (K4, K6). |
| `hold@1`, `hold@2`, `git-read@1`, `device-command@1` | Capability code in the kernel | Closed names (`CapabilityName` in `contract/src/capability.ts`), code in `derive/src/capability/`. | A capability is kernel by review (section 7). `device-command@1` also carries the grow device kinds (K4). |
| Runtime host, MCP service, Git code, checkers, package checks | Services | Nothing, except what K2 named. | Replace the service. Entries keep their meaning. |

## 5. Parts that fail the test today

Each item names what passing takes, its status, and the work that covers
it.

- <a id="k1"></a>**K1. Platform rules are code that replay needs.** A platform scope pins `platform:<name>@<n>`, and replay derives it only with code its caller supplies. The catalog holds 80 versions. Passing takes pinning each version's rules by digest, freezing the shipped versions into the kernel, or replacing the marks with declared forms. Open. Covered by the design note "Platform rules that replay needs".
- **K2. The package graph leaves the production kernel.** Closed. Covered by "Kernel K2, K3 and K11 as one hygiene item".
- **K3. Application codecs leave `bytes`.** Closed. Covered by "Kernel K2, K3 and K11 as one hygiene item".
- **K4. Platform and application vocabulary in `contract` and `derive`.** For example the closed kind list, the closed capability names, the grow device kinds, membership versions in `INVITATION_KEY_MEMBERSHIPS` (`contract/src/invitation.ts`), the rules scope's content in observations (`contract/src/observation.ts`), and lane actions and literal destination versions in `derive`. Passing takes each name into the definition or capability that owns it, as data. Open. No work covers it yet.
- **K5. The grammar exists twice.** `derive/src/validate/` checks a definition before use, and the judges read the same forms again (for example `guard` in `validate/guards.ts` and `judgeGuard` in `guards.ts`). Passing takes one grammar table that both read. Open. Covered by the design note "One source for the guard grammar".
- **K6. Replay names platform versions and lanes.** For example destination versions 4 to 7 in the `Verifier` class (`replay/src/verify.ts`), and membership and register versions in `replay/src/archive.ts`. Passing takes these names into platform data that the verifier reads. Open. Covered by the design note "Platform rules that replay needs".
- **K7. `hold@1` numbers sit outside the capability.** Closed. `HOLD_VERSION` is in `derive/src/capability/hold.ts`. Covered by "An operator command for the archive clone and offline replay".
- **K8. `dap verify` cannot replay `device-command@1`.** Closed. `CAPABILITY_CODE` in `derive/src/capability/code.ts` is the one table. Covered by "An operator command for the archive clone and offline replay".
- **K9. Bind validation to the definition format.** Closed, landed on 23 October 2026 (section 7.2). Covered by "Tie the definition validator to the definition format".
- **K10. The platform Worker's entry lives in an application.** `apps/room/worker.ts` re-exports the runtime's Worker, and its configuration is the platform's. Passing takes the entry and its configuration into a platform home. Open. Covered by the design note "One application layout, discovered by convention, with a scaffold".
- **K11. The dead example is removed.** Closed. Covered by "Kernel K2, K3 and K11 as one hygiene item".

## 6. Kernel promises

1. **The record is the interface.** Everything a person, an agent or a
   verifier needs to know about what happened is in the record.
2. **Every entry form ever written stays replayable by the same derivation
   code.** Replay refuses no entry kind today: the `Verifier` class in
   `replay/src/verify.ts` handles all nine inputs. K1 is the way this
   promise can still fail.
3. **The definition schema is versioned.** The format is
   `artroom-definition-1` (`DeclaredDefinition` in
   `contract/src/definition.ts`). The optional parts `level` and `capacity`
   carry their own versions. The required members `profile` and each entry
   of `capabilities` carry theirs. Section 7.2 binds the validation checks
   to the format.
4. **A judgment is about one head.** A scope judges each act against its
   own whole head.
5. **Delivery is the only channel between scopes.** No guard reads another
   scope's present state.
6. **A refusal carries its reason.** Every refusal names a reason code.
7. **The sequence is the clock.** The order of a scope's entries is its
   time. A recorded time is evidence of when, not the order.
8. **A scope URI resolves.** Every thing with a scope is addressed by its
   scope's URI, and that URI resolves.
9. **The runtime and the verifier call the same functions.** Both judge
   and fold with `derive`.
10. **A scope's definition never changes, and its journal is never
   reinterpreted.** An application moves to a new definition only by
   succession: an ordered cutoff entry in the old scope, with no change to
   its application state after it, and a new scope whose genesis names
   that entry and derives its state from it by a mapping that is data
   ([definition succession](../notes/2026-10-22-definition-succession.md),
   section 1).
11. **Every change is an act judged in a turn.** Every read is of the
   record at a named position. Every effect on an outside system is a
   declared capability form whose outcome is its own entry. The
   [one-channel audit](../notes/2026-10-22-one-channel.md) names every
   other surface, with its limits.

This list grows only by review. A change that removes a promise also needs
the review in section 7.

## 7. Rule for adding to the kernel

Nothing new enters the kernel without a review that cites this page and
says why the part cannot be a platform service or an application.

A change adds to the kernel when it does any of these:

- adds a file or an export to `packages/contract`, `packages/derive`, or
  the kernel part of `packages/bytes`.
- adds a scope kind, a platform name, a capability name, a field type or a
  reason code to `packages/contract`.
- makes a kernel package import a package outside the kernel.
- names a platform definition, a lane, an action or application vocabulary
  inside `packages/derive` or `packages/replay`.

Review checks this rule on every change that touches these packages. A part
belongs in the kernel when runtime and replay must derive the same meaning
from it. For example, `hold@2` is kernel: a confirmed head or fork outcome
changes the records that runtime and replay derive, so a replaceable host
adapter can supply an answer but cannot decide what the answer means.

### Production dependency check

`node scripts/check-kernel-boundary.mjs` parses the production imports,
exports, `require` calls and dynamic imports of the kernel packages,
including type-only edges. Only `contract`, `bytes` and `derive` are
permitted workspace targets. The one machine list is `KERNEL` in that
script. The script also checks the kernel packages' production, optional
and peer dependency pins. It refuses what it cannot resolve: unknown
exports, computed module targets, unresolved paths and unsupported aliases.
`npm test` runs it before the unit tests.

The table below is the one machine-readable approval list for external
production libraries. External pins must match this table, the installed
package and the lock. A new library or a changed pin needs review of this
page.

<!-- kernel-approved-libraries -->
| Package | Exact version |
|---|---|
| `@noble/curves` | `2.4.0` |
| `@noble/hashes` | `2.4.0` |
| `jsonata` | `2.2.2` |
<!-- /kernel-approved-libraries -->

Tests and tooling are outside this production boundary. Production code
cannot import a test or tool file to evade it. The check addresses
dependency placement, not byte compatibility or native authority.

### 7.1 Filing while parts fail the test

While any K item in section 5 is open, a design note, a plan or a change
waits when it adds one of these, unless it names the K item that it
closes:

- a scope kind.
- a platform definition name.
- a capability name or form.
- a tool family: a new group of MCP tools or of CLI commands.
- a new model of the record: a new entry kind, a new level, a new field
  type, or a new kind of reference between scopes.

A change closes a K item when it does what section 5 says passing takes for
that item. A change that adds a new part that fails the test in section 2
waits in every case.

These do not wait:

- work that only uses existing forms: applications, packages, views,
  documents, tests and fixes.
- a new version of an existing platform definition. It is not a new name,
  but it adds one to K1's count, and the change says so.
- fixes for filed security findings. They still follow section 7 and add
  no K item.

### 7.2 Definition-format validation

Definition-format validation is kernel. Validation decides whether a
pinned declaration can be used to derive its journal again. A replaceable
service cannot change that decision without changing the meaning of the
record.

The public validator dispatches on the declaration's `format`.
`artroom-definition-1` selects the checks in
`derive/src/validate/format-1.ts`, with the grammar and the shared helpers
those checks call. Moving a check to another helper does not remove it from
this rule. An unknown nonempty format is refused as
`unsupported-definition`, with the format in the reason.

A stricter check that refuses a declaration the validator used to accept
needs a new format, or a new version of the optional part that owns the
check. Existing versions stay available for replay. A correction that
changes which declarations the validator accepts needs a compatibility
review, even when it is a bug fix. A named corpus in
`packages/derive/test/definition-corpus/` holds the shipped declarations,
and a stricter check fails at a named row. The
[definition contract](../notes/2026-10-04-scope-and-replay-contract.md),
section 6.1, states the binding.

## 8. Second host

The second host ([self-hosting on celld](../notes/2026-10-19-self-hosting-on-celld.md))
is what keeps host details out of the kernel. A part that only one host can
run cannot be kernel.

The kernel holds no host detail. `packages/contract` and `packages/derive`
name no host product, host storage or Git host, and neither does the
portable core of `packages/replay`, the part that judges and folds again.
Host details sit in host adapters:

- the runtime, in `packages/scope`: the Durable Object and Worker entry
  (`scope/src/object.ts`, `worker.ts`), the Git host wiring
  (`artifacts-wiring.ts`, `github-wiring.ts`), the content bucket
  (`applications/content.ts`), metrics (`metrics.ts`) and health
  (`health.ts`).
- the MCP service (`mcp/src/hosted.ts`).
- replay's local Git source (`replay/src/git.ts` and the command in
  `replay/src/bin.ts`). It reads a clone through Node's file system and is
  outside the portable package. It gives replay its input and judges
  nothing.

A second host shows that the kernel needs no host. It does not show that
every adapter is free of one. The rule in section 7 keeps the kernel this
way.

## Source

Checked against main `5dc9765f` on 30 October 2026. Sources: [check-kernel-boundary.mjs](../scripts/check-kernel-boundary.mjs), [scope.ts](../packages/contract/src/scope.ts), [definition.ts](../packages/contract/src/definition.ts), [capability.ts](../packages/contract/src/capability.ts), [native-catalog.ts](../packages/platform/src/native-catalog.ts), [verify.ts](../packages/replay/src/verify.ts), [commands.ts](../packages/cli/src/commands.ts), [code.ts](../packages/derive/src/capability/code.ts).
