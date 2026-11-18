# JSON output for the dap command line

Status: draft revision 6 (builder), revising approved revision 5 (53b0335e). It authorizes no implementation until the checker approves it.
Not built: the CLI has no `--json` flag.

Builder revision 6, under parent request `92d6dddb`, against Main
`9255e1f8`. Revision 5 is request `f319c428`, approval `53b0335e`, merged
at `dafb5c16`. Planner ruling `31427eee` approves the bounded-read
decision of section 7, subject to checker review of this note.

Every finite command produces one typed execution result. Text and JSON
render that same execution. Neither renderer signs, sends, retries, reads
mutable state or changes custody. The JSON result uses native contract
structures and full identifiers. It never wraps prose as structured data.

This note authorizes no implementation, publication, live act or deployment.
Review must explicitly decide the bounded-read policy in section 7, the one
decision that revises revision 5.

## Changes from revision 5

- Bounded reads (section 7): one bounded page per invocation and a
  caller-held cursor replace the signed `--read-next` token, the read store,
  its lock and compare-and-swap, and `--restart-read`. Ruling `31427eee`.
- `log` reports a stop at its page bound as incomplete/1 with its cursor,
  in both renderers (sections 6 and 7).
- The catalog (section 5) adds application install, `application`,
  `application upgrade`, `apps`, `items`, `status`, `check`, `new`, `pack`,
  `dev`, `scope-index`, `invite --device`, checker-key and device-key
  `join`, and `issue wait`. It adds `clone --archive`, `install
  --register-policy`, `log --cursor` and `issues --after`.
- The `found` alias is gone from the CLI; the catalog and section 3 drop it.
- The native `Founded` type is now `Created`; error kind `founding` becomes
  `creation`.
- The native `archived` answer and the `archived` and `too-large` read
  refusals map to existing statuses (section 3).
- A new status `waiting`, exit 3, carries the `issue wait` bound.
- Section 4 defines the public error shape and lists the producers that
  copy raw messages today.
- Section 10 maps the current `packages/cli` layout and replaces the
  delivery order with slices CJ-1 to CJ-5.

## 1. Parse the flag without changing token ownership

`--json` takes no value. At an option position it selects JSON before,
between or after command words. Repetition has the same effect as one
occurrence. There is no environment default, `--format`, `--output`,
`--pretty` or JSON-lines mode in version 1.

One command-aware scan owns each token. A value-taking option consumes its
next token exactly as today, even when that token is `--json`:

| Invocation | Result |
| --- | --- |
| `dap issue open --title --json` | Text mode, title `--json` |
| `dap --json issue open --title --json` | JSON mode, same title |
| `dap --json` | JSON usage, exit 2 |
| `dap frob --json` | JSON usage, exit 2, empty resolved command |
| `dap act --json` | JSON usage, exit 2 |

Unknown options keep today's value consumption and usage behavior. A raw
argument pre-filter is incorrect. The global switch is removed from the
command-specific flag map only after ownership is known. For example,
`issue close --json` must not trigger today's “Only issue open and issue
wait take flags” check for a flag owned by the global parser.

MCP's `--generic` and `--generic=add` are switches. Its `--tools`, `--http`,
`--scope` and `--membership` consume values. Those values retain ownership.
An invitation link or arbitrary positional word never becomes a public
command label, diagnostic argument list or echoed usage fragment.

Mode selection precedes `configDir()`, filesystem access and command
startup. `main` dispatches `dev`, `check` and `new` before `configDir()`
(`packages/cli/src/main.ts:23-28`), so the scan runs before that dispatch.
Early configuration failures therefore cannot bypass the public JSON error
boundary. Existing exported `parse` and `command(ctx, argv)` interfaces
remain compatible adapters for current clients, including Room startup.
The Node entry can call a new typed entry point. Internal workflows share
typed progress; they never parse a text adapter's output.

## 2. Output and the long-lived exceptions

In JSON mode, each finite invocation writes one compact UTF-8 document and
one newline to stdout, for exits 0, 1, 2 and 3. The finite command writes no
progress or diagnostics to stderr. Its process exit equals the envelope's
`exit`. Unexpected errors are caught before the runtime prints a raw stack.

Git is a trusted child boundary. Inherited stdout and stderr, including
`git --version` preflight and clone, go to parent stderr in JSON mode.
Captured object bytes stay private producer input. Existing discarded
capture diagnostics remain discarded; the archive runner discards all child
output (`packages/cli/src/git.ts:113-170`). No child's output becomes part
of the document. Ambient Git configuration, helpers, redirects and child
stderr retain their existing trust boundary; they are not a confidentiality
promise.

Without option-position `--json`, `dap mcp` keeps its current stdio or
loopback HTTP protocol. It may create a key, persist a standalone root and
write existing startup or bearer-handoff diagnostics to stderr. Stdio
stdout belongs exclusively to MCP framing. Normal shutdown with no outcome
lines writes no extra document or newline.

With option-position `--json`, resolved command `mcp` returns a finite
usage/2 envelope before configuration reads, key creation, root writes,
listener binding or protocol startup. `dev` is also long-lived: it serves
and rebuilds until stopped. With `--json` it returns the same usage/2
envelope before it reads a file or binds a port. A consumed option value
`--json` remains data. This design covers every finite invocation. It does
not wrap a running server in a finite result.

## 3. One envelope retains evidence through every phase

A successful result has this form; the empty result below is illustrative,
not a complete command-specific schema fixture:

