# Kernel boundary

This page records the kernel classification from request `2ee805c5` and
its review `3cd820f3`, with the K2, K3 and K11 implementation for request
`30c7c3ec`. Tools are platform services. The host statement applies to code
that has no host (sections 1, 3 and 8). Earlier K7, K8 and K9 evidence keeps
its stated scope.

K2, K3 and K11 are implemented at `fb105fa7`. The structural check, its
paired control, SDK checks and Page build checks passed. Six maintained
source-seal results were adopted in seven map slots at `8bfdc37e`, preserving
the four archive values. All 28 affected compiler roots and all 129 cases
in 25 whole files passed. The ordinary gate at `8658d109` failed; the
whole-file and previously unreached checks subsequently passed. The
[implementation report](../notes/implementation/2026-10-24-kernel-hygiene.md)
records the outcomes and their limits. K1, K4, K5, K6 and K10 remain open;
this work does not change their status. No deployment is part of this
request.

Applications on dap run for a long time, and they change more often than
they are replaced. That works only if a small part of the system changes
rarely and everything else can be replaced around it. This page names that
part, the kernel. It places every package, app and example in one of three classes,
states the test it applied, and lists the parts that fail the test today.
It ends with the kernel's promises and the rule for adding to the kernel.

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
| `packages/contract` | Kernel | — | Entry, act, seed and definition forms. It also names platform and app vocabulary (section 5, K4). |
| `packages/derive` | Kernel | — | Validator, judges, fold, rule expressions and the code of three capabilities. |
| `packages/bytes` | Kernel | K3 implemented; codec witnesses passed | Canonical JSON, hashes, signatures and byte domains remain here. Application package, view and projection codecs and their existing witnesses now live in platform. |
| `packages/package-graph` | Platform service | K2 implemented; owning checks passed | The single field-assignability implementation lives in `derive/field-types`; package validation lives in `platform/package-validation`. Production derivation no longer imports graph. |
| `packages/platform` | Platform service | Fails | Replay needs its code to derive platform scopes (K1). |
| `packages/scope` | Platform service: the runtime host | Passes | It holds the runtime's host details (section 8). It re-exports the `hold@1` numbers that judgments use; `derive` chooses them (K7, closed). |
| `packages/mcp` | Platform service | Passes | The runtime imports it (`scope/src/worker.ts:60`). |
| `packages/git` | Platform service | Passes | `derive` has its own commit parser for `git-read@1` (`derive/src/capability/ancestry.ts:192-197`). |
| `packages/checkers` | Platform service | Passes | A checker signs ordinary intents (`checkers/src/signing.ts`). |
| `packages/replay` | Platform service (tool): the independent verifier | Passes | It names platform versions and lane names (K6). Its local Git source is a Node adapter (section 8). |
| `packages/cli` | Platform service (tool) | Passes | It is the only caller that gives replay the platform and capability code (`cli/src/commands.ts:1179-1187` at main `b52ca7e3`). The capability code is `derive`'s one table, with `device-command@1` (K8, closed). |
| `packages/client` | Platform service (tool): the client library | Passes | — |
| `apps/counter` | Application | Passes | — |
| `apps/jam` | Application | Passes | A static page with no scope. |
| `apps/room` | Application | Passes for the kernel | Its lanes are definitions pinned by digest. It also holds the production entry of the platform Worker (`apps/room/worker.ts:2`, `wrangler.jsonc`), and the kernel names its lane actions (K4, K10). |
| `examples/grow` | Application | Passes to retire; fails to replace | `contract` fixes the device kinds at fan, heater and vent (`contract/src/device-command.ts:5`, K4). |
| `examples/lending` | Application | Passes | — |
| `examples/demo-repo` (retired) | Removed example | K11 implemented | Its two policy files and the active guide command and link are removed. Dated notes and reports remain unchanged. |

The request that commissioned this page proposed `packages/scope` and
`packages/replay` as kernel. The test places them outside. The runtime host
can be replaced by another host with no change to the meaning of an entry
(section 8), and the verifier is a second caller of `derive`. The
architecture page's statement that the runtime and the verifier call the
same functions is what keeps both honest, and it is promise 9 below.

