# C4: the general `now`

This note records how C4 builds one submit for a returned draft and for an MCP
request that a scope refused. The rules are in section 6 of
[the act environment note](../2026-11-14-act-environment.md): one submit, the
value `now`, the list arms and the three reasons of a held intention. This note
states how the code meets them, what the first run found, and how the planner settled the open points.
The planner's ruling a6f98773 ("Apply them") and the rulings 6d3b979f and
77a253b9 govern it.

## The value

`now` is the basis one view renders. It holds the draft's key, the act kind,
the slot address, the head of the render, the primary's ref and one selection
per subject. A subject is `present` with its ref, or `absent` when no item is
selected at the render cut. An absent subject adds no key to `expected`.

Both return forms compute `now` at the view. A stored return keeps its basis and
its cause and nothing else. The view reads the kept draft and the rows of its
checked cut, and computes the movement and `now` from them. One stored shape
carries two causes: an exploration refusal (form 1) and a kept refused request
(form 2). Neither cause stores a movement.

A view that cannot render a subject gives no `now` and names the subject. A
page can then tell the member which row is missing. The submit stops with
`state`. Edit, clear and dismiss still work, and `now` appears when the replica
holds the row.

## The submit

The member passes the `now` that the view showed. The call checks and acts in
this order. Each step ends the call before the next.

1. Check the form of `slot` and `now` and copy them before the first `await`
   (`readDraftNow`). An ill-shaped `now` stops with `shape` here, before `taken`.
2. Under custody's fence, read the raw batch and the key's occurrence. The
   existing priorities (`taken`, `state`) apply first.
3. Decide whether the draft is returned, and recompute the view
   (`draftNowOf`) over the rows this call holds. `checkDraftNow` first stops
   with `state` when a returned draft's view lacks a subject. It then compares
   presence and identity: key, kind, address, subject keys and primary. A fault
   stops with `shape`.
4. Build the candidate from the stored act and the passed `now`
   (`composeDraftCandidate`). The call never takes `Explore.result.act`, which
   can autofill an omitted key.
5. Run `actExplore` on the candidate, outside the fence. Then take the fence
   again and read the batch again. The stored draft must equal the draft that
   step 2 read. A difference stops with `state`, signs nothing and writes
   nothing. A refusal `revision-moved` writes the genuine form 1 return and ends
   the call.
6. Write one batch (`adoptionBatch`): the adopted `expected`, `capture` and
   `namedRefs`, and no return marker.
7. Retain and sign the same candidate.

A call decides on what it read under the fence. A submit reads two times, around
its exploration: the exploration reader can wait for the network, and no call
waits for the network inside the fence. A replica head that moved during the
exploration is no difference. The scope judges the act.

A scope can still refuse after step 5 passes, because a row can move between the
client's exploration and the scope's judgment. The draft then returns with a new
`now`, and the member submits once more. The client never retries. One race costs
one submit.

## MCP