```json
{"v":1,"command":["issue","open"],"phase":"complete","status":"done","exit":0,"result":{}}
```

Required keys, in output order, are `v`, `command`, `phase`, `status` and
`exit`. Optional public keys follow: `result`, `error`, `recorded`,
`observations`, `custody`, `waited`, `next`. Native values keep their native
fields and full hashes. Key order aids reading; consumers cannot depend on
it and must ignore unknown optional keys.

`command` contains only resolved allowlisted command words. Install's
plan/planned/application choices are modes, not subcommands. `create` and
`claim` resolve to `create`; an optional allowlisted alias names `claim`.
Invalid commands use an empty array. No supplied secret or path can become
a command label.

Phases are `parse`, `preflight`, `prepare`, `submit`, `observe`, `local`,
`read`, `verify`, `child` and `complete`. A phase names where execution
stopped. A submission judgment and a later publication observation remain
separate evidence.

| Status | Exit | Meaning |
| --- | --- | --- |
| `done` | 0 | The requested command or explicitly selected read completed; coverage remains explicit. |
| `partial` | 1 | A workflow stopped after earlier confirmed work; its unfinished step and cause remain explicit. |
| `refused` | 1 | A known native judgment, later refusal or local custody refusal, with its origin identified. |
| `unavailable` | 1 | Native unavailable answer, including `rate-limited`. |
| `mismatch` | 1 | Native idempotency mismatch. |
| `unknown` | 1 | Dispatch or a later result remains unobserved. Known acceptance is retained. |
| `not-found` | 1 | An actual negative read or search, not an inferred absence. |
| `unreadable` | 1 | Permission, availability, incarnation, archive floor, size or response admission prevented a read. |
| `unsupported` | 1 | A known unsupported definition, capability or workflow. |
| `no-answer` | 1 | A received reply could not be read as the expected native answer. |
| `incomplete` | 1 | A read stopped at its stated per-command bound; collected data, coverage and the native cursor remain. |
| `inconsistent` | 1 | A completed verification returned its native report with a finding. |
| `usage` | 2 | The current argument or configuration precondition fails. |
| `waiting` | 3 | A bounded wait ended without the awaited state. Nothing was signed. |
| `error` | 1 | An unexpected local failure, with a fixed safe public diagnostic. |

Existing command exits remain authoritative. Missing configured repository
is usage/2 wherever today's producer uses that outcome, including invite,
issues, verify-all, remote, clone and issue workflows. No schema mapping
changes that result to not-found/1. `issue wait` returns exit 3 at its bound
today (`packages/cli/src/issue-wait.ts:13,81`); `waiting` names that exit.
The `log` stop in section 7 is the one explicit behavior change, and it
applies in both renderers.

`result` may appear with every status when the producer knows public data
or progress. Unsupported clone can retain `git: {ran:false, exit:null}`.
Inconsistent verification retains its native `Report`. A refused merge
retains its accepted merge fact and later observation. A session, credential,
file, cleanup or Git failure cannot erase earlier acceptance.

`recorded` lists known accepted receipts or facts with public role labels on
non-done outcomes. Done workflows keep those facts in `result` only.
The execution records acceptance before the next fallible step. An exact
retained signed original without a receipt is custody, not a recorded fact.
`custody` states retained/verified, unresolved or unavailable and public
intent/operation identity where known. It exposes no private filename or
secret-bearing original. `waited` retains actual polls, scans, next position
and stop reason when the producer knows them.

`observations` records independently read ScopeRefs and heads. A folded
item observation has its actual item ID and revision. Only an actually read
sealed fact receives a `FactRef`; a revision is never invented as a sequence.
No aggregate claims a snapshot across independent reads.

`next` contains only allowlisted structured inspect, check or explicit
continue actions. Unknown, unavailable, transport failure and persistence
failure do not grant a fresh mutation. Exact original recovery remains
separate from a new request.

### Errors identify their origin

| `error.kind` | Public payload |
| --- | --- |
| `intent` | `answer`: unchanged nonaccepted native `Answer`, with known target. A refusal keeps actual `judgedAt` and optional `name`. |
| `creation` | `answer`: unchanged nonaccepted `Created`, with known target. No invented judged head. |
| `observed` | Actual later refusal/abort and its sealed fact or folded item/read evidence. |
| `read` | Actual refused native `Read`, or a separate closed response-admission code. |
| `transport` | Closed safe code and whether mutation dispatch may have begun. |
| `local` | Closed safe code for known capability, custody or configuration failure. |
| `usage` | Closed code, bounded safe message and usage text; no raw argv or private paths. |
| `unexpected` | Fixed `unexpected-error` code and fixed public message. |

A host mint refusal is not `Answer.refused`. `Created.refused` has no
`judgedAt`. Lost transport is not a manufactured native refusal. Native
answer reasons remain under `error.answer.reason`; a guard name remains
under `error.answer.name`. Local categories use closed `error.code` values.
The implementation must enumerate actual producer categories before schema
review, rather than copying raw diagnostic text.

### Archived answers and archived or oversized reads

The native `Answer` has an `archived` variant: the original entry lies below
the scope's journal floor (`packages/contract/src/result.ts:78`;
`Archived` at `packages/contract/src/floor.ts:16`). It is unknown/1 with
`error.kind` `intent` and the unchanged answer, including `fact`, `floor`,
`commit` and `through`. The original's result is not confirmed until the
caller verifies the archive commit against `through`, so `recorded` stays
empty. `next` names that verification as an inspect action and grants no
replacement request. The application install and upgrade answers
`archived` map the same way.