## 4. Platform services: definitions or special cases

[Write an application](write-an-application.md) describes an application
as a definition pinned in a scope. For each platform part, this table says
whether it is one, or a special case that the kernel knows.

| Part | Kind | What the kernel knows about it | What retiring it takes |
|---|---|---|---|
| Register, directory, directory partition, membership, rules, destination, inbox, task | Special cases | Their kinds are a closed list (`contract/src/scope.ts:19`), and the kind is in every seed, so in every scope ID. Their `platform:` names (`scope.ts:41`). Parts of their rules: a register opens only by `install` and a directory with no creator only by `found` (`derive/src/genesis.ts:49`, `:132-133`); only membership issues grants (`derive/src/grant.ts:123-129`); a literal `platform:destination@3` (`derive/src/judge.ts:427-429`). Their own rules are code in `packages/platform`. | Their rules as declared forms, or as code pinned by digest (K1), and their kinds out of the closed list. |
| Issue and change lanes | Definitions pinned by digest | `derive` names their actions: `issue.comment` and `change.comment` (`grant.ts:84`), `work.export` and `change.check` (`grant.ts:53-58`). Replay names the lanes (`replay/src/identity.ts:95-157`). | Move those names into the lane definitions as data (K4, K6). |
| `hold@1`, `git-read@1`, `device-command@1` | Capability code in the kernel | Closed names (`contract/src/capability.ts:19`), code in `derive/src/capability/`. | A capability is kernel by review (section 7). `device-command@1` also carries the grow device kinds (K4). |
| Runtime host, MCP service, Git code, checkers, package checks | Services | Nothing, except K2. | Replace the service; entries keep their meaning. |

## 5. Parts that fail the test today

Each item says what passing takes, and names the request that covers it.
K4 has no request yet. K7 and K8 are closed. K2, K3 and K11 have the
implementation described below. The structural check and paired control
passed, as did all affected compilers and whole-file cases. The
implementation report records the failed gate at `8658d109` and its
scoped continuations as separate results.

- **K1. Platform rules are code that replay needs.** A platform scope pins
  `platform:<name>@<n>`. Replay derives it only with code that its caller
  supplies (`replay/src/verify.ts:1031-1055`), and its report says that no
  digest names those rules (`verify.ts:252-258`). The catalog pins 80
  versions (`platform/src/native-catalog.ts`, one row each): 62
  when this page landed, three more from the versioned publication family
  (`c8a3fb24`), four from the certified rules family (`6852f78d`) and four
  from its hardening (`33690b69`), and three from the unpublished cohort
  (`register@21`, `directory@20` and `destination@16`), and four from the
  opt-in evidence cohort (`register@22`, `directory@21`, `rules@13` and
  `destination@17`). Passing takes one
  of three things: pin
  each version's rules by digest and archive the code;
  move the shipped versions into a frozen part of the kernel; or replace
  the marks with declared forms. Design request `50133470` covers K1 and
  K6.
- **K2. Package graph leaves the production kernel.** The single
  field-assignability implementation lives in
  `derive/src/field-types.ts`, exposed by `dap-derive/field-types`.
  `package-graph` imports that home. Native package validation lives in
  `platform/src/validate-package.ts`, exposed by
  `dap-platform/package-validation`; its 11 existing integration cases
  now live in platform. Caller bounds, profiles, graph decisions and codec errors stay
  unchanged. The corpus harness remains in derive. Request `30c7c3ec`
  covers K2, K3 and K11. The implementation report records the affected
  checks, failed gate and scoped continuations.
- **K3. Application codecs leave `bytes`.** All 20 modules now live in `platform/src/application-codec/`, exposed by
  `dap-platform/application` and `dap-platform/application-v2`.
  The directory preserves the existing native `platform/src/application.ts`
  cohort implementation. Eight whole codec tests move to platform with
  their 32 existing cases and unchanged wire, digest, signature and refusal
  assertions in the implementation. Bytes has no compatibility re-export of the moved
  codecs. Test fixtures remain explicit test-only imports. All 32 moved
  codec cases passed; their evidence covers the registered values and
  contexts.
