# Kernel boundary

Status: draft 2, for request `2ee805c5`. Draft 2 answers review
`3cd820f3`: three classes only, with tools as a kind of platform service,
and the host statement limited to the code that has no host (sections 1, 3
and 8). It describes main `c40492ee`, except where it says that K7 and K8
are closed at main `b52ca7e3`. Section 7.2 records the implemented K9
binding and its passed owning checks and control. The exact-head gate and
review remain separate requirements.

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
| `packages/bytes` | Kernel | Fails in part | Canonical JSON, hashes, signatures and byte domains are kernel: entry hashes are its canonical bytes, and `derive` imports it. Its application package, view and projection codecs (`application-*.ts`, about 1,600 lines) are platform code (K3). |
| `packages/package-graph` | Platform service | Fails | `derive` imports it (K2). |
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
| `examples/demo-repo` | Application (example) | Passes | A fixture of the retired policy system. It imports `@generalbusiness/artroom-policy`, a package that no longer exists (K11). |

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
K4 has no request yet. K7 and K8 are closed.

- **K1. Platform rules are code that replay needs.** A platform scope pins
  `platform:<name>@<n>`. Replay derives it only with code that its caller
  supplies (`replay/src/verify.ts:1031-1055`), and its report says that no
  digest names those rules (`verify.ts:252-258`). There are 62 pinned
  versions (`platform/src/native-catalog.ts:100-163`). Passing takes one of
  three things: pin each version's rules by digest and archive the code;
  move the shipped versions into a frozen part of the kernel; or replace
  the marks with declared forms. Design request `50133470` covers K1 and
  K6.
- **K2. `derive` imports `package-graph`.** `derive/src/validate/fields.ts:26`
  re-exports `fieldAssignable`, a grammar rule, and
  `derive/src/validate-package.ts:7` imports `checkPackageGraph`. Passing
  takes `fieldAssignable` into `derive`, and package validation out of it.
  Request `30c7c3ec` covers K2, K3 and K11.
- **K3. Application codecs in `bytes`.** Passing takes the
  `application-*.ts` codecs into a platform package.
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
- **K11. A dead example.** `examples/demo-repo` imports a package that no
  longer exists. Passing takes its deletion and the two references in
  `docs/policy-pack.md`.

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
A head that removes a kernel promise also needs this review.

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