A native read refusal `archived` (`packages/contract/src/read.ts:25`) is
unreadable/1 with `error.kind` `read`, the unchanged `Archived` value and
its optional native `next` cursor at the floor. A read refusal `too-large`
(`packages/contract/src/result.ts:56`) is unreadable/1 with the native
reason. Neither is not-found, and neither erases rows that the same
invocation already read.

## 4. Native types and confidentiality

`ScopeRef`, `FactRef`, `Head`, `MemberRef`, `Answer`, `Created`, `Archived`,
`Receipt`, `Entry`, `Summary` and `Report` retain contract shapes. Known full
references remain full references. A configuration holding only a scope ID
does not justify inventing its incarnation. Every projected read value names
its actual read head. No identifier or hash is shortened.

The public result is constructed before serialization. Closed public error
factories cannot accept arbitrary `Error.message`, stack, cause, caught
transport objects or argv. Unknown exceptions use a fixed diagnostic.
Known filesystem/configuration failures use allowlisted messages without
private path interpolation. A renderer without Context is insufficient if
the producer has already copied a private error string.

### The public error shape

`error` has `kind` from the table in section 3, `code` and `message`. `code`
is a fixed kebab-case word from a closed set per kind. `message` is a fixed
template from the same closed set; it holds at most 512 UTF-8 bytes and
interpolates only public native values, such as a ScopeId, sequence or
native reason. Native payloads (`answer`, a refused `Read`) sit beside it.
No `error` field carries exception text, a stack, a path, argv or child
output. A producer category without a closed code is `unexpected-error`.

These producers copy raw messages into output lines at `9255e1f8`:

| Site | Raw text copied |
| --- | --- |
| `packages/cli/src/command-support.ts:31` | `TransportError.message` after `No answer:` |
| `packages/cli/src/command-support.ts:32` | `SourceError.message` |
| `packages/cli/src/command-support.ts:185,201,227` | `ReadSessionCacheError.message` |
| `packages/cli/src/main.ts:34` | `ConfigDirectoryError.message`, which can name a path |
| `packages/cli/src/main.ts:41` | `RetiredHomeError.message` |
| `packages/cli/src/invitations.ts:626` | any caught `Error.message` |
| `packages/cli/src/mcp.ts:107` | any caught `Error.message` or `String(error)` |
| `packages/cli/src/command-verify.ts:222` | cleanup read `error.message` |
| `packages/cli/src/scope-index-command.ts:75` | any caught `Error.message` |
| `packages/cli/src/application-command.ts:73,97` | application source, package or scenario error messages |
| `packages/cli/src/application-dev.ts:70` | rebuild error message, cut at 500 characters |
| `packages/cli/src/application-scenarios.ts:120,249` | local application error messages |

Each site gains a closed code before its command gains JSON output. The
text adapter may keep its current words through the private carrier below.

A separate private carrier may preserve existing human diagnostics for the
text adapter. The JSON serializer cannot accept or stringify that carrier.
Its input contains no config-directory path, environment, key secret,
session bytes, token plaintext, provider credential, private signed founding
intent, local `--file`/`--value` bytes or stack trace. Counts and native
digests may remain public.

Two deliberate disclosure boundaries are separate:

- A verified `invite` handoff, person or device, emits `confidential.link`
  once, because that link is the requested deliverable. It appears nowhere
  else in the public result or diagnostics.
- `show` emits the authorized native Entry. `log` emits selected native
  input summaries. JSON does not widen read authority or sanitize retained
  history. Older enrollment entries can retain supplied invitation secrets.
  There is no blanket native-history secrecy claim.

Private progress must survive later exceptions without rereading mutable
state to reconstruct what happened. This requirement applies equally to
local save, session creation, credential retrieval and child failure.

## 5. Complete finite command catalog

The following payloads are typed schema descriptions, not literal JSON.
Each command also uses section 3's evidence, error and custody variants.
Statuses describe actual producer outcomes; configuration usage branches
keep exit 2. Refused reads use their actual native reason, and unavailable
resources are never inferred absent. Every `install` base-URL mode echoes
an optional `registerPolicy` of `keys` or `open` when the caller gives it.