- **K4. Platform and app vocabulary in `contract` and `derive`.** Examples:
  the closed kind list (`contract/src/scope.ts:19`); the closed capability
  names (`contract/src/capability.ts:19`); the grow device kinds
  (`contract/src/device-command.ts:5`); membership versions 6 to 8 in
  invitations (`contract/src/invitation.ts:3`, `:7`); the rules scope's
  content in observations (`contract/src/observation.ts:81-86`); lane
  actions and a literal destination version in `derive` (section 4).
  Passing takes each name into the definition or capability that owns it,
  as data.
- **K5. The grammar exists twice.** `derive/src/validate/` (22 files)
  checks a definition before use, and the judges read the same forms again
  when an act is judged: guards (`validate/guards.ts:112-220` and
  `guards.ts:182-239`), effects (`validate/effects.ts:95-195` and
  `effects.ts:349-466`), and sends, handlers, timed rules, fields,
  operands, observations, markers, bindings and capabilities in the same
  way. Passing takes one grammar table that both read. Request `e949b0df`
  covers it.
- **K6. Replay names platform versions and lanes.** For example destination
  versions 4 to 7 (`replay/src/verify.ts:1740`, `:1817`) and membership 8
  with register 17 (`replay/src/archive.ts:157-158`). A replacement
  verifier would have to copy them. Passing takes these names into platform
  data that the verifier reads. Request `50133470` covers it with K1.
- **K7. `hold@1` numbers sit outside the capability.** Closed by request
  `7b19837c` at main `b52ca7e3`. The numbers are now `derive`'s
  `HOLD_VERSION` (`derive/src/capability/hold.ts:267`). The runtime
  re-exports them (`scope/src/ports.ts:308`), and the CLI copies no number.
  Before, the runtime chose them and the CLI copied them by hand.
- **K8. `dap verify` cannot replay `device-command@1`.** Closed by request
  `7b19837c` at main `b52ca7e3`. `derive` has one capability table, with
  `device-command@1` (`derive/src/capability/code.ts:6`). The runtime
  serves it, and the CLI gives the same table to replay
  (`cli/src/commands.ts:1186`). Before, the CLI left `device-command@1`
  out, and replay reported a grow room's scopes `unsupported-definition`.
- **K9. Bind validation to the definition format.** Replay previously
  checked each pinned definition with the current validator. A stricter
  validator could make an old history unsupported. Request `2e714fd7`
  binds the compatible check set to `artroom-definition-1` (section 7.2).
  The named corpus, owning checks and paired stricter-check control passed.
  The exact-head gate and review are still required before K9 closes.
- **K10. The platform Worker's entry lives in an application.**
  `apps/room/worker.ts` re-exports the runtime's Worker, and its
  configuration is the platform's. Passing takes the entry and its
  configuration into a platform home. Design request `1fcd6692` takes it
  into its scope.
- **K11. The dead example is removed.** The two tracked files
  below `examples/demo-repo` and the command/link in the retired policy-pack guide
  are deleted. The guide states the removal. Dated notes and reports are
  unchanged.

## 6. Kernel promises

1. **The record is the interface.** Everything a person, an agent or a
   verifier needs to know about what happened is in the record.
2. **Every entry form ever written stays replayable by the same derivation
   code.** Replay refuses no entry kind today (`verify.ts:1680-1850`). K1
   and K9 are the ways this promise can fail. K8 was one, until it closed.
3. **The definition schema is versioned.** The format is
   `artroom-definition-1` (`contract/src/definition.ts:32`). Its optional
   parts carry their own versions: `level`, `capacity`, `profile` and each
   capability. K9 binds the compatible validation checks to that format
   (section 7.2).
4. **A judgment is about one head.** A scope judges each act against its
   own whole head.
5. **Delivery is the only channel between scopes.** No guard reads another
   scope's present state (scope contract, D5-5).