An MCP server keeps no draft store. A refused request stays in custody, and each
refused result computes a `now` from a fresh read: `act` and `settle` return the
same shape. The shape holds `of` (the refused request's key), the target, the
kind, the primary's item and revision, `at` (the revisions the read binds) and the
head. The server stores none of it.

`act` with `after` and `now` submits the returned request. Both appear together,
`at` is absent, and the call uses a new key. The call signs the `at` of `now`
unchanged. A bare `act` stays a fresh act with its own key. The checks run before
`signedIntent` and stop with `shape` through the existing `Unshaped` path.

`now` appears on every refused act result when the fresh read holds the
revision of every subject of the act. Otherwise the result carries `lacks`,
which names the subject, and no `now`.

## Limit

A host that drops tool output gives the model no `now`. The model still holds
the `shape` error of a call that lacks it, and it can send a fresh act. That act
signs the current revisions, as every bare act does. This limit stays: the
server cannot recover a `now` that the host dropped, because the server stores
none.

## Readers of the stored movement

The stored `movement` field is gone from `StoredDraftReturn`. These readers
changed or remain:

- `draft-store.ts`: type, decoder and validator now carry no movement. The
  validator keeps one rule: a transition's returned capture holds a ref to the
  primary.
- `draft-project-types.ts` and `draft-project.ts`: both return forms compute
  `now` and the derived movement at the view.
- `replica-explore.ts` and `replica.ts`: the exploration still produces a
  `DraftMovement`. No stored shape keeps it. The `ScopeClient` lane decides
  whether to keep the producer.
- Tests: `draft-store.test.ts`, `draft-edit.test.ts` and `draft-project.test.ts`
  drop the stored movement. `c4-replica-explore.test.ts` still checks the
  producer.

## What the first run found

The change was written before any of it ran. The first compile and run found
these defects. Each repair is in this head.

- **An idle wait never drained.** Each publication scheduled a custody fold, and
  the scheduler added a work item even when no held record could fold. So
  `clientIdle` found new work after every pass and spun on microtasks. Every
  test that waits for an idle client hung. `#scheduleFold` in `scope-client.ts`
  now schedules only when a held record is not complete and the replica holds
  its accepted entry: the same condition the fold loop acts on.
- **A fixture scope ID did not decode.** `sc_` followed by 52 `b` characters is
  not base32 for 32 bytes, so the stored occurrence failed its reader. Three
  test fixtures now use 51 `b` characters and a final `a`, as older tests do.
- **Tests submitted before the view showed the draft.** `edit` schedules its
  publication. Four tests now wait for an idle client between the edit and the
  submit.
- **A generated case could end with no accepted submit.** When a seed moved the
  row in all 8 rounds, the oracle had no accepted round. The last round now moves
  nothing.
- **A gated test deadlocked.** The publication now reads the draft batch on
  every pass, so a draft gate armed before `request` blocked the request's own
  first read. The test now arms the gate after the dispatch write starts.
- **A standalone test counted a background read.** The test now stops counting
  custody reads after the method's one batch write, and it declares its seeded
  standalone signing to the signing audit.
- **The E1 answer oracle moved.** The new `judgeActBody` case shifted the task
  positions in `judge.test.ts`, an E1 oracle owner. The case now lives in
  `packages/derive/test/judge-act-body.test.ts`, and `judge.test.ts` equals main.
- Twenty-two type errors, all in tests except an unused import and one list
  entry cast in `draft-project.ts`.

## Rulings

The planner settled the six points of the first run in ruling 09041476.

1. **Form 1 return.** A return by an exploration answers
   `{ ok: false, stop: "state", committed: key }`. A page has one path for each
   stop: it shows the view, and the view holds the reason and `now`.
   `committed` names a draft that the call changed. The doc comment of
   `DraftStop` in `scope-client.ts` says so. No page under `docs` documents the
   draft stops, so no page changed.
2. **Step 7 signs after the fence.** Both views are valid: a draft on the
   adopted basis, then the request. A stop between step 6 and step 7 leaves an
   adopted draft with its key, and the next submit signs once. A second client
   that submits the same key in that moment meets custody, which admits one
   signing. Two cases in `c4-draft-now.test.ts` pin both.
3. **`actExplore` and the fence.** The ruling asks this note to state that
   `exploreReplica` makes no call to the scope and waits for no read. The source
   does not support that sentence. `Replica.#explore` awaits `binding.read`
   (`replica.ts` line 260), which is the `exploration` reader that the caller
   passes to `scopeClient` (`scope-client.ts` line 168). A reader can wait for
   the network, for example to issue a read session. `actExplore` itself is
   synchronous. Ruling 29b355c5 moves the wait outside the fence. A slow or lost
   answer would otherwise hold every member call of every client that shares
   the store. Custody keeps the same rule for a delivery
   (`packages/client/src/custody.ts`, `#dispatch`). Of the two forms that the
   ruling allows, the submit takes two fenced sections with the exploration
   between them. The first section runs steps 2 to 4. The second reads the batch
   again and requires the same stored draft in the same slot, then writes the
   form 1 return or the adoption. Step 7 signs outside the fence. This changes less than the other form, which composes the candidate
   from an unfenced read and compares it afterwards: the first section stays the
   code that it was. Three cases in `c4-draft-now.test.ts` pin the wait: other
   calls (`edit`, `discard` and a submit of another slot) complete while the
   reader waits, a changed draft stops with `state`, and
   an unchanged draft signs once.
4. **Order of checks.** The call checks the form of its inputs before its first
   wait: `slot`, the patch, and `now`. An ill-shaped `now` is a fault of the
   caller, and no state of the store changes that. The order is then `taken`,
   `state`, and a missing or foreign `now`. A `shape` stop comes before any
   signature. A test pins an ill-shaped `now` on a taken slot.
5. **The `now` lane.**
   - The `settle` description says that a refused result carries `now` and
     that `act` takes it with `after`. `docs/mcp.md` and `docs/mcp-tools.json`
     hold the same text.
   - An `act` reads the target lane once more after a refusal only for
     `revision-moved` and `bad-intent`, whose basis is stale by definition
     (ruling 892d1abf). A guard refusal is judged on rows that did not move,
     so its result carries no `now` and costs no read. `settle` reads a basis
     for a refused record of any reason.
   - One rule serves both adapters (`lackedSubject` in `expected.ts`). A
     result carries `now` only when the read holds the revision of every
     subject of the act. Otherwise `lacks` names the subject: `on` for the
     primary, or the name of an `also` subject. The MCP result no longer names
     only `on`.
   - An unavailable symbolic source maps to no one subject. The view says
     `lacks` with a null subject, as `DraftStateStop` allows. A page then says
     that the client lacks a row that the act reads.
   - `absent` means that the selection is empty in the rows that the cut holds.
     A `via` subject whose slot names a row that the cut does not hold is
     `lacks`. As `absent` it would add no key to `expected`, and the member would
     sign with no basis for a row that exists. When a subject is absent at the
     signing and selected at the judgment, `judgeActBody` counts the keys of
     `expected` against the subjects it binds (`packages/derive/src/judge.ts`
     lines 392 to 395). The count differs, so the scope refuses `bad-intent`
     ("expected has one key for each of: ..."), not `revision-moved`. The
     scope refuses, so no act records without the basis. The member then sees
     `bad-intent` for what is a race. This is a known wording limit, and the
     planner carries it in the E5 request.
6. **D12.** `notes/2026-11-13-scope-client.md` stays as written. The act
   environment note lists each change to D12 in section 15. Its row for D12
   section 9 now says that `requests` holds three arms, each with `is`. No
   page under `docs` names `RequestView`.
