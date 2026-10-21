# R3: publication and authority facts in the current code

Read-only study of `~/play/artroom-worktrees/test-overhead` at commit `d691e6e9`.
Facts only; no design. Nothing was built, run or changed.

Path prefixes used below:

- `G/` = `packages/git/src/`
- `R/` = `packages/room/src/`
- `P` = `docs/protocol.md`
- `N/` = `notes/`
- plans are in `~/play/artroom/plans/`

"Not found" means the source is silent. "Inference" marks a conclusion I drew from two anchored facts; everything else is stated by the source.

---

## 1. The landing state machine

Files: `G/landing/core.ts` (synchronous state machine), `G/landing/engine.ts` (asynchronous driver), `G/landing/types.ts`.

### 1.1 Shape

- Every core method is one SQLite transaction with no I/O and no `await`; the driver does git and token work between them. "a crash can only happen between two transactions" (`G/landing/core.ts:4-8`).
- Stated rules of the file (`G/landing/core.ts:10-26`):
  - "Reservation is one transaction and the only linearization point (R-LAND-7)."
  - "One publication slot per room (R-PUB-1). It is released only by `landed` or `aborted`, each decided by reading main back (R-PUB-2, R-PUB-5). Elapsed time, token expiry or a lost container never release it."
  - "`aborted` needs proof that no push can still land: every push attempt ended with an outcome that shows nothing was applied (R-PUB-6, R-REV-5)."
  - A token whose revocation failed is still owed one after its operation ends; "it never holds the slot or delays a receipt, and its answer decides nothing about whether a push landed".
- Storage: `artroom_land_op` (one JSON body per operation), `artroom_land_meta` (keys `slot`, `main`, `order`, and two one-time migration marks), `artroom_land_token_cleanup`, `artroom_land_token` (`G/landing/core.ts:120-131`).

### 1.2 States

`LandRecordState` (`G/landing/types.ts:98-107`). Active states are `accepted, preparing, ready, publishing, unresolved`; pre-reservation states are `accepted, preparing, ready` (`G/landing/core.ts:84-86`). Protocol: "`landed`, `aborted`, `retryable` and `failed` are terminal" (`P:1054-1055`).

| State | Meaning | Anchor |
|---|---|---|
| `accepted` | Recorded in the Room's admission transaction for the `land` act, before any external I/O. `expectedMain` is main as the room last recorded it. | `core.ts:399-428` |
| `preparing` | Integration being built, or built and waiting on obligations (`waiting`), or readiness answer pending. | `core.ts:438-457`, `569-582` |
| `ready` | Integration built, obligations met, land rules passed; holds `evidence` and the retained reservation input. | `core.ts:571-577` |
| `publishing` | Reserved: holds the slot, has a publication number and `reservedAt` seq. | `core.ts:676-684` |
| `unresolved` | A read-back after a push attempt did not show the integration. Slot still held. | `core.ts:865-873` |
| `landed` | Main read back equals the integration. Terminal. Frees the slot. | `core.ts:880-904` |
| `aborted` | An abort attempt exists and every push attempt has a "not applied" outcome. Terminal. Frees the slot. | `core.ts:828-831`, `906-915` |
| `retryable` | Ended before reservation for a cause the holder can fix by landing again. Terminal. | `core.ts:365-372` |
| `failed` | Ended before reservation by conflict or a failed readiness answer. Terminal. | `core.ts:374-380` |

### 1.3 Transitions

| From | To | Trigger | Anchor |
|---|---|---|---|
| none | `accepted` | `accept`, inside the Room's transaction that records `land`. Refused `land-in-progress` if the lane already has an active operation. Throws if main is not yet known. | `core.ts:399-428` |
| `accepted` | `preparing` | `startPreparation`; first checks the lane (`laneMismatch`). | `core.ts:438-457` |
| `accepted` | `retryable` | `startPreparation` finds a lane mismatch. | `core.ts:443-446` |
| `preparing` | `preparing` (retry later) | Integration build error: backoff 2 s doubling to 120 s. | `core.ts:465-472`, `78` |
| `preparing` | `failed` (`conflict`) | Integration result is a conflict. | `core.ts:488-491` |
| `preparing`/`ready` | `preparing` (re-prepare, `attempts+1`, integration and evidence dropped) | Main moved (`observeMain`, or a landing just landed), or policy version changed. | `core.ts:337-361`, `479-487`, `556-560`, `613-625`, `651-655` |
| `preparing` | `ready` | `applyReadiness` with `ready`; only the answer to the latest evaluation revision is applied. | `core.ts:545-577` |
| `preparing`/`ready` | `failed` / `retryable` | Readiness answer `failed` / `retry`. | `core.ts:583-588` |
| `accepted`/`preparing`/`ready` | `retryable` | `laneChanged(lane, reason)` called by the Room. "A reserved one is not touched (R-LAND-8)". | `core.ts:594-610` |
| `ready` | `publishing` | `reserve` (section 1.4). | `core.ts:634-686` |
| `ready` | `retryable` | `reserve` finds a lane mismatch, or the Room's `revalidate` returns a reason. | `core.ts:643-647`, `657-661` |
| `ready` | `preparing` | `reserve` finds main or policy moved. | `core.ts:648-655` |
| `publishing`/`unresolved` | `landed` | `readBack` observes main equal to the integration. Checked first, before anything else. | `core.ts:824-827` |
| `publishing`/`unresolved` | `aborted` | `readBack` with an abort recorded on the operation and `cannotLand` true. Checked second, for any observed main other than the integration. | `core.ts:828-831`, `876-878` |
| `publishing` | `unresolved` | `readBack` mode `after-push` observes `expectedMain` (retry forward with backoff) or anything else (`unexpected`, stop pushing, re-read every 300 s). | `core.ts:838-847`, `76` |
| `publishing` (no change) | — | `readBack` mode `probe` (first read after a restart) observes `expectedMain`: "any earlier attempt is lost to us, so push forward now". | `core.ts:832-837` |

`laneMismatch` (`core.ts:383-390`): lane missing → `lease-changed`; generation or head differs → `generation-moved`; holder released → `released`; lease expired or lease generation differs → `lease-changed`.

Retry reasons and their fixes: `generation-moved`, `lease-changed`, `released`, `authority-lost`, `evidence-invalid`, `obligation-open`, `land-input-changed` (`core.ts:88-96`).

### 1.4 Reservation

`reserve(id)` (`core.ts:629-686`), one synchronous transaction. In order:

1. Operation must be `ready` and have no readiness evaluation still out (`core.ts:637-639`).
2. If the slot is held: return `slot-held`; the operation stays `ready`. Not a mismatch (`core.ts:640-641`; `P:1143-1144`).
3. Lane check (`laneMismatch`) → `retryable` (`core.ts:643-647`).
4. Main (as the room last recorded it) and policy version must equal the operation's; otherwise re-prepare, not end (`core.ts:648-655`).
5. `room.revalidate(op, retained)` → `retryable` with its reason (`core.ts:656-661`).
6. Take `publication = slot.last + 1`; record system event `land-reserved` with `op, lane, generation, integration, expectedMain, evidence, publication`; set state `publishing`, `reservedAt = seq`, `pushes = []`; set the slot held (`core.ts:663-684`).

"From here the landing is authorized irrevocably (R-LAND-8)" (`core.ts:630-632`).

`reserveNext` reserves the oldest `ready` operation in acceptance order, only when the slot is free (`core.ts:688-699`).

Main used at reservation is the room's recorded value, not a fresh read of the host: `observeMain` records main only "when the slot is free" and is fed by `refreshMain` (`core.ts:326-335`; `engine.ts:279-285`). The reconcile loop calls `refreshMain` only if main is still null (`engine.ts:555-560`). After the first read, main is updated only by a landing of this room (`core.ts:902-903`). Other callers of `refreshMain`: not traced.

The Room's `revalidate` (`R/core.ts:1110-1162`), synchronous, inside the reservation transaction:

| Check | On failure | Anchor |
|---|---|---|
| The `land` act's entry exists | `authority-lost` | `R/core.ts:1112-1113` |
| Config-recovery lane: signer is an active admin's own key, no delegation | `authority-lost` | `R/core.ts:1117-1120` |
| The active document still declares the act's kind | `authority-lost` | `R/core.ts:1124-1125` |
| `judge(...)` of the land envelope now, "as for a new admission" | `authority-lost` | `R/core.ts:1126-1127` |
| Under a delegation: the envelope's binding is still the active binding | `authority-lost` | `R/core.ts:1128-1135` |
| The generation exists and is not blocked | `authority-lost` / `obligation-open` | `R/core.ts:1138-1140` |
| Each evidence act still counts for some obligation ("a compromised key, retirement under `reopens`, or a sole-admin flag that no longer holds") | `evidence-invalid` or `obligation-open` | `R/core.ts:1142-1150` |
| No blocking obligation is open (advisory ones never hold up reservation) | `obligation-open` | `R/core.ts:1151-1153` |
| The land input rebuilt with `stage: "reservation"` equals the retained canonical bytes (bytes compared, no hashing or evaluation in the transaction) | `land-input-changed` | `R/core.ts:1154-1160`; `G/landing/types.ts:61-70` |

Lane, lease, main and policy version are checked by the engine core, not by `revalidate` (`core.ts:643-655`).

### 1.5 The publication slot

- One per room, stored as meta key `slot`: `{state:"free", last}` or `{state:"held", op, publication, reservedAt, last}` (`core.ts:109`, `219-226`).
- Taken only in `reserve` (`core.ts:683`).
- Released only in `land` (`core.ts:901`) and `abortOutcome` (`core.ts:914`). Both set `last = publication`.
- While held: `observeMain` ignores a read of main ("the publication decides main", `core.ts:331`); `reserve` returns `slot-held`; `reserveNext` returns null; `after()` returns `{op, reservedAt}` for every act admitted meanwhile (`core.ts:299-303`).
- The Room pushes flag `after-reservation` on every act decided while `landing.after()` is set, and the accepted receipt carries `after: <op>` (`R/admission.ts:669-670`, `1830`, `1848`).
- Later landings while one is unresolved: they can be accepted, prepared and become `ready` (preparation is parallel, `engine.ts:289`, `565-569`), but none reserves. `reconcile` works the held slot first and reserves the next only `if (!this.core.held())` (`engine.ts:547-563`). Protocol: "No reservation is made until the slot is free. Acts are still admitted meanwhile, with `after`" (`P:1212-1215`); "No later operation reserves while an earlier one holds the slot" (`P:1217-1218`).
- No admin act releases a held slot: "The contract has no act that releases a held slot without terminal evidence, because that would break R-PUB-2" (`P:2170-2174`, open point 16).

### 1.6 The named outcomes and events