6. **A refusal carries its reason.** Every refusal names a reason code.
7. **The sequence is the clock.** The order of a scope's entries is its
   time. A recorded time is evidence of when, not the order.
8. **A scope URI resolves.** Every thing with a scope is addressed by its
   scope's URI, and that URI resolves.
9. **The runtime and the verifier call the same functions.** Both judge
   and fold with `derive`.
10. **A scope's definition never changes, and its history is never
   reinterpreted.** An application moves to a new definition only by
   succession: an ordered cutoff entry in the old scope, with no change to
   its application state after it, and a new scope whose genesis names
   that entry and derives its state from it by a mapping that is data
   ([definition succession](../notes/2026-10-22-definition-succession.md),
   section 1).
11. **Every change is an act judged in a turn.** Every read is of the
   record at a named position. Every effect on an outside system is a
   declared capability form whose outcome is its own entry. Any other
   surface is named in the [one-channel audit](../notes/2026-10-22-one-channel.md),
   with its limits.

This list grows only by review. Promises 10 and 11 joined it when their
notes landed (`25e1248e` and `5cd53dcf`).

## 7. Rule for adding to the kernel

Nothing new enters the kernel without a review that cites this page and
says why the part cannot be a platform service or an application.

A head adds to the kernel when it does any of these:

- adds a file or an export to `packages/contract`, `packages/derive`, or
  the kernel part of `packages/bytes`;
- adds a scope kind, a platform name, a capability name, a field type or a
  reason code to `packages/contract`;
- makes a kernel package import a package outside the kernel;
- names a platform definition, a lane, an action or application vocabulary
  inside `packages/derive` or `packages/replay`.

The checker checks this rule on every head that touches these packages.

Request `0c3091fa` adds the existing hold capability's second version under
ruling `adb1a6ed`. A confirmed head or fork outcome changes the records that
runtime and replay derive. Those rules belong beside the ledger in the
kernel: a replaceable host adapter can supply an answer, but cannot decide
what that answer means. The adapter, authenticated repository discovery and
private credential custody remain services in `scope` and `git`.

The addition declares `hold@2` in `contract` and adds four exports in
`derive`. Each belongs in the kernel because it determines how runtime and
replay interpret the same recorded definition and entries:

- `HOLD_V2` names the separate `hold@2` record and operation owner.
- `holdCapabilityV2` supplies that version's derivation rules, including
  head and fork outcomes.
- `workspaceOwner` selects the family from the declared version. A caller
  or host cannot choose another family for the same definition.
- `hasAnyWorkspace` checks that the selected family has a listed hold guard
  or effect. Declaring a version alone does not enable workspace steps.

The first hosted staging observation is `29f6d5bc`. Its preparation opened
stage and mint operations, with no outcome in the observation window.
The registered-only census did not establish the complete legacy absence
required to extend `hold@1`, so `hold@2` has separate head and fork rules.
The old version retains its rules, maxima and record meanings. Both use the
existing forms, item states and operation ledger. The bare capability name
remains `hold`. This adds no scope kind, entry form, byte domain or K item.
Existing lane pins and native evidence identities remain fixed. New J4
lane pins select version 2
explicitly and grant no archive policy permission.

Exact-head review must check owner dispatch, closure and effect bounds,
first selection at the actual held state and epoch 1, late unselected
answers, and replay's ancestry and live-root retention. A late fork answer
owes deletion only for the ID and name in that immutable answer; it does
not change a selected or final fork record. Automatic fork deletion at hold
end and sweeping remain outside this request. This addition closes no K
item and relies on the filed J4 ruling for its kernel placement.

Request `121a8913` places the fixed-slot equality index in derive's view
and fold. A range guard's complete count determines whether an input is
judged, refused or left `guard-incomplete`. Runtime and replay must derive
that decision from the same state and equality rule. A platform service
cannot supply the count without becoming an additional authority over the
record. The index covers any declared fixed slot and names no platform
definition or application field. It adds no entry form, reference kind,
definition format, capability or K item. Its rows are derived storage and
do not change checkpoint bytes. Exact-head review must assess the complete
counts, equality through journal floors, reconstruction and transaction
ownership under this section.

