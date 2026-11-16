# C4: the general `now`

This note records how C4 builds one submit for a returned draft and for an MCP
request that a scope refused. The rules are in section 6 of
[the act environment note](../2026-11-14-act-environment.md): one submit, the
value `now`, the list arms and the three reasons of a held intention. This note
states how the code meets them, what the first run found, and what stays open.
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

1. Copy `slot` and `now` before the first `await` (`readDraftNow`).
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
5. Run `actExplore` on the candidate. A refusal `revision-moved` writes the
   genuine form 1 return and ends the call.
6. Write one batch (`adoptionBatch`): the adopted `expected`, `capture` and
   `namedRefs`, and no return marker.
7. Retain and sign the same candidate.

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

`now` appears on every refused act result. If the fresh read does not hold the
item the act is on, the result carries `lacks: "on"` and no `now`.

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

## Open

These points rest on guesses made while composing. The planner has not ruled on
them.

1. A form 1 return answers `{ ok: false, stop: "state", committed: key }`.
2. Step 7 signs after the fence releases. A second tab can see the adopted
   row for a moment before the custody record exists.
3. `actExplore` runs inside the fence.
4. An ill-shaped `now` stops with `shape` before the `taken` check would apply.
5. From the `now` lane: the description of `settle`, `lacks` naming only `on`,
   the `UnavailableActSource` fallback, and a `via` subject that reads `absent`.
6. Notes that mention `RequestView` were not edited.