| Name | What it is | Anchor |
|---|---|---|
| `abort` (core method) | Called on a `compromised` revocation of a key behind the held publication. Sets `op.abort = {trigger, key, at, tokenRevoked:false, recorded:false}` and `nextAt = now`. Stops forward pushes (`beginPush` returns null when `op.abort` is set). Returns null if no slot is held. | `core.ts:919-936`, `718` |
| `abort-attempt` (system event) | Recorded once per operation by `abortRecorded`, after the driver tried to revoke every live publication token; `tokenRevoked` says whether all were revoked. Also recorded by `land`/`abortOutcome` if not yet recorded. | `core.ts:944-964`, `882`, `908`; `engine.ts:416-424` |
| `enforceAbort` (driver) | "Not queued behind the publication step, so it can race the push it is trying to stop." | `engine.ts:409-424`; called first by the Room, `R/core.ts:2095-2096` |
| `publication-unresolved` (system event) | Recorded the first time an operation becomes `unresolved`, with the read-back (`expected-main` or `unexpected` plus the observed SHA). `since` is set once. | `core.ts:865-873` |
| `retryable` | `land-outcome` event with `{state:"retryable", reason}`; receipt stored on the operation. Pre-reservation only. | `core.ts:365-372` |
| `failed` | `land-outcome` with `{state:"failed", reason}`. Pre-reservation only. | `core.ts:374-380` |
| `landed` | `land-outcome` with `{state:"landed", commit, publication}`. If an abort attempt exists, also a `revert-lane` event (reason `abort-after-landing`, scope = the landing's changed paths). Frees the slot, sets main to the commit, re-prepares other operations. | `core.ts:880-904` |
| `aborted` | `land-outcome` with `{state:"aborted", publication}`. Frees the slot. Main is not changed in the record. | `core.ts:906-915` |

`cannotLand` (`core.ts:875-878`): `(op.pushes ?? []).every((p) => definitelyNotApplied(p.outcome))`. Consequences read from the code:

- With zero push attempts recorded, it is true (an abort before the first push ends `aborted` at the next read-back).
- An attempt whose `outcome` is still null ("Null while the push is in flight, or if the room stopped before learning the result", `types.ts:93-94`) makes it false. `pushResult` only writes an outcome if none is set (`core.ts:763-766`); nothing writes an outcome for an attempt left null by a restart. Inference: after a crash during a push, that operation can end only as `landed`.
- The `aborted` check runs before the comparison with `expectedMain`, so it also applies when main shows another writer (`core.ts:828-846`).

Backoffs: forward retry 1 s doubling to 60 s, "Never a deadline" (`core.ts:73-74`); unexpected-writer read-back every 300 s (`core.ts:76`); token cleanup 1 s doubling to 5 min, "Never a deadline" (`core.ts:79-80`).

### 1.7 The driver's publish step, in order

`publishStep` (`engine.ts:339-407`); one publication step at a time per engine (`serial`, `engine.ts:323-328`).

1. `enforceAbort()`.
2. If only a read is due (aborting, or another writer seen): read main, apply, return.
3. `beginPush()` records attempt `n` durably (no token yet) and returns the plan `{op, n, publication, integration, integrationRef, expectedMain}`; "the same integration and the same lease every time (R-PUB-5)" (`core.ts:709-736`).
4. Mint one token with owner string `publish:<op>:<n>` (`engine.ts:354`). If the mint fails: record outcome `error` ("token not minted"), read back, return.
5. `pushToken`: record the token ID on the attempt, insert the `artroom_land_token` row, and claim the mint-ledger record, in one transaction (`core.ts:742-756`; `engine.ts:365-372`).
6. If an abort arrived meanwhile: record outcome `error` ("abort attempt before the push started"), revoke, return (`engine.ts:375-380`).
7. Call `publisher.push(...)`. A thrown call becomes outcome `unknown` ("push did not answer") (`engine.ts:382-399`).
8. `pushResult` (durable outcome), `revokeLive` (best effort), then `readBackAndApply(…, "after-push")` (`engine.ts:400-406`).

Test fault points between these transactions: `attempt-recorded`, `token-answered`, `token-minted`, `push-in-flight`, `push-returned`, `token-revoked`, `read-back` (`engine.ts:148-156`).

`reconcile` (alarm handler and first work after restart, `engine.ts:534-571`): for a held slot, revoke tokens a previous instance left live, read main back in `probe` mode, then up to three `publishStep`s; then reserve the next and publish; then start token cleanup (not awaited); then start due preparations and lost readiness evaluations.

---

## 2. The push itself

### 2.1 Commands for the canonical push, in order

Every git invocation is an argument array with these `-c` settings first: `core.hooksPath=/dev/null`, `core.fsmonitor=false`, `core.attributesFile=/dev/null`, `attr.tree=<empty tree>`, `credential.helper=`, `gc.auto=0`, `maintenance.auto=false`, `fetch.recurseSubmodules=false`, `submodule.recurse=false`, `core.symlinks=false`, `init.defaultBranch=main` (`G/publisher/gitops.ts:52-65`, `211-218`); in the container also `protocol.allow=never`, `protocol.https.allow=always`, `http.sslVerify=true` (`G/publisher/container.ts:65-70`). Per-command deadline 120 s by default (`gitops.ts:44-45`, `215`; `container.ts:83`).

`pushMainNow(canonical, integration, expectedMain, fromRef)` (`gitops.ts:517-530`), under a per-remote lock (`gitops.ts:513-515`, `232-237`):

1. `git -C <dir> rev-parse --is-bare-repository`; if not a bare repo, `git init -q --bare <dir>` (`gitops.ts:240-246`).
2. `git -C <dir> cat-file -e <integration>^{commit}` (`gitops.ts:258-260`, `522`).
3. Only if the commit is missing: `git -C <dir> fetch -q --no-tags --no-write-fetch-head <remote> +<integrationRef>:<integrationRef>`, then the `cat-file` again; still missing → outcome `error` (`gitops.ts:249-251`, `522-525`).
4. Any exception in steps 1 to 3 → outcome `error` "before the push" ("Anything that fails before `git push` runs sent nothing", `gitops.ts:518`, `526-528`).
5. `git -C <dir> push --porcelain --force-with-lease=refs/heads/main:<expectedMain> <remote> <integration>:refs/heads/main` (`gitops.ts:341-344`, `529`).

Facts about that push:

- One refspec, one ref. "The one push: move `ref` on `remote` to `sha` under a lease … Pinning, staging, publication to main and the log all push through here" (`gitops.ts:336-340`).
- `--atomic` is not passed anywhere in `G/` or `R/` (search for `--atomic` returned no code match). No multi-ref push exists in the publisher. Atomicity across refs is neither requested nor relied on.
- No push option, no idempotency token and no attempt identity is sent to the host. The only identity on the wire is the old and new SHA of the one ref.
- The integration commit is already in the canonical repository before publication: preparation pushes it to `refs/artroom/integration/<op>/<attempt>` with `createRef` (lease "must not exist"), or uses the pinned head ref when it fast-forwards (`gitops.ts:89-92`, `420-444`). So "the publication push carries almost nothing" (`N/2026-10-01-laneB-token-inflight.md:88-90`).
- The integration commit is deterministic for (base, head, lane, generation): merge commit dates are the later of the two parents' commit times (`gitops.ts:386-418`).

Order of the other refs written to the canonical repository for one landing (each its own push, its own token, its own gateway grant):

| Step | Ref | Lease | Token | Anchor |
|---|---|---|---|---|
| Pin objects (before `propose` is admitted) | `refs/artroom/objects/<head>` | must not exist | canonical write, 600 s; fork read, 600 s | `gitops.ts:84-87`, `303-322`; `G/publisher/client.ts:163-173` |
| Pin ref (after admission) | `refs/artroom/heads/<lane>/<generation>` | must not exist; "never moves" | canonical write, 60 s | `gitops.ts:79-82`, `324-333`; `client.ts:175-180` |
| Integration (preparation) | `refs/artroom/integration/<op>/<attempt>` (merge only) | must not exist | canonical write, 60 s | `gitops.ts:427-444`; `client.ts:110-132` |
| Publication | `refs/heads/main` | `<expectedMain>` | canonical write, 60 s, one per attempt | `gitops.ts:513-530`; `engine.ts:86-87` |
| Log | `refs/artroom/log` | previous log commit or "must not exist" | canonical write, 60 s | `gitops.ts:665-712`; `R/logremote.ts:46-50` |

### 2.2 Outcome classification

`classifyGitPush(exitCode, stdout, stderr, dstRef)` (`G/publisher/push-outcome.ts:63-87`). "The rule: never say `error` or `rejected` when the ref might have changed. When in doubt, the answer is `unknown`. The landing engine never decides an outcome from this alone: it reads main back (R-PUB-5)" (`push-outcome.ts:14-16`).

| Class | Evidence | Anchor |
|---|---|---|
| `landed` | A porcelain status line for the destination ref with flag one of space, `+`, `-`, `*`, `=`, and exit code 0. | `push-outcome.ts:66-73` |
| `unknown` | Same flags with a non-zero exit code. | `push-outcome.ts:72` |
| `unknown` | A status line with a flag that is none of those and not `!`. | `push-outcome.ts:74` |
| `rejected` / `lease` | Flag `!` and summary contains `(stale info)` (git's own lease check) or `(stale ref)` (the receiver's). | `push-outcome.ts:75` |
| `rejected` / `non-fast-forward` | Flag `!`, summary starts `[rejected]`. | `push-outcome.ts:76` |
| `rejected` / `remote-rejected` | Flag `!`, summary starts `[remote rejected]`. | `push-outcome.ts:77` |
| `error` | Flag `!`, summary starts `[no match]`. | `push-outcome.ts:78` |
| `unknown` | Flag `!` with any other summary, "includes `[remote failure]`: sent, no status". | `push-outcome.ts:79` |
| `unknown` | Exit 0 but no status line for the ref. | `push-outcome.ts:81` |
| `rejected` / `remote-rejected` | No status line, non-zero exit, and stderr has a line `remote: <code>` with a code in `ARTIFACTS_REFUSALS` (only `artifacts_git_receive_pack_object_too_large`, "Measured live on 2026-10-02"; "Add only codes that Artifacts is known to answer before any ref update"). | `push-outcome.ts:44-61`, `82-83` |
| `unknown` | stderr matches an after-send pattern: `RPC failed`, `unexpected disconnect`, `remote end hung up unexpectedly`, `early EOF`, `send-pack:`, `[remote failure]`. Checked before the before-send patterns. | `push-outcome.ts:25-33`, `84` |
| `error` | stderr matches a before-send pattern: `fatal: unable to access '…': `, `Authentication failed`, `could not read Username`, `fatal: repository '…' not found`, `does not appear to be a git repository`. | `push-outcome.ts:35-42`, `85` |
| `unknown` | Anything else. | `push-outcome.ts:86` |

`definitelyNotApplied(outcome)` is true only for `error` and `rejected` (`push-outcome.ts:100-103`). `pushResult`: "What the push reported. It is evidence for `aborted` only, never for `landed`" (`core.ts:758`).

Outcomes the driver records without running git: `error` "token not minted" (`engine.ts:358`), `error` "abort attempt before the push started" (`engine.ts:377`), `unknown` "push did not answer" when the publisher call throws (`engine.ts:397-399`).

What a durable record keeps of a push answer: the outcome, the kind of refusal, and a listed Artifacts refusal code; "Never git's or the remote's text, which can echo a URL or a header" (`push-outcome.ts:89-98`).

### 2.3 After a lost or ambiguous reply

- Every push attempt is followed by a read of main, whatever the outcome (`engine.ts:402-406`). The read uses the Artifacts binding, not git: `repo.log({ref, limit: 1})` for `main` then `refs/heads/main` (`G/artifacts.ts:133-141`; `client.ts:143-145`). No token is minted for it.
- The expected value is the integration commit recorded on the operation at reservation. `landed` is decided only by `observed === integration` (`core.ts:823-827`).
- If main is still `expectedMain`: state `unresolved`, then push again later with a new attempt number, a new token, the same integration and the same lease (`core.ts:838-842`, `709-736`).
- If main is something else: `unresolved` with `readBack.main = "unexpected"`; no more pushes; a read every 300 s (`core.ts:843-846`, `718`).
- If main cannot be read: nothing is decided; retry with backoff (`core.ts:852-863`; `engine.ts:520-528`). In `probe` mode a failed read records nothing.
- After a restart: revoke tokens left live, read main (`probe`), then push forward (`engine.ts:547-554`; `core.ts:832-837`).
- Retry identity: the attempt number `n` within the operation, durable before any token exists (`core.ts:720-726`). The token's owner string is `publish:<op>:<n>` (`engine.ts:354`). Neither reaches the host. A late push from attempt `n` and a forward retry `n+1` are the same compare-and-swap (`expectedMain` → `integration`), so whichever applies gives the same main. Acceptance tests named for this: "a delayed, already-authenticated push completes after its token's expiry and after a forward retry", "a delayed push lands while the forward retry is still in flight" (`N/2026-10-01-laneB-git.md:55`).
- The log push uses the same classifier, mapped to lane L's outcome: `landed` → ok ("lane L still reads the ref back"); lease refusal with the current value read back → `lease-mismatch`; other refusal → `refused`, "does not push again"; everything else, including `error`, → `unknown`, then a read-back (`G/publisher/log-push.ts:1-19`, `38-48`). `pushLog` reads the ref with `ls-remote` before pushing and returns a lease rejection without pushing if it differs (`gitops.ts:685-687`).

---

## 3. The ref fence

Files: `G/publisher/ref-fence.ts`; used by `ArtifactsGateway` and `Publisher` in `G/publisher/container.ts`.

### 3.1 What it is

- The container starts with `enableInternet: false`; its only way out is HTTPS to the Artifacts host, which `interceptOutboundHttps` sends to a gateway `WorkerEntrypoint` (`container.ts:5-14`, `120`, `131-138`).
- "No token enters the container." Each operation gives the gateway its tokens and the exact ref updates allowed (`container.ts:10-12`).
- Why it exists: "Artifacts lets any write token update any ref, and force-push (plan section 2). The fence narrows each token to its purpose" (`ref-fence.ts:6-10`).

### 3.2 What it inspects and refuses

`gatewayFetch` (`ref-fence.ts:152-173`):

| Condition | Result | Anchor |
|---|---|---|
| Not `https:` or not the configured host | 403 "host" | `ref-fence.ts:154` |
| Path not under a granted repository path | 403 "repository" | `ref-fence.ts:155-156` |
| Otherwise | `Authorization: Bearer <grant.token>` is set | `ref-fence.ts:158-159` |
| Not a receive-pack request (a fetch) | Forwarded | `ref-fence.ts:160` |
| Receive-pack and the grant has `updates: null` | 403 "this operation may not push" | `ref-fence.ts:161` |
| Receive-pack, not POST (discovery `info/refs`) | Forwarded | `ref-fence.ts:162` |
| POST with `content-encoding` | 403 "compressed push" | `ref-fence.ts:163` |
| POST with no body | 403 "empty push" | `ref-fence.ts:164` |
| POST | The pkt-line commands are read from the start of the body; every command must be for an allowed ref with exactly the allowed old and new SHA; a deletion (new = zero) is refused; then the whole body is replayed upstream | `ref-fence.ts:165-168`, `102-109` |

`readCommands` refuses: a body that ends inside the commands, a non-pkt-line, `shallow` or `push-cert` lines, a line that is not `<old> <new> refs/…`, and commands over 64 KiB (`ref-fence.ts:40-80`, `23`). A body with no commands (just a flush) is allowed: "git sends a body of just a flush to probe authentication before a large push, and a request without commands updates nothing" (`ref-fence.ts:97-101`).

Grants per operation (`container.ts`):

| Operation | Grant | Anchor |
|---|---|---|
| `push` (publication) | `refs/heads/main`: `{old: expectedMain, new: integration}` | `container.ts:290-295` |
| `integrate` | no push until the commit is built, then `storeRef`: `{old: ZERO, new: sha}` | `container.ts:272-288` |
| `pinObjects` | fork: read only; canonical: `refs/artroom/objects/<head>`: `{ZERO, head}` | `container.ts:158-167` |
| `pinRef` | `<ref>`: `{ZERO, head}` | `container.ts:169-174` |
| `preview` | no push, then `refs/artroom/objects/<integration>` | `container.ts:216-222` |
| `pushLog` | `refs/artroom/log`: `{lease ?? ZERO, next}` | `container.ts:234-247` |
| `readLogRef`, `listTree`, `stageLog` | no push (`stageLog`: no grants at all) | `container.ts:177-179`, `255-270` |

Remote URLs are accepted only on the Artifacts host, in the deployment's namespace(s), ending `.git`, with no credentials or query (`ref-fence.ts:116-129`; `container.ts:126-129`).

### 3.3 What it does not see or guarantee

- It checks the request's stated old value against the grant. It does not read the ref's actual value on the host; the host's own compare-and-swap decides (inference from `ref-fence.ts:102-109`; the spike note records that Artifacts refused the loser with `stale ref`, section 5.2).
- It does not inspect the pack contents (only the command section is parsed; the rest is replayed, `ref-fence.ts:81-94`).
- It does not see the host's answer: the upstream response is returned unread (`ref-fence.ts:168`).
- It holds no state between requests. `GatewayProps` is `{host, repos}` only (`ref-fence.ts:131-141`). It does not count requests, record that a push was forwarded, or carry an attempt or operation identity. In-flight tracking: not found. Attempt identities: not found.
- Any number of POSTs matching the grant are forwarded while the route is open (inference: no counter exists).
- The route is replaced with an empty grant set when the operation's function returns (`closeRoute`, `container.ts:140-154`). What that does to a request already forwarded upstream: not found.
- Serialization is in-memory, per Publisher object and per GitOps remote (`container.ts:60`, `73-77`; `gitops.ts:226-237`). "Operations run one at a time: they share the git directory and the gateway's per-host route" (`container.ts:13-14`). Nothing durable lives in the container (`container.ts:305`).
- The spike that introduced the pattern: "We did not test it adversarially" (`N/2026-10-01-spike-sandbox-git.md:38-39`).
- Inference from the classifier and the in-flight note: a gateway 403 on the POST reaches git as an HTTP failure of the RPC. The note records git's message for a 403 after sending as `error: RPC failed; HTTP 403 … send-pack: unexpected disconnect`, which the classifier reads as `unknown`, "not as a refusal" (`N/2026-10-01-laneB-token-inflight.md:70-73`). So a fence refusal is not classified as "definitely not applied". Whether a test covers this exact case: not checked.

---

## 4. Tokens and custody

### 4.1 Kinds of token

| Token | Minted by, when | Scope | Lifetime | Stored where | Ends when |
|---|---|---|---|---|---|
| Publication | Landing engine through the canonical mint ledger, once per push attempt, after the attempt is durable (`engine.ts:101-110`, `351-354`) | write, canonical repo; narrowed by the gateway to main `expectedMain → integration` | 60 s, "the shortest lifetime Artifacts allows" (`engine.ts:81-87`) | Plaintext in memory only, passed to the Publisher object's gateway. ID on the push attempt and in `artroom_land_token` (`core.ts:748-756`) | Revoked after the attempt (`engine.ts:403`, `426-440`); if that fails, by a later step while the slot is held, or from `artroom_land_token_cleanup` after the operation ends (`core.ts:160-178`; `engine.ts:442-504`) |
| Integration staging, pin ref, preview | `withCanonicalToken` through the mint ledger, per operation (`client.ts:90-97`, `110-132`, `175-191`) | write, canonical; gateway allows one new ref | 60 s (`client.ts:83-88`) | Ledger record; plaintext in memory | Released (revoked by ID) however the function ends; a failed revocation stays owed (`G/mints.ts:405-413`, `665-688`) |
| Pin objects (canonical side) | Same, before `propose` is admitted (`client.ts:163-173`) | write, canonical; gateway allows `refs/artroom/objects/<head>` | 600 s | Same | Same |
| Pin objects (fork side) | `ForkTokens.withToken`, the fork's own ledger (`client.ts:164`; `G/workspace/fork-tokens.ts:1-8`) | read, the lane's fork | 600 s | `ForkTokens` record on the Workspaces SQLite | Released by its caller; failed revocation stays owed |
| Log push / log read | `artifactsLogRemote.withToken` through the mint ledger (`R/logremote.ts:46-50`) | write / read, canonical; gateway allows `refs/artroom/log` only | 60 s | Ledger record | Released after the call |
| Snapshot preparation read | `mints.withToken('snapshot:<commit>', "read", 300)` (`R/core.ts:257`) | read, canonical | 300 s (`P:3598-3599`) | Ledger record | Released after the write |
| Check job, whole tree | `core.mints.mint('job:<jobId>', "read", …, {notAfter: deadline})` per attempt (`R/jobs.ts:431`) | read, canonical | ends 5 s before the job's deadline (`R/jobs.ts:56-57`) | Claimed into `job_tokens` in one transaction (`R/jobs.ts:28-31`, `432-440`); plaintext goes in the job's `gitAuthEnv` | When the attempt ends: row due now, kept "until Artifacts confirms the revocation or its known expiry has passed" (`R/jobs.ts:201-209`, `298-306`) |
| Check job, filtered | `SnapshotRepos.mint(commit, job, deadline)` (`G/snapshot/repos.ts:14-15`, `329-366`) | read, that snapshot's own repository | to the job's deadline, minus margin | `artroom_snap_token` holds the ID only; "a plaintext token is never stored" (`repos.ts:132`) | `end(commit, job)` owes its revocation; the repository is deleted when no job is left (`repos.ts:16-17`, `370-389`) |
| Workspace (lane) | `Workspaces.mintWithinLease`, once per lease generation (`G/workspace/workspaces.ts:454-511`) | write, the lane's fork only | lease remaining minus 5 s; minimum 60 s (`workspaces.ts:80-81`, `124-125`, `475-476`) | ID on `artroom_ws`; plaintext in `artroom_ws_secret`, "Secrets live apart from the public row" (`workspaces.ts:184-185`, `497-503`) | `revoke(lane, lease)` on release, expiry or take-over: forgets the secret, owes the token and an inventory of the fork (`workspaces.ts:760-783`); also owed on renewal or a new lease (`workspaces.ts:406-407`) |
| Fork creation token | Comes with `canonical.fork(...)`; 24 hours; the binding's `fork` takes no TTL (`workspaces.ts:17-19`, `530-557`; `N/2026-10-01-laneB-git.md:180`) | write, the fork | 24 h | Not kept | Revoked by the fork's inventory sweep |
| Snapshot repo creation token | Comes with `artifacts.create(...)` (`G/artifacts.ts:37-42`) | write, the new snapshot repo | not stated in `repos.ts` | In memory for the write | Revoked by plaintext right after the write; then every active token revoked under a complete inventory before the repo is ready (`repos.ts:289-307`) |
| Canonical repo creation token (public founding) | Comes with `artifacts.create`; 24 h | write, the new canonical repo | 24 h | `artroom_ws_canon_secret`, by its revocation duty, "until Artifacts confirms the revocation" (`workspaces.ts:186-187`, `795-797`) | Revocation duty |
| Session token | The Room, on a signed `session` request or a client-custody join (`R/requests.ts:71-75`, `168-173`, `257`) | reads only | at most 3600 s | Hash only, table `sessions` | Expiry, or judged invalid at each use (section 6) |
| Bearer token | The Room, at room-custody redemption (`R/requests.ts:422-434`) | reads, acts and workspace requests under the session's delegation | invitation's `session.ttlSeconds`, default 24 h (`R/requests.ts:369`) | Hash only, table `bearers`; "returned once" (`R/requests.ts:439`) | Expiry, or judged invalid at each use |

No member ever holds a canonical write token (`P:1184-1187`). "A token that expires during an upload refuses it" is the stated reason for the 600 s pin lifetime (`client.ts:82-88`).

### 4.2 The canonical mint ledger (`G/mints.ts`)

"One durable record owns each token the Room creates on its canonical repository, from before the create request is sent until Artifacts answers its revocation, or another owner claims it in one transaction" (`mints.ts:5-7`).

Record states (`mints.ts:9-18`):

| State | Meaning |
|---|---|
| `sent` | The request is out and no answer is recorded. |
| `held` | Known by ID and text, given to a caller on this live host. |
| `owed` | Known by ID; its revocation is due at `due`. |
| `unknown` | "the create may or may not have applied. Only its own request's later answer settles it. Time, lifetimes, inventories and the end of the owner never do (R-MINT-5)." |

Mechanics:

- Order of one mint (`mints.ts:415-516`): (1) insert the `sent` record and the takeover time in one transaction; (2) await the wake-up being stored, else drop the record and send nothing; (3) compute the lifetime now and store it; (4) send `createToken(scope, ttl)` and wait at most 30 s (`MINT_WAIT_MS`, `mints.ts:101-102`).
- A timeout makes the record `unknown`; the late answer still settles that record, and no caller gets the text (`mints.ts:475-491`, `586-595`).
- An answer is usable only with token text, the scope asked, a readable expiry no later than arrival + lifetime + 5 s and no later than `notAfter`, for a caller still waiting (`mints.ts:518-540`). Otherwise the token is `owed` at once.
- `refusedUnchanged` errors (`ALREADY_EXISTS`, `INVALID_INPUT`, `INVALID_REPO_NAME`, `INVALID_TTL`, `NOT_FOUND`, with a numeric code) close the record. Every other failure, "including Artifacts' INTERNAL_ERROR (10400, which has been seen after a fork was created) and any transport failure", leaves the outcome unknown (`G/artifacts.ts:88-102`; `mints.ts:542-545`).
- A transient error is retried up to 5 times, "Each is a new record" (`mints.ts:134-135`, `392-403`, `513-515`).
- Handoff: `claim()` deletes the ledger record synchronously inside the new owner's transaction (`mints.ts:658-661`). `release()` revokes by ID; an answer deletes the record; a refusal, timeout or failed completion makes it `owed` (`mints.ts:665-688`).
- If the answer's ID cannot be recorded: write it again up to 3 times as `owed`, then revoke at once. "If storage refused every write, the Room cannot guarantee that the duty survives" (`mints.ts:597-633`).
- Takeover at each host start: "`sent` records become `unknown`, and `held` records become `owed`, due at once" (`mints.ts:25-27`, `347-367`). A stored wake-up at most 60 s ahead exists while anything is `sent` or `held` (`mints.ts:113-116`, `433-437`, `696-705`).
- Owed revocations: batches of 20, backoff 1 s doubling to 5 min, "Never a deadline"; a record whose readable expiry has passed is settled with no revocation call (`mints.ts:119-124`, `715-821`).
- Observation of unknown creates: one listing, counted only if complete and at most 1,000 records; counts live tokens that no record names; "An observation never settles a record and writes no record" (`mints.ts:20-23`, `823-897`). `known(tokenId)` consults `job_tokens` and the landing's `artroom_land_token` by point lookup (`R/core.ts:340`; `G/landing/core.ts:214-217`).
- Records are never evicted; admins can page them; no record holds a token's text (`mints.ts:71-84`, `920-950`).
- Errors kept on records are a fixed stage phrase plus a safe name, a listed Artifacts code, and an integer code or status. "Never the error's message or any other provider text: no token format in the contract lets a pattern find every credential" (`mints.ts:179-198`).

### 4.3 Invariant statements: complete inventory, unknown effects, cleanup

| Invariant | Statement | Anchor |
|---|---|---|
| Complete inventory | "an incomplete or malformed listing proves nothing is absent, so no caller may treat it as an inventory." A listing counts only if `total` equals the number of records and every record has an ID, a known scope and state, and a readable expiry. | `G/artifacts.ts:54-80` |
| | "Only a complete inventory settles anything (plan 001)". | `G/workspace/workspaces.ts:650-651` |
| | A snapshot repository is ready "only once no token is active", shown by a complete inventory. | `G/snapshot/repos.ts:10-12`, `303-307` |
| Unknown effects | An in-flight step "is never settled, by any snapshot or by elapsed time: it keeps an inventory on a capped backoff … for as long as the fork exists." | `workspaces.ts:33-39` |
| | Only success or `refusedUnchanged` closes a step: "they are the completion fence". | `workspaces.ts:22-24`, `276-283` |
| | "Every retry is its own step, because an earlier failed attempt may still apply." | `workspaces.ts:38-39` |
| | A foreign repository at the fork's name settles answered and owed duties, "never a step in flight: occupancy is not that step's answer." | `workspaces.ts:53-56`, `616-623` |
| | A workspace is ready "only after an inventory that started after its token was recorded has succeeded". | `workspaces.ts:48-50`, `440-447` |
| | "The in-memory fork lock coordinates one live host only; it is never restart evidence." | `workspaces.ts:50-51` |
| | The canonical ledger never revokes a token it cannot match by ID to one of its records and never sweeps the canonical repository. | `P:3581-3583`; `engine.ts:472-478` |
| | While a fork-token create on a fork is `sent` or `unknown`, the fork's sweep "revokes only tokens whose IDs a record names … (R-WS-3 suspended, never inferred around)". | `workspaces.ts:652-662`; `fork-tokens.ts:32-38`, `538-549` |
| | Snapshot repos: each creation attempt has its own name, "so a late attempt can never create, or settle the cleanup of, another attempt's repository". Same for canonical incarnations: "A name is created at most once and never reused". | `repos.ts:21-29`; `workspaces.ts:787-794` |
| Cleanup | "Every duty is written before the remote effect it covers", and a wake-up is stored before each create. | `repos.ts:35-39`; `workspaces.ts:92-100` |
| | A known token's debt ends when that token has expired (workspace duties; mint ledger owed records with a readable expiry). A token with no readable expiry is never settled by time. | `workspaces.ts:37`, `642-643`; `mints.ts:730-738`; `P:3556-3560` |
| | Publication token cleanup: "never give it up"; not on the publication queue; "No answer changes an outcome or a receipt." | `core.ts:791-799`; `engine.ts:442-478` |
| | Every cleanup run leaves each open duty due in the future, "so a Room alarm set from nextDue() never spins". | `workspaces.ts:595-601` |
| | Cleanup checks provenance first: a fork's source must be exactly `artifacts:<namespace>/<canonical>`; anything else "is never used, changed or deleted". | `workspaces.ts:566-583`, `118-119` |

### 4.4 Secrets and bindings (names only)

Room Worker (`packages/room/wrangler.jsonc:30-64`; `R/config.ts:20-53`):

- Secret: `ROOM_KEY_SECRET`.
- Artifacts bindings: `ARTIFACTS`; optional `IMPORT_ARTIFACTS`.
- Durable Object bindings: `ROOMS` (class `Room`), `REGISTRY` (class `Registry`), `PUBLISHER` (class `Publisher`, with container image `git`).
- Vars: `LEASE_SECONDS`, `PUBLIC_NAMESPACE`, `ARTIFACTS_NAMESPACE`, `ARTIFACTS_HOST`, `OPERATOR_KEYS`, `PUBLIC_URL`, optional `IMPORT_NAMESPACE`, `PIN_DELAY_MS`.
- Service bindings to the checkers (named in the checker config's comment): `CHECKER_TESTS`, `CHECKER_TYPES`, `CHECKER_LLM_REVIEW` (`packages/checkers/wrangler.jsonc:7-9`).
- Room-held private keys (member and session keys of room-custody members) are stored in table `held_keys` (`R/admission.ts:1852`; `R/store.ts:46`; `R/core.ts:2270-2271`).

Publisher object: `ARTIFACTS_HOST`, `ARTIFACTS_NAMESPACE`, optional `IMPORT_NAMESPACE` (`G/publisher/container.ts:27-32`).

Checker Worker (`packages/checkers/src/worker.ts:34-46`; `packages/checkers/wrangler.jsonc:36-47`): secret `CHECKER_KEY`; bindings `AI`, `RUNNER` (class `RunnerBox`), `ROOM` (service); vars `ARTIFACTS_HOST`, `ARTIFACTS_NAMESPACES`, `RUNNER_IMAGE`, `LLM_MODEL`.

---

## 5. What the notes established about the Git host

### 5.1 `N/2026-10-01-laneB-token-inflight.md` (read in full)

**Question** (title, line 1): "Does revoking or expiring an Artifacts token stop a push in flight?"

**Method** (lines 22-48): a laptop near New York, git 2.54.0, a new repo per run in namespace `gitseq-spike`. `git push --porcelain` of a new branch whose commit adds a 2 MiB random file; git sends discovery (`GET info/refs`), a 4-byte authentication probe (`POST`), and the push body (`POST git-receive-pack`). A local proxy added the token (git never held it), could hold the push-body request and throttle its upload. Each case minted a write token over REST with a lifetime of 60 s or 600 s; revocation used `DELETE /tokens/{id}`. After each push a fresh read token listed the refs; "Accepted" means the new branch existed at the pushed commit.

**Results** (lines 54-65):

| Case | Token | Answer | Ref accepted |
|---|---|---|---|
| A0 | Revoked while the body was held before sending | 403 | No |
| A | Revoked while the body was uploading (600 s token) | 403 | No |
| B | Expired at 60 s while the body was uploading | 403 | No |
| C | Expired at 60 s; body started 5 s before expiry | 403 | No |
| D (control) | Valid throughout | 200 | Yes |
| E (5 runs) | Revoked at the moment the last body byte was sent; the revoke call returned 0.3 to 0.7 s later | 200 | Yes, 5 of 5 |

"In case E, the revoke call returned before the push's answer in 3 runs" (lines 63-65).

**Finding** (lines 9-20, quoted):

- "A push still sending its body was refused when its token was revoked, or expired, before the body finished. This held even when the token was valid when the push request started (cases A, B and C)."
- "A push whose body had already been sent was accepted, although its token was revoked at that moment (case E, 5 of 5 runs). In 3 of those runs the revoke call had already returned before the push's answer arrived."
- "So revocation narrows the window in which an old push can land, but does not close it. **Revocation and expiry are not terminal evidence** that a push did not and cannot land. The rule stands: nothing is released on elapsed time or token state; only reading main back decides (R-PUB-2, R-PUB-5, R-PUB-6)."

Further statements:

- In every refused case "the probe request had already succeeded with the same token"; "Artifacts answered 403 only after the whole body had arrived"; git's error is read by the classifier "as `unknown`, not as a refusal, because git reports it after sending" (lines 67-73).
- "We found no point after which a revoked or expired token guarantees that an earlier push cannot land. Case E shows a push accepted after its token's revocation had been confirmed to the caller" (lines 77-80).
- "The abort attempt still helps. Revoking the publication token after a `compromised` revocation (R-REV-5) stops a push that is still uploading" (lines 84-86).
- "A push whose body takes longer than the token's remaining life is refused (cases B and C)" (lines 87-88).
- "A 403 after sending looked like a clean refusal every time (4 of 4 refused cases left the ref unchanged). We still do not treat it as proof, because we cannot see inside the receiver. The engine reads main back" (lines 94-97).

**Limits** (lines 99-110): one client location, one git version, 2 to 10 MB bodies, a client-side throttle; "We cannot observe when Artifacts checks the token relative to applying the ref update"; case E ran 5 times and "the design does not depend on which way it goes"; "Artifacts documents revocation, but not what it does to operations in progress. A documented guarantee would supersede this note."

### 5.2 `N/2026-10-01-spike-sandbox-git.md`

| Topic | Finding (quoted) | Lines |
|---|---|---|
| Lease behavior | "In 20 races between two container lands, exactly one landed every time, and Artifacts refused the other." | 11-13 |
| | "In all 20 races, by Artifacts: `[remote rejected] (stale ref)`. Both pushes passed git's own lease check, so Artifacts' compare-and-swap on the ref decided." | 112 |
| | "The race test shows that Artifacts enforces compare-and-swap on the ref. The Room's serial landing has a safety net underneath it." | 186-187 |
| | Lease rejection reasons: "`stale ref` from Artifacts, or git's `stale info`". | 51-52 |
| Reply loss | "A push can fail after the receiver has already accepted it." | 254-255 |
| | Captured cases where the server applied the push then answered 502, closed the connection, or cut the report: "**main had moved**, but git exited with a failure." These used a local smart-HTTP server, not Artifacts. | 279-286 |
| | "We did not run a live lost-response test against Artifacts, and we did not rerun the timing or race measurements." | 315-316 |
| Read-back | "After `unknown`, the Room must read back main, and reconcile it against the commit in the response, before it lands anything else." "After `error`, nothing was sent. After `rejected`, main did not change because of this push." | 293-296 |
| | "Reading back main is enough only when the response names the integration commit. The whole response can be lost … Then … no one knows which commit to look for. Reading back main cannot settle that operation. Hold it for recovery, and land nothing more until it is settled. Lane B supplies a durable identity for each operation, and the reconciliation that uses it." | 298-304 |
| Timings (10 runs each, inside the Durable Object) | Warm preview about 210 ms; warm land p50 509 ms, max 570 ms (fetch 267, merge 8, push 195); cold preview 823 ms small repo, 2,548 ms for a 10 MB repo; measured cold starts 223 to 675 ms; first start after first deploy 5,893 ms. | 9-11, 89-102 |
| Other host facts | "Artifacts does not support `filter`", so no blobless partial clones. | 153-155 |
| | "`exec()` has no timeout. A stuck git process would hold the sandbox. The Room needs its own deadline and `kill()`." | 156-157 |
| | "No Artifacts 10400 errors this time." | 163-164 |
| | Gateway pattern: "We did not test it adversarially." | 38-39 |

Atomic multi-ref push: not mentioned in this note. The only mention found is in `N/2026-10-01-artroom-plan.md:109-116`, under "Artifacts as a git store (measured)", sourced from an earlier harness and labelled "baseline observations, not measurements of Artroom" (`:107`):

- "Fast-forward checks, `--force-with-lease` and `--atomic` behave correctly. In a 10-way race of fast-forward pushes, exactly one won."
- "Repo tokens are read or write, can expire, and revoke immediately."
- "Push events arrived in order, 0.2–0.9 s after the push, over 35 events."
- Gaps: "Any write token can force-push." "`read_only` is recorded but not enforced." "About 5 in 70 repo or fork creations failed with an internal error (10400) and succeeded on retry." (`:117-121`)

The current code does not use `--atomic` (section 2.1). How `--atomic` was tested, and against what failure, is not stated there.

### 5.3 `N/2026-10-01-laneB-git.md`

- Landing summary: "a durable record in SQLite, parallel preparation, reservation in one synchronous transaction, one publication slot, a 60-second token per push, complete-forward recovery, abort attempts, and crash recovery by the alarm. Nothing is released on elapsed time" (lines 32-36).
- Acceptance cases and their tests (lines 48-59), including: crash at each of six points; push paused then release, new generation, objection, `retired` revocation; push paused then `compromised` revocation with three endings ("landed, with a revert lane"; "refused at the remote because its token was revoked: aborted"; "the push gives no answer: unresolved, slot held, no further push, never guessed"); delayed authenticated push after token expiry and a forward retry; the forward retry itself fails; "two rooms that both believe they hold the slot".
- "The stance on unresolved publications is unchanged: revocation, expiry or elapsed time is never proof that a push cannot land" (lines 142-143).
- Live timings, one run each: workspace ready 1.9 to 3.3 s; pin a head warm 1.0 to 1.6 s plus 0.4 to 0.5 s; "Land: prepare, then reserve and publish | 0.53 s and 0.55 s" (lines 83-91). "after release, a push with the lane's old token got HTTP 403" (lines 96-97).
- Not done: "Live crash tests against the real container. Crash recovery was tested in Node (real git) and in workerd … with a fake remote in workerd"; "An admin action for an unresolved publication (protocol open point 16): none exists; admins can see it"; batching (lines 111-125).
- Review db683a1d: "A rejected call is not a completion fence"; "Elapsed time ended cleanup on an assumption. The apply bound is removed" (lines 206-207). "Not adopted: treating an observed fork as a fence for its creation token, and deleting a lane's fork when the lane ends. Neither is verified against Artifacts" (lines 215-217).
- Mutation note: two landing guards (pushing despite an abort, pushing against another writer) first survived "because the driver's read-back step shadowed the core's guard"; core-level tests were added (lines 70-75).

### 5.4 Stated guarantees and stated absences

| Statement | Anchor |
|---|---|
| Artifacts enforces compare-and-swap on a ref under `--force-with-lease` (measured, 20 of 20 races). | `N/2026-10-01-spike-sandbox-git.md:112`, `186` |
| No documented statement of what revocation does to an operation in progress. | `N/2026-10-01-laneB-token-inflight.md:109-110` |
| No completion fence for a failed create request: "no bound after which it cannot [apply], and no request ID whose outcome can be asked". | `P:3647-3651` (open point 42) |
| No attribution: a token create takes only a scope and a lifetime; no label or idempotency key. | `P:3652-3657` (open point 43) |
| When a token's lifetime starts is assumed, not documented. | `P:3594-3596`, `3658-3660` (open point 44) |
| Whether `listTokens()` returns revoked and expired tokens, or how many, is not documented. | `P:3661-3664` (open point 45) |
| "No such evidence is established today" for "did not and cannot land". | `P:1206-1210` (R-PUB-6) |
| A lost-response test against Artifacts itself was not run. | `N/2026-10-01-spike-sandbox-git.md:315-316` |

### 5.5 Plans 001 to 004 (one-paragraph invariants)

| Plan | Invariant | Anchor |
|---|---|---|
| 001 complete token inventories | "A successful listing is insufficient when its records do not account for its total." "Never reinterpret an incomplete page as absence." Incomplete or malformed responses leave debt scheduled. | `plans/001-…:21`, `60`, `73` |
| 002 retain unknown fork effects | "A foreign repository observed at the requested name proves that it must not be touched. It does not prove that an earlier unknown fork-create request can never apply." "Name occupancy is an observation, not an operation identity." | `plans/002-…:21`, `66` |
| 003 retry terminal publication tokens | A known token's cleanup must not depend on the operation being active or on the slot. "Future terminal states must remain eligible for credential cleanup even when they are ineligible for publication work." "No expiry or revoke result is used as evidence that a push did not land." Stop "if the design needs to change R-PUB-2/R-PUB-6 or block the slot on cleanup". | `plans/003-…:20`, `60`, `65` |
| 004 persist founding wake | A durable duty is not enough without a stored wake-up before the remote effect. "A failed wake must prevent dispatch and retain recoverable debt." "Future provider effects need both durable ownership and a reachable recovery schedule." "Shared alarm caching must never claim successful persistence after a rejected setAlarm." | `plans/004-…:21`, `59`, `72` |

Plans 001, 002 and 004 are marked "DONE, pending review"; plan 003 has no status line, but its mechanism (`artroom_land_token_cleanup`) is present in `G/landing/core.ts:125-129`.

---

## 6. Authority today

### 6.1 `judge`: the four cases (`R/authority.ts:107-165`)

Identity comes "from the verified signature only (R-ADM-2)"; every refusal here is unrecorded (`authority.ts:1-7`). `judge` reads current SQLite state and the room clock; it takes the active policy document as a parameter.

| Case | Selected when | Checks | Anchor |
|---|---|---|---|
| (b) Delegation | The envelope names a `delegation` (checked first) | Signing key not revoked; delegation exists, not revoked, not expired by room clock, granted to this key; kind is not `roster`; delegation covers the kind (declared kinds: by the signed grant map and the exact binding, and the kind is still delegable; legacy kinds: in `kinds`); covers the lane; grantor key is active; grantor's member is active; grantor's role may still sign the kind | `authority.ts:121-122`, `167-219` |
| (c) Join | A `roster` act with op `join` and no delegation | Invitation exists, unused, unexpired; secret hash matches; signing key bound to no member and never revoked; invitation custody matches the admission path (which "the room's code sets"); member not removed | `authority.ts:124-125`, `221-251` |
| (d) Recovery | The actor is the room's recovery key | Not revoked; kind is `roster` and op is not `join`, `delegate`, `undelegate`. No membership, role or policy check | `authority.ts:127-135`; `R/roster.ts:37-38` |
| (a) Direct member | Otherwise | Key is a member's key and active (`key-revoked` / `not-member`); member active; role may sign the kind (legacy table, or the declared kind's `who.roles`); roster ops by role | `authority.ts:137-164` |

Result on success: `Authority` with `via` = `member` / `delegation` / `join` / `recovery`, the member, role and key; for delegation also the delegation ID and the grantor key (`authority.ts:164`, `214-218`, `246-250`, `134`).

### 6.2 When authority is judged

| Moment | What | Anchor |
|---|---|---|
| Admission step 4 | `judge` | `P:383`, `407-411` |
| Final boundary | Inside the write transaction, with the clock read now: `judge` again; if the authority differs from the one decided on, start over (`Moved`); a lease past expiry also starts over. "Authority that depends on time … or on state is judged again". | `R/admission.ts:327-347` |
| Never again as an act | "An admitted act's authority is never re-judged as an act. It is judged again only as evidence (R-REV-1)." | `P:469-470` |
| Reservation | The land initiator's authority is judged "as for a new admission" (section 1.4). | `R/core.ts:1126-1135`; `P:1122-1123` |
| Each unrecorded request | Workspace, workspace-token, session: judged at that request. | `P:579-588` |
| Each use of a session or bearer token | `authenticateHash`. | `R/requests.ts:181-198` |
| Idempotent replay | Step 3 runs before step 4: an exact retry returns the original result "even if the key has since been revoked. It is idempotency, not re-admission." | `P:382`, `524-527`; `R/admission.ts:356-360` |

"Admission is atomic. No other act is admitted between the reads used to judge an act … and the write that records it" (`P:463-467`).

### 6.3 `retired` versus `compromised`

Revocation is the roster op `revoke-key {key, reason}` (`packages/contract/src/roster.ts:27-28`, `107`). Signed by an admin or the recovery key (`roster.ts:88-93`). Refused if the key is already revoked, or is the recovery key ("replaced with rotate-recovery, not revoked"), or it would leave no active admin unless signed by the recovery key (`R/admission.ts:459-465`, `1636-1653`). A key that is no member's key can be revoked: it goes to table `revoked_keys` (`R/admission.ts:1725-1727`; `R/roster.ts:89-95`).

| Effect | `retired` | `compromised` | Anchor |
|---|---|---|---|
| New acts signed by the key | Refused `key-revoked` | Same | `authority.ts:140-143`, `179-180`; `P:409`, `452-454` |
| Acts under a delegation it granted | Refused `delegation-invalid` at admission, because the grantor key is no longer active | Same | `authority.ts:204-206` |
| Delegations granted by or to the key | Rows not changed | Marked `revoked = seq` | `R/admission.ts:1678-1680`, `1729` |
| Earlier evidence signed by the key, or under a delegation it granted | Stays valid, unless policy `retiredEvidence: "reopens"` | Stops counting, always | `R/obligations.ts:127-139`; `P:1232-1261` |
| Receipt lists invalidated evidence and reopened obligations | No (`invalidated` is computed only for `compromised`) | Yes | `R/admission.ts:1658-1683` |
| Unreserved landings using that evidence | No call at revocation; caught at reservation by `revalidate` (`authority-lost` if the initiator's key or its grantor is revoked; `evidence-invalid` under `reopens`) | Sent to `retryable` `evidence-invalid` at once | `R/admission.ts:1731-1739`; `R/core.ts:1126-1127`, `1142-1150` |
| Reserved landing | No effect: "follows the reserved landing" | Recorded abort attempt, if the key is evidence, the initiator, or a grantor behind either | `P:1291-1292`; `R/admission.ts:1740-1764` |
| Landings already completed | No effect | Admins' attention item `evidence-invalidated`; "It does not change main" | `R/admission.ts:1765-1772`; `P:1294-1296` |
| Session or bearer using the key | Invalid | Invalid | `R/requests.ts:188`, `193` |

"Policy can make retirement stricter. It can never make a compromised key's evidence count" (`P:1260-1261`). "An expired delegation does not invalidate evidence admitted while it was valid" (`P:1263-1264`). Evidence is judged against the authority recorded at its admission: "The signer does not need to be authorized today" (`P:1241-1243`; `R/model.ts:162-166`).

### 6.4 Delegations

- A delegation is a grant from one key to another: `{id, grantor, grantee, kinds | "*", acts?, lanes | "*", expiresAt, revoked?}` (`packages/contract/src/roster.ts:48-66`). Its ID is the `delegate` act's entry ID (`R/admission.ts:1783-1786`).
- Made by roster op `delegate`, signed by the grantor key (any active member); ended by `undelegate` (`roster.ts:88-93`, `109-116`). The recovery key cannot sign either (`R/roster.ts:37-38`).
- Never covers `roster`, so a delegated key cannot re-delegate (`authority.ts:186-187`; `P:456-461`). `"*"` is fixed at the grant to the kinds the grantor's role may sign then (`R/admission.ts:1788-1789`).
- The grantee key "need not belong to any member and need not have joined … The act's authority is the grantor's member, limited to the delegation" (`P:427-429`).
- Revoking the grantor's key (either reason) stops every later admission under the delegation (`authority.ts:204-206`). A grantor's member being removed, or its role losing the kind, does the same (`authority.ts:207-213`). `compromised` also marks the delegation row revoked and invalidates evidence admitted under it (`R/model.ts:221-224`; `R/admission.ts:1662`, `1729`).
- Revoking the grantee's key: its own signature is refused first (`authority.ts:178-180`).
- In a room with declared acts, a grant covers a kind only for the binding the grantor signed (`authority.ts:189-196`).

### 6.5 Read sessions (`R/requests.ts`)

- Issued on a signed request (`artroom-request-v1`), with `notAfter` within 300 s of the room clock and a nonce not seen for that key; nonces are stored per key until `notAfter` and deleted after (`requests.ts:60-68`; `P:590-594`).
- Who may get one: case (a), or case (b) with the session's member being the grantor's member (`requests.ts:150-166`). The delegation's kinds and lanes are not consulted for a session.
- At most 3600 s; the room stores only the token's hash, with member, key and delegation (`requests.ts:74`, `168-173`). A client-custody join returns one for 3600 s (`requests.ts:257`).
- At each use it is invalid if: unknown or expired; its key is revoked; its delegation is missing, revoked or expired; the delegation's grantor key is revoked; the member is not active (`requests.ts:181-198`).
- Can: authenticate reads. Cannot: submit acts or workspace requests; "A session token is for reads only" (`P:596-597`). Acts need a signature; workspace requests need a signed request or a bearer.

### 6.6 Bearer tokens

- A bearer token is "the credential of one bearer session: a room-held session key and the delegation the room recorded for it" (`P:633-635`).
- Created at room-custody redemption, all or nothing: the room makes a member key and a session key, admits the `join` on the `room-redemption` path and a `delegate` from the member key to the session key, stores both seeds and the bearer's hash in one transaction (`requests.ts:343-458`). Lifetime: the invitation's `session.ttlSeconds`, default 24 h; lanes `"*"` (`requests.ts:369`, `398`).
- Judged at each use exactly as a read session (`judgeBearer` calls `authenticateHash`), plus the room must hold the session key's seed (`requests.ts:462-487`).
- Can: authenticate reads; submit acts, which the room builds and signs with the session key naming the session's delegation, admitted on the `submitted` path by case (b); request `workspace` and `workspace-token` (`requests.ts:489-524`, `556-569`). The caller gives only `kind`, `target`, `body`, `idempotencyKey` and, for a declared kind, `binding`.
- Cannot: any `roster` act; choose the actor, delegation or admission path; get a result for a retry after the session ended ("there is no envelope to replay") (`P:662-668`, `655-661`, `680-689`).
- "A change of the member's role, or of what the delegation's kinds mean, does not end the session; it is judged when a new act is admitted" (`P:651-654`).

### 6.7 Workspace requests

`workspaceAuthority` (`requests.ts:127-146`): judged "as for an act with step `version` on that lane" (`propose` under the legacy vocabulary), now, under the key and delegation given. Then: the lane exists; on a config-recovery lane only an admin's own key; the authority's member is the lane's current holder (`not-holder`); the request's lease equals the current lease generation (`lease-fenced`). `grant` then checks the lease generation, expiry and readiness again (`G/workspace/workspaces.ts:728-758`). "Each retrieval is judged afresh. A grant retrieved earlier gives no right to a later one" (`P:737-738`).

### 6.8 A checker's authority for a check job

| Step | Fact | Anchor |
|---|---|---|
| Who issues a job | Only the Room, and only over the checker's service binding. "The service binding is the job's authentication … Jobs are not signed, and no signing domain exists for them." | `R/jobs.ts:4`; `P:2760-2770` |
| Trust boundary | "A caller bound to the service is trusted to submit only jobs the Room recorded. The service does not otherwise verify a job's origin." | `P:2771-2776` |
| Service-side checks before any sandbox | Job ID form, room ID form, checker name, lane and generation form, SHAs, flags, obligation ID, config digest, kind and binding (both or neither), input, read URL on the Artifacts host in an accepted namespace, `gitAuthEnv` is exactly one bearer header, deadline not passed. | `packages/checkers/src/job.ts:116-174` |
| The read token | Taken out of `gitAuthEnv` and given to the runner's gateway; "it never enters the runner's environment". | `packages/checkers/src/job.ts:8-10` |
| Who signs the check | The checker service, outside the sandbox, with secret `CHECKER_KEY`. | `packages/checkers/src/signing.ts:1-9`; `P:1589-1590` |
| Under which case | The production Worker signs "as a member's own key (R-ADM-3, case a): it names no delegation". The service type also supports an optional delegation (case b). The protocol text says "as a Worker under a delegation (R-CRED-4, R-EXEC-5)", and the header of `signing.ts` says "delegation key". These differ. | `packages/checkers/src/worker.ts:16-17`; `checker.ts:72-73`; `P:671-672`; `signing.ts:2` |
| How the Room admits the check | Ordinary admission (`judge`), then R-OBL-3: the obligation is a check obligation of that generation; the signer is not the holder or proposer and qualifies; the checker name matches; the check binds an integration the Room prepared (a clean preview's, an active landing's, or the landed one when it names that operation) or a snapshot commit the Room recorded; the config digest is the active configuration's; `volatile` and `runner` match; the input is the integration's tree or the Room's filtered snapshot. | `R/admission.ts:1391-1469` |
| Job state | One row per owner, integration, obligation and configuration: `owed`, `sent` (until its deadline), `done`. "Every change is made only for the attempt it read, so a late answer or a concurrent step never overwrites a newer attempt." | `R/jobs.ts:6-19` |
| Rebinding | Whether an activation replaced the job's binding is "Judged from the Room's own state, never from what the checker service answered". | `R/jobs.ts:374-382` |

---

## 7. Protocol rules to carry

One line each. Anchors are the definition lines in `docs/protocol.md`.

### R-REV

| Rule | Statement | Line |
|---|---|---|
| R-REV-1 | Evidence counts only if it was admitted with qualifying authority, neither its key nor its grantor key was ever revoked as `compromised`, and (under `retiredEvidence: "reopens"`) neither was retired. | 1232 |
| R-REV-2 | After `retired`, new acts are refused; earlier evidence stays valid unless policy says `reopens`. | 1245 |
| R-REV-3 | After `compromised`, the key's evidence and evidence under its delegations stop counting, its delegations are revoked, obligations reopen, and unreserved landings that depend on them go `retryable`. | 1251 |
| R-REV-4 | An expired delegation does not invalidate evidence admitted while it was valid. | 1263 |
| R-REV-5 | A `compromised` revocation behind the reserved landing starts a recorded best-effort abort: stop pushing, revoke the token, record `abort-attempt`; the outcome is decided by reading main and "is never guessed". | 1266 |
| R-REV-6 | A revert lane is an unheld lane the room opens by a `revert-lane` event, scoped to the landed paths, in the admins' queue. | 1285 |
| R-REV-7 | Any other act after reservation, including a `retired` revocation, follows the reserved landing. | 1291 |
| R-REV-8 | A `compromised` key that was evidence for completed landings puts each in the admins' queue; main is not changed. | 1294 |

### R-LAND

| Rule | Statement | Line |
|---|---|---|
| R-LAND-1 | `land` is admitted only for the holder with the current lease, on the latest generation and head, with no landing in flight, review obligations met and land rules passing; the operation is written in the same transaction, before any I/O. | 1057 |
| R-LAND-2 | The operation records lane, generation, head, expectedMain, policyVersion, leaseGeneration, integration, evidence, state, attempts, updatedAt. | 1069 |
| R-LAND-3 | After every await, a step re-reads generation, lease generation, policy version and main, and writes only if they still match. | 1073 |
| R-LAND-4 | Preparation runs in parallel: build the integration, meet checks on it, evaluate land rules on the prospective reservation input and retain its bytes, then `ready`. | 1078 |
| R-LAND-5 | When main moves or a policy activates, `preparing` and `ready` operations go back to `preparing`. | 1097 |
| R-LAND-6 | Before reservation, a new generation, lease change, release, lost authority, invalid evidence, reopened obligation or changed land input sends the operation to `retryable`. | 1103 |
| R-LAND-7 | Reservation is one synchronous transaction and the linearization point: re-validate, take the publication number, hold the slot, record `land-reserved`. | 1116 |
| R-LAND-8 | From reservation the landing is authorized irrevocably; later acts are ordered after it and flagged `after-reservation`; the only exception is a `compromised` revocation. | 1146 |
| R-LAND-9 | Before reservation, a release, new generation, activation, objection or revocation invalidates the operation. | 1161 |
| R-LAND-10 | What lands is the integration commit every check bound, or a commit with an identical tree when a check carried. | 1166 |
| R-LAND-11 | Batching disjoint ready operations is optional and must keep every rule. | 1170 |

### R-PUB

| Rule | Statement | Line |
|---|---|---|
| R-PUB-1 | One publication slot per room; at most one operation in `publishing` or `unresolved`. | 1176 |
| R-PUB-2 | The slot is held until a confirmed `landed` or `aborted`; elapsed time, token expiry and sandbox termination never release it. | 1179 |
| R-PUB-3 | Each push attempt uses a fresh 60 s canonical write token, given only to the publisher sandbox and revoked after; no member ever holds one. | 1184 |
| R-PUB-4 | The push to main uses `--force-with-lease=main:<expectedMain>`. | 1189 |
| R-PUB-5 | Complete forward: on a timeout, unclear answer or restart, push the same commit with the same lease, and read main back before any receipt. | 1192 |
| R-PUB-6 | A reserved publication is never abandoned; release without landing needs confirmed "did not and cannot land", and "No such evidence is established today". | 1206 |
| R-PUB-7 | On restart, the first landing work is resolving the held slot; no reservation until it is free; acts are still admitted. | 1212 |
| R-PUB-8 | Each publication has exactly one `landed` or `aborted` receipt; no later operation reserves while the slot is held. | 1217 |
| R-PUB-9 | A landing that changes `.artroom/policy.json` or `.artroom/checkers/**` is followed at the next seq by `policy-activated`. | 1220 |
| R-PUB-10 | The deployment mints canonical write tokens and pushes main or the log only for the room the registry binds to that repository. | 1224 |

### R-WS

| Rule | Statement | Line |
|---|---|---|
| R-WS-1 | A workspace operation's public view never contains a credential. | 721 |
| R-WS-2 | The write token is returned only by a `workspace-token` request judged now: valid authority, current holder, current lease, operation ready. | 726 |
| R-WS-3 | Each lease generation has its own token, revoked when the lease ends. | 740 |
| R-WS-4 | Workspace, publication, bearer and session tokens never appear in logs, receipts, operation reads, errors, caches or server logs. | 744 |
| R-WS-5 | Over MCP, the `workspace` tool returns the grant only when the operation is ready and R-WS-2 holds. | 754 |

### R-CRED

| Rule | Statement | Line |
|---|---|---|
| R-CRED-1 | Browser: a WebCrypto key joined by a client-custody invitation signs each envelope. | 550 |
| R-CRED-2 | CLI: `artroom login` makes a key file and redeems the invitation; the CLI signs. | 555 |
| R-CRED-3 | MCP: the room makes and keeps the member key and a session key, records the join and a delegation, and returns a bearer token once; revoking the delegation or member key ends the session. | 558 |
| R-CRED-4 | Worker: holds a delegate key that never joins and signs under a delegation chosen by `as`. | 573 |
| R-CRED-5 | Workspace, workspace-token and session requests are signed, unrecorded, and judged at each request. | 579 |
| R-CRED-6 | A request carries a nonce and a `notAfter` within 300 s; a replayed nonce is refused. | 590 |
| R-CRED-7 | A session token is for reads only, lasts at most one hour, and stops when its key or delegation is revoked. | 596 |
| R-CRED-8 | A workspace token is a write token for the lane's fork only, expires no later than the lease, and is revoked on release, expiry or take-over. | 599 |
| R-CRED-9 | `redeem` needs no prior credential; a refused redemption records nothing and does not consume the invitation; it is rate-limited. | 606 |
| R-CRED-10 | A bearer token is judged the same way for reads, acts and requests; the room signs its acts with the session key under the session's delegation; never `roster`. | 633 |
| R-CRED-11 | An invitation link carries the invitation ID and secret only in the URL fragment. | 691 |

### R-EXEC

| Rule | Statement | Line |
|---|---|---|
| R-EXEC-1 | Two kinds of sandbox, publisher and check runner; they share nothing. | 1571 |
| R-EXEC-2 | The publisher runs git only, hooks off, nothing from the repository executes, and holds a canonical write token only during one push. | 1574 |
| R-EXEC-3 | A check runner gets a read-only token for `readUrl` only, never a write token or signing key. | 1580 |
| R-EXEC-4 | The runner checks that `HEAD` equals the job's integration before running anything. | 1585 |
| R-EXEC-5 | The checker service signs the check outside the sandbox; sandbox output is data, at most 16 KiB. | 1589 |
| R-EXEC-6 | The runner wrapper takes argument arrays, never a shell string. | 1592 |
| R-EXEC-7 | A filtered snapshot runs in a workspace with no canonical remote, token or unfiltered objects. | 1595 |
| R-EXEC-8 | Only the Room issues jobs, only over a service binding; the binding is the job's authentication; jobs are not signed. | 2760 |
| R-EXEC-9 | A job's git credential is exactly three variables; the token is read-only, for one repository, and expires by the deadline. | 2783 |
| R-EXEC-10 | A job carries `base`, `volatile`, `advisory` and `runner` from its configuration; a check's `volatile` must match. | 2798 |
| R-EXEC-11 | The service measures its runner environment's digest and refuses when it differs from a pinned one. | 2681 |

### R-IDEM

| Rule | Statement | Line |
|---|---|---|
| R-IDEM-1 | An idempotency key is scoped to the signing key. | 521 |
| R-IDEM-2 | An exact retry of an accepted act or recorded refusal returns the original result and creates no entry, even after the key is revoked. | 524 |
| R-IDEM-3 | Same key, different bytes: refused `idempotency-mismatch`, nothing recorded. | 529 |
| R-IDEM-4 | An unrecorded refusal leaves no idempotency record; a retry is judged afresh. | 533 |
| R-IDEM-5 | Idempotency records last as long as the room. | 536 |
| R-IDEM-6 | After `timeout` or `unavailable`, clients retry with the same idempotency key. | 538 |

### R-SEC

| Rule | Statement | Line |
|---|---|---|
| R-SEC-1 | Before an act is recorded, every string in its body is scanned by format detectors and an entropy check. | 1601 |
| R-SEC-2 | A detected secret refuses the act, unrecorded; the body is kept nowhere. | 1608 |
| R-SEC-3 | The refusal names the field path and detector, never the secret. | 1613 |
| R-SEC-4 | Fixed-format fields skip only the entropy check; a `join`'s secret is exempt. | 1616 |
| R-SEC-5 | Workspace, publication, bearer and session tokens, `gitAuthEnv` and private keys are never recorded or published. | 1622 |
| R-SEC-6 | Detection is incomplete; a missed secret is permanent in the log and must be rotated. | 1626 |

Related family the caller did not list but the token facts depend on: R-MINT-1 to R-MINT-7 (`P:3492-3625`), summarized in section 4.2.

---

## 8. Evidence invalidation and races already decided

| Race | Rule decided | Anchor |
|---|---|---|
| Any act versus a reservation | Reservation is the only linearization point. An act admitted before it invalidates the operation (the next step or the reservation's own re-validation sees it); an act admitted after it cannot cancel it. | `P:1116-1164`; `G/landing/core.ts:11`, `594-599` |
| Marking the order | Every act decided while the slot is held gets flag `after-reservation`, and its receipt names the reserved operation in `after`. Read at decide time and again at commit. | `R/admission.ts:669-670`, `1830`, `1848` |
| `retired` revocation, before reservation | No immediate landing effect. The reservation transaction re-judges the initiator's authority and each piece of evidence now, so a retired initiator (or grantor) gives `authority-lost`; retired evidence gives `evidence-invalid` only under `reopens`. | `R/core.ts:1126-1127`, `1142-1150`; `R/obligations.ts:133` |
| `retired` revocation, after reservation | Follows the reserved landing; no effect on it. | `P:1154`, `1291-1292` |
| `compromised` revocation, before reservation | In the revocation's own apply step: every operation in `accepted`, `preparing` or `ready` whose evidence includes an invalidated act, or whose lane has a blocking obligation reopened, goes `retryable` `evidence-invalid`. | `R/admission.ts:1731-1739` |
| `compromised` revocation, after reservation | In the revocation's own apply step: if the held operation is `publishing` or `unresolved` and the key is among {each evidence act's key and grantor, the land initiator's key, the initiator's grantor}, `landing.abort(act, key, seq)` is recorded and the abort step is scheduled. | `R/admission.ts:1740-1764` |
| Abort versus a push in flight | The abort is carried out "at once, even while a push is in flight … not behind the engine's queue". `beginPush` returns null once an abort exists. An abort that arrives while the token is being minted stops that attempt before the push starts. | `R/core.ts:2095-2096`; `G/landing/engine.ts:375-380`, `409-415`; `G/landing/core.ts:718` |
| Abort versus the push landing | Read-back decides, in this order: main equals the integration → `landed` plus a revert lane; else abort present and every attempt "not applied" → `aborted`; else `unresolved`, slot held. | `G/landing/core.ts:824-847`, `889-897`; `P:1274-1283` |
| `compromised` revocation, after landing | Admins' attention item; main unchanged. | `R/admission.ts:1765-1772`; `P:1294-1296` |
| Revocation versus an act being admitted | Authority is judged at step 4 and again at the final boundary inside the write transaction; a changed authority restarts the decision. | `R/admission.ts:327-347`; `P:463-467` |
| Revocation versus an exact retry | Idempotency (step 3) is before authority (step 4): the original result is returned. A bearer session differs: the token is judged before any envelope is built, so a retry after the session ended gets nothing. | `P:382-383`, `524-527`, `680-689`; `R/requests.ts:462-471` |
| Revocation versus evidence already admitted | Evidence is re-judged at every obligation computation by current key state (`invalidity`), against the authority recorded at its admission. | `R/obligations.ts:127-139`; `P:1241-1243` |
| Stale asynchronous answers | A readiness answer is applied only for the latest evaluation revision and the same attempt and integration; an integration result only for the same attempt. | `G/landing/core.ts:460-464`, `545-549` |
| Lease change versus workspace provisioning | The lease is read again after every await; a token for an ended or changed lease is owed revocation; a later lease's row is never touched by an earlier lease's result. | `G/workspace/workspaces.ts:454-511`, `517-522` |
| Token state versus push outcome | "A revocation answer or a token's expiry is never evidence about a push (R-PUB-2)." | `P:3572-3573` |

Test names recorded for these: "the push is paused: a release, a new generation, an objecting review and a retired revocation …" (R-LAND-8, R-REV-7); three endings for a paused push with a `compromised` revocation (`N/2026-10-01-laneB-git.md:53-54`).

---

## 9. Things I could not determine

1. Whether Artifacts supports `--atomic` multi-ref pushes in the sense a new design would need. The only statement is one line in the plan note from an earlier harness (`N/2026-10-01-artroom-plan.md:111-112`), with no method. The current code never uses it.
2. Whether a push whose reply is lost on Artifacts itself can have applied. The lost-reply cases were captured against a local server; "We did not run a live lost-response test against Artifacts" (`N/2026-10-01-spike-sandbox-git.md:315-316`).
3. When Artifacts checks a token relative to applying a ref update. The note says it cannot observe this (`N/2026-10-01-laneB-token-inflight.md:104-106`).
4. What happens to a request already forwarded upstream when the gateway route is replaced or the container is destroyed. Not stated in `container.ts` or `ref-fence.ts`.
5. Whether the git process in the container stops when the 120 s exec deadline aborts, and whether a push it started can still complete. The code aborts the exec signal (`container.ts:82-106`); the effect on the process is not stated.
6. How the text of R-PUB-6 ("No such evidence is established today", `P:1206-1210`) is reconciled with the code path that reaches `aborted` from `error`/`rejected` outcomes (`G/landing/core.ts:828-831`, `875-878`; `push-outcome.ts:100-103`). Both are present; no amendment to R-PUB-6 was found by search. The in-flight note also says a 403 after sending is not treated as proof (it classifies as `unknown`).
7. Whether an attempt whose outcome was left null by a restart is ever given an outcome. No code path was found, which would mean an aborted publication cannot reach `aborted` after a crash during a push (section 1.6). I did not read the tests to confirm.
8. Every caller of `refreshMain` / `observeMain` in the Room. I confirmed only the reconcile path, which reads main when it is still unknown. So how the room learns of a main moved by another writer while the slot is free was not established.
9. The checker's authority case in production. `worker.ts` says case (a), a member's own key; the protocol and the header of `signing.ts` say a delegation. I did not find which a deployed room uses, or how the checker key becomes a member.
10. Whether a gateway fence refusal (403 from the gateway) is covered by a test that asserts its push classification. My statement in section 3.3 is an inference.
11. The lifetime of the token that comes with a created snapshot repository. `repos.ts` does not state it (the fork and canonical creation tokens are stated as 24 hours).
12. The contents of `notes/2026-10-02-canonical-mint-ownership.md`, which `mints.ts` and the protocol cite as the design note for the mint ledger. Not read.
13. `G/landing/core.ts` behavior under two Room objects for one repository beyond what R-PUB-10 and the registry binding check state (`R/core.ts:2090-2092`). The test "two rooms that both believe they hold the slot" exists by name only in the note; I did not read it.
14. The parts of `G/workspace/workspaces.ts` after line 800 (canonical founding incarnations) and of `G/workspace/fork-tokens.ts` beyond its header and doc comments were read only in outline.

---

## 10. Facts read on 2026-10-05 for revision 14

Read-only. Nothing was built, run or changed. These are facts about
another source than sections 1 to 9: the I1 scope substrate, in the
worktree `~/play/artroom-worktrees/i1-scope-substrate` at the fixed
commit `a3e5a77e`, and four sibling notes at the commits named. Each
was read in place by the commit, and no file of the shared checkout
was read. Path prefixes for this section only:

- `C/` = `packages/contract/src/`
- `D/` = `packages/derive/src/`
- `S/` = `packages/scope/src/`
- `B/` = `packages/bytes/src/`

### 10.1 The I1 source at `a3e5a77e`

| Fact | Anchor |
|---|---|
| A scope kind is one of seven: `directory`, `membership`, `rules`, `destination`, `inbox`, `task`, `lane`. There is no `register`. | `C/scope.ts:16`; `B/ids.ts:14` |
| A platform definition's name is one of six, with a version. There is no `platform:register`. | `C/scope.ts:34`; `B/ids.ts:52-53` |
| `ScopeFilter` and `FreshnessProof` are typed `unknown`, each with the comment "Defined by the authority note." | `C/scope.ts:60-64` |
| An entry's input has seven types: `genesis`, `act`, `delivery`, `diagnosis`, `timed`, `outcome`, `checkpoint`. There is no `preparation`. An outcome's `evidence` is typed `unknown`. | `C/entry.ts:29-49` |
| The production ports: the authority port answers that no grant is current; the readers port lets nobody read; the definitions port answers `unsupported-definition` for a name that begins `platform:`; there is no transport. | `S/ports.ts:99-112` |
| The act judge takes the first presented grant that is current, names the signing key, lists the act's action, and whose `within` is this scope and incarnation; otherwise the act is refused `unauthorized`. It reads neither `issued` nor `fresh`. | `D/judge.ts:147-153` |
| A founding makes a directory: the seed has `creator: null`, kind `directory` and ordinal 0, and the intent has kind `found` and `to: null`. A genesis has no signer. | `D/genesis.ts:65-70`, `101-102`, `115-116` |
| A seed's cause is one of three kinds, by the source entry's input: an act, a delivery, or a genesis. | `D/genesis.ts:28-38` |
| A definition has exactly nine top-level members. `name` is not one of them. | `D/validate.ts:179`; `C/definition.ts:10-20` |
| The only capability that the validator accepts is `hold` at version 1. Any other is refused. | `D/validate.ts:195-201` |
| There are fifteen guard forms, six effect forms and four send forms. | `D/validate.ts:94-95`, `576` |
| A field type has thirteen shapes. None is a record. A `fact` type's `kind` is one text. | `D/validate.ts:96-98`, `226-229` |
| A handler has seven members, no primary item and no declared fields, and it opens no item. A `tell` needs a slot of the primary item, so a handler cannot send one. | `D/validate.ts:591`, `698`, `707-708` |
| A timed rule has five members: `on`, `states`, `deadline`, `effects` and `attention`. It has no sends. | `D/validate.ts:720`; `C/definition.ts:29-35` |
| A send's ordinal is its place in the written list, after `first`. An `index` send goes to the scope's creator. There is no fan-out form. | `D/sends.ts:56-57`, `77-81` |
| The proposed bounds: 12 item types, 48 act kinds, 24 handlers, 8 value slots, 3 `also`, 8 sends of one act, 64 foreign entries and 32 sends of one entry, and 256 bytes for a handle. | `C/bounds.ts:56-91` |
| The deltas note has 157 choices, numbered 1 to 157 with none missing. Counted by a script: 167 numbered table rows, of which 10 are repair rows that repeat a number. | `notes/2026-10-04-i1-contract-deltas.md` |

### 10.2 The sibling notes

| Fact | Anchor |
|---|---|
| The scope contract's revision 11 counts 34 sends for the change lane's entry that records `published`: the `unpin` at ordinal 32 and the platform's result at ordinal 33. | `notes/2026-10-04-scope-and-replay-contract.md` at `996c3e58`, lines 6742-6743 and section 7.5 |
| Its section 11.9 has 8 rows whose third cell begins "Must change", each owned by I1. Counted by a script. | The same file, section 11.9 |
| Its `PlatformDefinition` type has seven names, with `register`, and its `DeclaredDefinition` has a `name` member. | The same file, section 6.1 |
| The lane forms' revision 14 counts 35 sends and 33 requests with a result for the same entry, and 34 "in the 34 of the contract and of F23". | `notes/2026-10-04-lane-forms-and-browser-flow.md` at `4b3bf5da`, lines 3907-3914 |
| The proof plan's revision 9, row F23, states both counts: 34 by the texts then in force, and 35 by the lane forms' revision 13, with 33 results under either. | `notes/2026-10-04-proof-and-test-economy.md` at `85be9f0b`, line 408 |
| The demo contract's revision 4 founds by import in its step 1, and records the destination as "default branch at the imported commit". Its step 8 has each concern report "an exact commit and tree". | `notes/2026-10-04-demo-contract-and-retarget-inventory.md` at `3b6e1ad7`, lines 140-153 and 267 |
| In the contract's companion file, a `report` item has `commit` and `tree` as fixed, required values. | `notes/2026-10-04-scope-and-replay-contract/lane-instantiations.md` at `996c3e58`, section 3, "Items" |

### 10.3 What this section does not establish

Each row is a reading of text. None is a run, and none shows what a
deployed scope does. The recovery design at `dafb5b0c` was read by a
delegated reader only, so no fact of it is listed here. The lines of
the sibling notes are those of the files as each commit holds them.

### 10.4 Facts read on 2026-10-05 for revision 15

Read in place by the commit, and nothing was run. The first row
replaces the first row of section 10.2 as the contract's present
count. That row stays true of revision 11.

| Fact | Anchor |
|---|---|
| The scope contract's revision 12, as amended before its review, counts 35 sends for the change lane's entry that records `published`: the fan-out at ordinals 0 to 31, the `unpin` at 32, the index row at 33 and the platform's result at 34. When the lane staged the manifest itself it counts 34, with the result at 33. It says that revisions 8 to 11 counted 34. | `notes/2026-10-04-scope-and-replay-contract.md` at `53f0e183`, section 7.5, "The entry that R2 counts fits"; decision D12-5 |
| The same revision gives the genesis input a member `kind`, the genesis act of the pinned definition, and says of a platform definition that "This contract lists none of those: point R1-48". | The same file, section 4.1 |
| Its point R1-49 recommends "Nothing is added, and section 6.8 stands", and names the authority note's successor as the owner. | The same file, section 13 |
| Its section 6.11 says of a result that was obtained with a scripted capability: "It proves nothing about a real hold, a Git read, a pin, a license or a provider." | The same file, section 6.11, "A scripted capability is a stand-in" |
| Both `take-hold` rows of its companion file have the one capability effect `{ hold: { do: "open", extent: { field: "extent" } } }`, and its note N5 says of the task scope's reference and the instance: "Not slots. They are records of the hold capability, which R3 lists." | `notes/2026-10-04-scope-and-replay-contract/lane-instantiations.md` at `53f0e183`, note N5 and the rows `take-hold` of `issue` and `change` |
| The I2 delivery note counts 65 forms in its plan: 19 ran on I1, 38 are implemented by I2, 5 wait for I3 and 3 are undecided. It says that the capability forms are read and not derived, and that the records and operations of `hold@1` "are I3's". | `notes/2026-10-05-i2-delivery.md` at `744f2447`, section 3 |