Rules observation record revision 21 is permitted by ruling `1bc4f7fd`
under this section. Its nullable `roomService` and scoped
`serviceGeneration` occur exactly when the pinned Rules data declares
`roomServiceChanged`. Earlier definitions retain their exact records.
The observation is the kernel form for what a judge may know of Rules;
its native-selected position belongs to that authenticated record. A
retained policy value alone cannot establish the position. Contract keeps
only the two type-only interfaces needed by the record. The job binding
vocabulary and its codec belong to platform. This addition changes no
timed form, fold or replay rule and closes no K item. The exact-head review
must assess this reason and the definition-specific record checks.
A head that removes a kernel promise also needs this review.

Request `30c7c3ec` makes two file/export additions under this rule, while
adding no new kernel capability:

- `derive/src/field-types.ts` and the `./field-types` export give
  `fieldAssignable` its home beside the validator that already used and
  re-exported it. Field assignability is a grammar rule for derivation,
  so it belongs in the kernel rather than a replaceable platform service.
- The bytes index now exports the existing `Signer` type from
  `bytes/src/signer.ts`. That type belongs to the signature domain bytes
  already owns. It was previously exposed through `bytes/application`;
  the type-only root export lets the relocated platform codecs use it
  without keeping application codecs in the kernel.

### Maintained production dependency check

`node scripts/check-kernel-boundary.mjs` parses production imports,
exports, require calls and dynamic imports, including erased type edges.
It follows exact workspace exports and relative cross-package paths.
Only contract, bytes and derive are permitted workspace targets; the one
machine list is `KERNEL` in that script. Their production dependency,
optional-dependency and peer-dependency pins are checked as well.

The following marked table is the sole machine-readable approval list for
external production libraries. Workspace pins must match the actual
coordinated package versions; external pins must match this table, the
installed package and the lock. Unknown exports, computed module targets,
unresolved paths and unsupported package/compiler aliases are refused.
The resolver models the inherited Bundler mode with package exports. It
refuses configured `baseUrl`, `rootDirs` and `moduleSuffixes`, other
resolution modes, and disabled package-export resolution rather than
assuming those settings resolve the same production source. Loader
references must use supported direct calls; extracted aliases and computed
loader names are refused. The `module` loader object may be used only for
a supported direct `module.require` call; object aliases, destructuring
and other member chains are refused.
A new library or changed pin needs review of this page, not a broad prefix
exception in code.

<!-- kernel-approved-libraries -->
| Package | Exact version |
|---|---|
| `@noble/curves` | `2.4.0` |
| `@noble/hashes` | `2.4.0` |
| `jsonata` | `2.2.2` |
<!-- /kernel-approved-libraries -->

Tests and tooling are outside this production boundary. Production code
cannot import an excluded test/tool file to evade it. The corpus stays in
derive as a test harness, with its explicit nonkernel fixtures. The
ordinary `npm test` path runs the structural check before Vitest and its
two compact parser/resolver Node witnesses in the existing Node check
list. The structural check and its two parser and resolver witnesses
passed at the implementation checkpoint. Three public-release module
checks also passed. The paired control added a temporary platform import
to `derive/src/index.ts`. The checker refused it and named that file, and
the original file was restored. The control is not committed.

The structural check addresses dependency placement, not byte compatibility
or native authority. The implementation report records these results,
the passed moved codec witnesses, the failed gate at `8658d109` and its
scoped continuations separately. The workroom records the exact-head
review and landing decisions.


### 7.1 Filing while parts fail the test

While any of K1 to K11 (section 5) is open, a design note, a plan or a
request waits when it adds one of these, unless it names the K item that
it closes:

- a scope kind;
- a platform definition name;
- a capability name or form;
- a tool family: a new group of MCP tools or of CLI commands;
- a new model of the record: a new entry kind, a new level, a new field
  type, or a new kind of reference between scopes.