| Command or mode | Public result and required evidence |
| --- | --- |
| `install <base-url>` | Mode `direct`, service, actual definition, register ScopeRef, accepted `Created`, operator public KeyId and kept state. Selected cohorts use their exact retained plan even without `--plan`. Capture acceptance before config save or recovery acknowledgement. |
| `install --plan` | Mode `plan`, service, actual definition, register ID, host, namespace, notAfter, optional selected cohort and public custody identity. Never emit the signed founding intent. Exact existing selected plan is successful observation; a conflicting attempted plan is a local refusal. |
| `install --planned` | Mode `planned`, actual register/definition, accepted `Created`, known configured-service acknowledgement and custody. No retained plan remains usage/2. Expired, missing or conflicting originals retain their actual local refusal and do not authorize replacement founding. |
| `install <git+https-uri> --release --request` | Mode `application`, URI, release, request key and the native outcome. Accepted is done/0 with the install item; `next` inspects `application <item>`. Acceptance records the request only. A closed install refusal code is refused/1. A native nonaccepted answer keeps its status; `archived` is unknown/1. A custody failure is local/1 with the retained original. Mixing base-URL options is usage/2. |
| `application <item>` | Install item, state, phase, optional reason and optional screen. State `refused` is refused/1 of observed origin; earlier committed grants stay in force. A refused installation read is unreadable/1. |
| `application upgrade <item> <uri>` | Item, URI, release, request key, form `in-place` or `replace` and the native outcome, mapped as application install. `--role` and `--values` without `--replace` remain usage/2. |
| `apps [--cursor c]` | Directory ScopeRef, actual head, rows (name or null, shortened flag, definition digest, scope ScopeRef), unavailable and shortened counts, `complete` and native `next`. A page with more rows is done/0, as today. A query refusal is unreadable/1. |
| `create <name>`; `claim` alias | Canonical create label, optional allowlisted alias, name, handle, public key/member standing, Repository refs, actual definition pins, founding receipt and each independently confirmed scope/head. `--again` resumes the original. Preserve accepted creation when confirmation or local save fails. A claim whose attempts all failed (`claimState: "failed"`) is refused/1 with local code `claim-failed`. |
| `invite <@member> --role` | Member, role, invitation fact, expiry, actual membership pin and verified `confidential.link`. The legacy direct path and unsupported `--acts` keep their current behavior. No repository remains usage/2. |
| `invite <@member> --device [--hours n]` | Mode `device`, member handle, invitation fact, expiry and `confidential.link` once. A role without `membership.invite`, an inactive member or a membership version with no device link is refused/1 before signing. An unreadable roster after acceptance is partial/1 with the invitation fact in `recorded`. |
| `invite --keep` | Mode `new`, operation, kind, handle, actual issuance state and known accepted steps. State is `prepared`, `unknown`, `refused` or `verified`; it is an observation, not a substitute Answer. Verified is done/0 and may emit the confidential link. An unresolved issuance is unknown/1 with original custody. |
| `invite --check` | Mode `check`, same public operation/state/evidence. Reads the retained original; does not submit or restore a missing public pointer. No retained invitation remains usage/2. |
| `invite --continue` | Mode `continue`, same public operation/state/evidence. Explicitly resumes the exact retained original; no replacement signature or invocation from a renderer. Preserve acceptance through later verification, save or cleanup failures. |
| `join <person link>` | Kind `person`, handle, public key, MemberRef, Repository/inbox refs, actual accepted join fact/receipt and confirmation observations. Resume the exact retained signed original; do not overwrite pending agent enrollment. Link/secret/signature bytes stay private. |
| `join <tagged key link>` | Kind `agent-key`, `checker-key` or `device-key`, mode `continue`, actual public key/seat observations and known accepted steps. No person substitution, key transplant or assumption that retained private bytes prove acceptance. Unavailable/unverified original is a local custody outcome. |
| `join <tagged key link> --check` | Mode `check`, observation/custody only, for the same three kinds. The explicit tagged invitation is required. No new key or mutation. Preserve the existing invalid-link and missing-original exits. |
| `acts [<scope>]` | ScopeRef, actual scope summary head, definition pin, public caller key/standing, separately read membership ScopeRef/head, catalog map by native act kind and hidden count. Keep step/on/grant, complete native field declarations and nonempty also/presents. Omit programs, rules, guards, effects, sends, attention, settles, items, receives and timed. No availability flag; guards still decide at submission. |
| `act <kind> --on <scope>` | Target ScopeRef, native kind, public intent digest and unchanged Answer. Accepted is done with Receipt. Refused/unavailable/mismatch/archived retain their native shapes. Unknown kind or invalid field input keeps its current usage branch. Never emit detached local value bytes. |
| `log <scope> [--limit n] [--cursor c]` | Selected entry summaries, actual first and last observed heads, limit, starting cursor, pages, collected count, `complete` and native `next`. Preserve every native Input variant (section 6). Section 7 states the bound and the incomplete/1 stop. |
| `show <scope>:<seq>` | Actual ScopeRef, sequence, full computed hash and whole native Entry. It accepts an entry position, not a retained definition digest. Keep detached data as native digest references. |
| `items <scope> --query <json>` | ScopeRef, actual head, native items, `complete` and native `next`, from one query page. A page with more rows is done/0, as today. A non-canonical query or another scope's reference is usage/2. A query refusal is unreadable/1 with its native reason. |
| `verify <scope>` | Whole native Report, actual scope, consistent flag and safe public reason when known. A finding is inconsistent/1 with result. A budget stop is incomplete/1 (section 7). A stopped collection cannot invent a complete Report. |
| `verify --all` | Repository, discovery coverage and separate per-scope Report/not-read/cleanup records with actual scope refs and heads. No cross-scope snapshot. Keep the first actual finding separately from incomplete discovery/replay. |
| `status [<scope>] [--request id]` | Per scope: kind, ScopeId, summary status/time/counts, column state `complete`, `more`, `denied` or `unknown`, and the column's head; the unpublished-destination flag; discovery stop at the scope bound; sidecar readings only with `--request`. Partial columns stay done/0, as today. No session is unknown/1. No room is usage/2. |
| `remote` | Destination ScopeRef/head, recorded host/namespace/name and known remote URL. A service-host placeholder stays explicitly unknown rather than a fabricated URL. |
| `clone [<directory>] [--hours n] [--archive]` | Accepted read-token fact, operation, actual native mint outcome fact, waiter progress, known remote URL/expiry and child ran/exit/directory. With `--archive`, also `archive: true` and the journal fetch ran/exit. Mint Input.result is confirmed/refused/unknown, not an invented native “minted”. Token plaintext stays private. No-Git preflight is unsupported/1 before signing. `--archive` without a directory is usage/2. No hardened archive runner is unsupported/1 before signing. An unsafe archive remote is refused/1 of local origin after the mint. A failed journal fetch after a clone is partial/1. Preserve acceptance through session, credential, config-save or child failure. Token retrieval is once; no failure authorizes automatic remint. |
| `edit <path> --file` | Accepted change opening, proposed file fact/version/path/count, optional actual issue link and nested merge result. No local file bytes. An unconfirmed later step is partial/1 with earlier recorded facts and typed cause. |
| `propose <branch>` | Accepted change opening, actual base/tip, proposal fact/version/file count and optional nested merge result. Retain actual capture categories such as no-changed-files and too-many-files as closed local codes; do not rename them to paths or copy arbitrary Git errors. |
| `merge <change> [--closes <issue>]` | Lane ScopeRef, version, accepted merge fact, publication/reservation observation, and commit/tree/page only when known. Committed reservation is not publication. Later refusal/abort is refused/1 of observed origin, with accepted fact retained. Accepted but unobserved is unknown/1, not a retry instruction. |
| `issue open --title` | Actual issue number if known, lane ScopeRef/title, accepted directory opening and independently confirmed lane head. Preserve opening acceptance if lane creation/confirmation cannot be read. |
| `issue comment`, `issue assign`, `issue close` | Friendly command label, separately selected native kind and unchanged Answer. Close selects actual close-own or close-any and uses current completed reason. No invented guard head or reason. |
| `issue wait <issue> <ask> [--hours n]` | Lane ScopeRef, ask item, wake kind `decided`, `withdrawn` or `changes-requested` and the record position to read. Already woken at start is done/0 without a feed. The bound is waiting/3 and signs nothing. A stopped or ended feed is unknown/1; the question may still be open. `waited` holds the hour bound and stop reason. |
| `issues [--after <issue>]` | Directory ScopeRef/head, then each actual lane ScopeRef/head, nullable number, title/state, closeReason, opener and full assignees array. Coverage counts omitted index rows, absent intent rows and stops. Counts describe returned rows and describe the room only when complete. Section 7 states the bound. |
| `check [<directory>] [--config f]` | Phase `local`. Semantic and presentation IDs, validated definition count, validation findings by closed check, severity and reason, projected creation and lifetime ceilings, per-scenario name, steps, replay target and projection checks, and declared capability bounds. Validation refusal is refused/1 of local origin with its findings. No local paths. |
| `new <directory>` | Phase `local`. `created: true`; the caller already holds the directory name, so the result omits it. An existing directory is refused/1 with local code `exists`. |
| `pack [<directory>] [--config f] [--out f] [--publisher k]` | Phase `local`. Semantic, presentation and release IDs and the publisher. No output path. A missing publisher key, an existing output or a validation refusal is refused/1 of local origin. |

`scope-index` is a Node operator command outside version 1. With `--json` it
returns usage/2 before it reads a manifest or configuration. Its existing
`versions` and `verify` lines already print `JSON.stringify` reports
(`packages/cli/src/scope-index-command.ts:65-73`); adopting them as `result`
needs its own review.

A directory index can remain stale when a merge closes an issue. It supplies
order and lane lookup, not the lane's current state. `issuesOf` reads each
actual lane. A refused lane read retains prior valid rows as unreadable/1;
it does not declare that lane absent. Today a refused lane read stops the
whole listing and discards prior rows
(`packages/cli/src/command-issues.ts:38`); the typed result keeps them.
Issue mutations, `issue wait` and edit/merge linking share the lookup
`issueNamed` (`packages/cli/src/command-issues.ts:54-59`), which today reads
every lane. The typed lookup reads the index and then only the named lane.

The acts catalog is keyed by native act kind, with no repeated kind field.
A field keeps native bounds, required/default declarations and nested
record/list forms. Role filtering and rule grants follow the current
producer. A finished Counter can still list start; listing grants no act.
The historical C1 observation measured one profile's full act forms at
8,436 compact UTF-8 bytes and selected catalog fields at 2,705 bytes.
It is not a universal definition or envelope-size bound. A future full
catalog flag is deferred. Authorized definition reads supply native bytes;
`dap show` does not accept a definition digest.

## 6. Log inputs and truthful coverage

A log summary retains sequence, full hash, time, effect/send counts and a
discriminated summary of every native Input type:

| Input.type | Relevant native fields retained when present |
| --- | --- |
| `genesis` | kind, decision |
| `act` | signed intent kind and public actor |
| `delivery` | native message class/type, from and actual decision/clause when present |
| `diagnosis` | of, finding |
| `timed` | item, rule, due |
| `preparation` | capability, step and public actor |
| `outcome` | operation, attempt, owner, kind, result |
| `checkpoint` | through, state |

No variant invents an act kind, signer, decision or judged head. `show`
provides the whole Entry. `log` does not inline arbitrary signed fields or
private local bytes to reproduce a line summary.

Coverage distinguishes end reached, bound exhausted, refused read and
transport stop. It records pages, collected entries, actual observed heads
and the last native cursor when present. `total` is emitted only after
complete collection from the genesis and means entries actually collected.
A result that starts at `--cursor` or stops early instead says `collected`.
A cursor without successful read evidence supplies no invented head.