A head closes a K item when it does what section 5 says passing takes for
that item. The checker judges that at the head. A filing that adds a new
part that fails the test in section 2 waits in every case.

These do not wait:

- work that only uses existing forms: applications, packages, views,
  documents, tests and fixes;
- a new version of an existing platform definition. It is not a new name,
  but its head says that it adds one to K1's count;
- fixes for the filed security findings, R1 to R16 and D1 to D6. They
  still follow section 7 and add no K item.

Work filed before this rule took effect (22 October 2026, workroom assert
`1bd7dde8`) states its kernel placement when it reaches the front of the
queue. A head that adds to the kernel names the K item that it closes, or
the planner holds it. Assert `1bd7dde8` records how the rule applies to
each item filed at that time.

### 7.2 Definition-format validation

Request `2e714fd7` places definition-format validation in the kernel.
Validation decides whether a pinned declaration can be used to derive its
history again. A replaceable service cannot change that decision without
changing the meaning of the record.

The public validator keeps its bounded preamble and dispatches by the
declaration's `format`. `artroom-definition-1` selects the compatible checks
in `derive/src/validate/format-1.ts`, including the grammar and shared pure
semantic helpers that those checks call. Moving a check to another helper
does not remove it from this compatibility rule. Unknown nonempty string
formats are refused as `unsupported-definition`, with the actual format in the
reason. The public API, caller-supplied bounds, profiles and native owner
options retain their existing roles.

A stricter check that rejects a previously admitted declaration needs a
new authorized format or a version of the optional part that owns the
check. Existing versions remain available for replay. A correction that
changes admission also needs an explicit compatibility review; calling it
a bug fix does not settle that question. This work adds no format, scope
kind, platform name, capability, tool family or record model. Pinned
declaration bytes, byte domains and digest identities remain unchanged.
The [definition contract](../notes/2026-10-04-scope-and-replay-contract.md)
section 6.1 states the binding.

The named corpus registers complete positive declarations from shipped
applications, examples, fixtures and retained histories, with their
validation contexts and existing pin witnesses. Valid declarations used
in refused actions or package graphs remain included. Raw constructors
defer validation until each named test runs, so the paired stricter-check
control can fail at a known corpus row rather than during module import.
The corrected corpus passed 1,217 named declaration rows and its registration
check. The other 66 owning Node files passed 618 checks, including the format
and replay boundaries; the full owning typecheck passed. A single paired
control added a six-character name minimum. The raw `derive/shared/small`
row passed without that change and failed by its named corpus assertion
with the change. The exact validator source was restored.

These checks support the registered declarations and contexts, not every
possible format-1 value or every history-dependent bound. The
[implementation note](../notes/implementation/2026-10-23-definition-format-validation.md)
records the original failures, exclusions and evidence limits. The ordinary
gate at the exact candidate and its review remain separate requirements.

## 8. Second host

The second host ([self-hosting on celld](../notes/2026-10-19-self-hosting-on-celld.md))
is what keeps host details out of the kernel. A part that only one host can
run cannot be kernel.

Today the kernel holds no host detail. `packages/contract` and
`packages/derive` name no host product, host storage or Git host, and
neither does the portable core of `packages/replay`, the part that judges
and folds again. Host details sit in host adapters:

- the runtime, in `packages/scope`: the Durable Object and Worker entry
  (`scope/src/object.ts`, `worker.ts`), the Git host wiring
  (`artifacts-wiring.ts`, `github-wiring.ts`), the content bucket
  (`applications/content.ts`), metrics (`metrics.ts`) and health
  (`health.ts`);
- the MCP service (`mcp/src/hosted.ts`);
- replay's local Git source (`replay/src/git.ts` and the command in
  `replay/src/bin.ts`). It reads a clone through Node's file system
  (`git.ts:2-5`) and is outside the portable package. It gives replay its
  input and judges nothing.

The self-hosting note places the runtime's details in the same packages
(lines 47 to 64). A second host is evidence that the kernel needs no host;
it is not evidence that every adapter is free of one. The rule in section 7
keeps the kernel this way.