Current `log` reads up to 1,000 pages and checks no final next cursor at
exhaustion (`packages/cli/src/command-scope.ts:157-165`). It reports
“N entries in all” even when a next page exists. It retains every collected
Entry, then applies slice(-limit). `--limit` bounds neither collection nor
bytes and has no absolute maximum; zero and negative values keep JavaScript
slice behavior until an explicit argument-policy change is adopted. Section 7
replaces the silent stop.

Current room discovery uses a page allowance per discovered scope (default
1,000, `packages/cli/src/command-verify.ts:126`), inside the per-command
verification budget. A complete single-scope Report does not imply complete
room discovery or cleanup. The typed result records those three phases
separately.

## 7. Bounded reads: one page set per invocation, the caller keeps the cursor

This section revises revision 5. Revision 5 proposed a shared collector with
a signed `--read-next` token, a local ReadProgressStore with locking,
compare-and-swap and crash recovery, and `--restart-read`. Revision 6 drops
all of them. The reasons:

- They add new local state, a new signing domain and a new filesystem
  primitive, none of which exists at `9255e1f8`.
- `items` and `apps` already ship a simpler pattern: one bounded page per
  invocation, a native cursor printed for the caller, and explicit
  coverage (`packages/cli/src/command-scope.ts:115-138`,
  `packages/cli/src/application-list.ts:12-39`).
- A caller that wants more pages passes the cursor back. The CLI credits no
  coverage across invocations, so it needs no record of earlier ones.

### The pattern

Each read command performs at most its stated bound of reads per
invocation. Its result holds the rows read, the actual head of each page
read, `complete` and, when the read stopped before the end, the native
`next` cursor. The caller keeps the cursor and passes it back on the next
invocation. Each invocation is a fresh, independently authorized read. No
result claims coverage, a count or a snapshot across invocations. Native
per-response bounds still apply. No native record or declaration is
silently truncated.

| Command | Bound per invocation | At the bound |
| --- | --- | --- |
| `log` | 1,000 history pages, the current loop cap (`packages/cli/src/command-scope.ts:157`); `--cursor` starts at a native history cursor | incomplete/1, `complete: false`, `next` |
| `items` | one query page of at most `query.limit` rows, at most 100 (`packages/contract/src/item-query.ts:7`) | done/0, `complete: false`, `next`, as today |
| `apps` | one query page of 25 rows (`packages/cli/src/application-list.ts:8`), plus at most one retained-definition read per distinct digest on the page | done/0, `complete: false`, `next`, as today |
| `issues` | the directory index read, then at most 100 lane summaries; `--after <issue>` starts after a listed issue number or lane | incomplete/1, `complete: false`, `next` holds the last listed issue |
| `verify`, `verify --all` | the existing `VERIFY_LIMITS`: 300 s, 256 MiB, 100,000 requests, 100,000 entries (`packages/cli/src/verification.ts:16`); discovery 1,000 pages per scope | incomplete/1 with phase, scope, input cursor, limit reason and counters (`packages/cli/src/verification.ts:62`); no continuation |
| `status` | 20 pages per column and 1,000 scopes (`packages/cli/src/status-report.ts:8-9`) | done/0 with column state `more` or the discovery stop, as today; no cursor |

`log` stops at its bound with incomplete/1 because the caller asked for the
last entries, and a capped read cannot name them. Its selected summaries
are the last `--limit` entries of the collected range, labelled as such.
`items` and `apps` stay done/0 because the caller asked for one page.
`issues` gains a bound because it reads one lane per issue without limit
today. Its value of 100 matches the item-query row bound and is a proposed
policy value, not a measurement. `verify` has no cursor: a stopped replay
cannot resume without a verifier checkpoint, so the caller reruns it.

### What the signed token guarded against

| Case | Revision 5 answer | Answer with a caller-held cursor |
| --- | --- | --- |
| Forged cursor | The local signature stopped a caller from claiming skipped scopes, counts or tail entries as completed work. | The CLI credits no work across invocations, so a cursor can only position a read. Authorization precedes cursor use (`packages/bytes/src/item-query.ts:104`; `packages/scope/src/reads.ts:287-289`). An item cursor must decode strictly and re-encode to the same bytes (`packages/bytes/src/item-query.ts:89-100`); otherwise the scope answers `invalid-cursor`. The cursor carries no signature (`packages/bytes/src/item-query.ts:104`), so a well-formed forged cursor only moves the start of a page the caller may read. A history cursor is a sequence position (`packages/scope/src/reads.ts:290-291`); a forged one reads only entries the caller may already read from the genesis. |
| Replayed cursor | Revision checks and compare-and-swap stopped an old token from crediting progress twice. | An item cursor binds scope, head, query digest and limit (`packages/bytes/src/item-query.ts:77-85,113-114`). A replay after the scope moves gets `stale-cursor`, which is unreadable/1; the caller starts again with no cursor. The client restarts by itself only when the first cursor was null (`packages/client/src/item-query.ts:44`). History is append-only, so a replayed history cursor returns the same sealed entries and hashes with the current head. A cursor below the journal floor gets `archived` with `next` at the floor (`packages/scope/src/reads.ts:292-293`). |
| Read racing a write | The progress lock serialized local invocations, and a changed bound head ended the cumulative operation. | No local progress exists, so no local race exists. Each page reports its actual head. An item page set whose head moves stops with `head-changed` (`packages/client/src/item-query.ts:47`); a status column whose head moves becomes `unknown` (`packages/cli/src/status-report.ts:22`). A history page read after a write includes the new entries; the `log` result records its first and last observed heads and claims no snapshot. |

### Text rendering changes the same way

The design forbids a JSON-only policy, so text output follows each change.
`log` at its bound prints the collected summaries, then
`Incomplete: <pages> pages read; next cursor <c>. Run: dap log <scope> --cursor <c>`
and exits 1. `log --cursor` prints `N entries from cursor <c>` in place of
`N entries in all`. `issues` at its bound prints the rows and
`Incomplete: <n> issues listed. Run: dap issues --after <last>`, and exits 1.
A `log` or `issues` read that completes without the new options keeps its
existing bytes, streams and exit. `items`, `apps`, `status` and `verify`
keep their text.

## 8. Schema and compatibility

Version 1 freezes only after the corrected design and implementation review.
Publish the checked-in schema under `packages/cli/schema/`. Its variants
discriminate command, mode, phase, status and evidence origin. The schema
must permit every reachable result/evidence combination, including result
on refused, unsupported, unknown and error. It never replaces native
validators or actual UTF-8 admission.

Within version 1, optional keys and commands may be added. Required key
removal/rename, type changes, changed status exits or a new closed status
require version 2. Consumers ignore unknown optional keys and never rely on
key order. Native structures follow the native contract and package version;
the envelope does not rename or privately version their fields.

Checker `4a15bc25` preferred inconsistent/1 with native result, confidential
link output, done facts in result and the schema in the CLI package. This
design keeps those preferences. Full catalogs, environment defaults,
JSON-lines and follow mode remain deferred. Review `0fb944f7` accepted the
MCP exception and the incomplete direction. Revision 6 keeps both and
replaces the continuation mechanism (section 7).

## 9. Meaningful verification plan

Builder implements and runs focused checks; checker reviews the exact head;
planner owns priorities and task acceptance. The following are planned
witnesses, not passing evidence from this document change.

| Invariant | Cheapest meaningful witness |
| --- | --- |
| One execution, two renderers, no repeated mutation or read | Render both from one existing command fixture's typed result; retain existing text/exit assertions. |
| Exactly one stdout document/newline for exits 0, 1, 2 and 3 | Process-boundary harness including early config failure and the `issue wait` bound; verify exit equality and compact bytes. |
| Option-position JSON preserves consumed data | Parser/main cases for title --json, repeated switches, issue non-open and MCP value ownership. |
| Native evidence survives later failure | Strengthen existing acceptance-then-refusal, custody-save, session, credential and child-failure cases. Use reachable failures, not one fixture per status. |
| Native shapes and full identifiers remain intact | Exact equality of native Answer, Created, Archived, Receipt, Report and Entry fields from existing fixtures. |
| Private failures cannot enter public serialization | Path/credential sentinels in early config and later filesystem/transport failures, one per raw-message site of section 4, plus explicit confidential-link and authorized-history cases. |
| Actual issue reads remain distinct from index state | One existing multi-lane listing with outdated index, different heads, nullable number, close reason and multiple assignees. |
| Catalog gives forms, not availability | Existing profile/Counter fixture: native field declarations, rule grants, hidden count, separate heads and finished start listing. |
| Every native log variant and stop remains truthful | Existing log witness extended with diagnosis/timed/preparation/outcome/checkpoint, a page bound with a next cursor giving incomplete/1, and a `--cursor` resume. |
| A cursor positions a read and credits nothing | Forged, stale and below-floor cursors give `invalid-cursor`, `stale-cursor` and `archived` with no `total` or complete coverage. |
| Each bound stops with explicit coverage | Small injected bounds for log pages, issue lanes and verify limits; no wall-clock sleeps. |
| Child stdout cannot corrupt the document | Git stand-in writes both streams; separately retain captured-byte behavior and preflight. |
| JSON MCP and dev rejection starts nothing | main/parser effect sentinels for config, key, root, listener, file read and protocol; unchanged no-JSON paths. |
| Schema matches public producers | Validate actual result fixtures and meaningful invalid combinations; do not mirror implementation in a second serializer. |

Run the tests of changed source while implementing, and one gate at the
review candidate under `docs/testing.md`. No mutation sweep or repeated
whole suite. Completed text behavior stays covered by existing witnesses;
the new `log` and `issues` stops are explicit exceptions tested in both
renderers.

## 10. Source reconciliation and implementation plan

This revision changes one Markdown file. It compares the design with Main
`9255e1f8`. `packages/cli/src/commands.ts` is now a re-export hub; the
commands live in the files below.

| Decision | Source |
| --- | --- |
| Token ownership, aliases and command modes | `packages/cli/src/line.ts`: USAGE, SWITCHES, parse, KNOWN, command, applicationUpgrade, issue |
| Early dispatch, config and MCP | `packages/cli/src/main.ts`: main; `config-dir.ts`: configDir |
| Outcome shape | `packages/cli/src/command-context.ts:59`: Outcome |
| Shared outcomes and raw-message boundary | `packages/cli/src/command-support.ts`: run, answered, accepted, archivedAnswer |
| Base-URL install and creation custody | `packages/cli/src/command-install.ts`: install, planInstall, installPlanned, executePlannedInstall |
| Create and claim | `packages/cli/src/claim.ts`: claim, walkClaim |
| Application install, upgrade and read | `packages/cli/src/application-install.ts`; `application-install-runtime.ts`: call |
| Scope reads and direct acts | `packages/cli/src/command-scope.ts`: acts, act, apps, items, log, show, status; `application-list.ts`; `status-report.ts` |
| Invitations and enrollment | `packages/cli/src/command-membership.ts`: invite, inviteDevice, join; `invitations.ts`: invitePerson, issueInvitation, enrolAgentKey, enrolCheckerKey, enrolDeviceKey |
| Verification budget and discovery | `packages/cli/src/command-verify.ts`: verifyScopeCommand, roomScopes, verifyAll; `verification.ts`: VERIFY_LIMITS, Verification; `verify-cleanup.ts`: observeCleanup |
| Remote, clone and archive clone | `packages/cli/src/command-repository.ts`: remote, clone, cloneUsing; `clone-outcome.ts`: waitOutcome; `archive-remote.ts` |
| Change workflows | `packages/cli/src/command-change.ts`: edit, propose, merge |
| Issues and the issue wait | `packages/cli/src/command-issues.ts`: issuesOf, issueNamed, issueAct; `issue-wait.ts`: issueWait |
| Local application tools | `packages/cli/src/application-command.ts`: newCommand, checkCommand, packCommand; `application-dev.ts` |
| Operator index | `packages/cli/src/scope-index-command.ts`: scopeIndexCommand |
| Captured versus inherited Git output | `packages/cli/src/git.ts`: capture, nodeGit, archiveRunner |
| Long-lived MCP effects | `packages/cli/src/mcp.ts`: mcpOptions, mcpRoot, mcp |
| Native answers and reads | `packages/contract/src/result.ts`: Answer, ReadRefusal; `transport.ts`: Created; `read.ts`: Read; `floor.ts`: Archived; `entry.ts`: Input |
| Cursor binding | `packages/bytes/src/item-query.ts`; `packages/client/src/item-query.ts`; `packages/scope/src/reads.ts`: history |

This comparison covers those named boundaries, not every branch. It makes no
claim that a renderer or schema has run.

After checker approval, the planner files five implementation requests,
CJ-1 to CJ-5. Each is its own gated head. Each keeps text bytes and exits
except where section 7 says otherwise, runs its focused tests while it
changes source, and passes one gate. CJ-1 lands first. CJ-2 and CJ-3 can
run in parallel lanes after it. CJ-4 follows CJ-3, and CJ-5 is last.

| Slice | Content | Files | Focused tests |
| --- | --- | --- | --- |
| CJ-1 envelope | Option-position `--json` scan; mode before `configDir()` and the early `dev`/`check`/`new` dispatch; typed result and error on `Outcome`; JSON renderer; closed error factories and the private carrier; closed codes for the `command-support.ts` and `main.ts` raw-message sites; `mcp`, `dev` and `scope-index` refusal; commands `remote`, `show`, `acts`. | `line.ts`, `main.ts`, `command-context.ts`, `command-support.ts`, a new renderer module, `command-scope.ts`, `command-repository.ts` | parser ownership table; process-boundary document and exit; private-path sentinels; MCP and dev no-effect; three command fixtures |
| CJ-2 bounded reads | `log` (`--cursor`, incomplete/1 at the bound), `items`, `apps`, `issues` (`--after`, lane bound, kept rows on a refused lane), `verify`, `verify --all`, `status`, in both renderers; read refusals `archived` and `too-large`. | `command-scope.ts`, `application-list.ts`, `command-issues.ts`, `command-verify.ts`, `verification.ts`, `status-report.ts`, `line.ts` | log variants, bound and resume; forged, stale and below-floor cursors; outdated index and lane bound; verify budget stop |
| CJ-3 single acts | `act`; `issue open`, `comment`, `assign`, `close`; `issue wait` with `waiting`/3; base-URL `install`, `--plan`, `--planned` and `--register-policy`; native `Answer`, `Created` and `archived`; single-lane `issueNamed`. | `command-scope.ts`, `command-issues.ts`, `issue-wait.ts`, `command-install.ts` | exact native equality; acceptance kept after a later failure; archived answer; wait bound exit 3 |
| CJ-4 workflows | `create`/`claim`, `invite` (all modes, including `--device`), `join` (person, agent, checker, device), `clone` (with `--archive`), `edit`, `propose`, `merge`; `recorded`, `custody`, `waited`; closed codes for the `invitations.ts` and `command-verify.ts` raw-message sites. | `claim.ts`, `command-membership.ts`, `invitations.ts`, `command-repository.ts`, `clone-outcome.ts`, `command-change.ts` | evidence-survives-failure rows; confidential link once; child-stream separation; archive journal fetch failure |
| CJ-5 applications and schema | Application `install`, `application`, `application upgrade`, `check`, `new`, `pack`; closed codes for the application raw-message sites; the schema under `packages/cli/schema/`, validated against actual fixtures; CLI reference examples. | `application-install.ts`, `application-install-runtime.ts`, `application-command.ts`, `application-scenarios.ts`, new `packages/cli/schema/` files, CLI docs | schema against fixtures; invalid combinations; check findings without paths |

The parent request `92d6dddb` closes only after CJ-5 lands. No slice
publishes a package, pushes GitHub or deploys Cloudflare.

Revisions 4 and 5 answered checker reviews `0fb944f7` and `764cf535` on the
signed continuation and its store. Section 7 replaces that mechanism, so
their remaining duties lapse with it.
