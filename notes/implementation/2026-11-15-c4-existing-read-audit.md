# C4: existing reads and the Replica adapter

Planner ruling `13bbb17712dc1e56b93250fc9869945d71562f34` chooses the checked Replica alone as C4's production adapter. It supersedes the first audit's Pinboard Page proposal below. C4 does not bind or change `dap-ui-sdk`. The constructor port remains the single seam, with one adapter and no new scope read. A matching real member session, the checked Replica, and the pinned declaration supply its context. Authority stays null. The adapter supplies no foreign fact or observation. A reached need for either returns the existing lacks.

The shared body checks the expected basis before authority. A determinate moved observed basis returns the draft with `now` before signing. An unchanged basis remains unavailable and continues to Native. Unavailable exploration returns no draft and stops no submit. The second `expectedKeys` reader is unnecessary. C4 adds one order pin in the existing judge owner in its later implementation head.

This note records source findings, not an implemented adapter or a validation result. The source audit binds `4458f746`; the later C4 source act must bind the actual worktree and source correspondence. The historical Page proposal remains below to preserve the audit and its source limits, but it creates no current Page obligation. The required suite stays in this repository.

Source audit against parent-bound `4458f746`. The intended tracked path is `notes/implementation/2026-11-15-c4-existing-read-audit.md` in `.builder-worktrees/c4-e4b-source-20261115`. Root created that private worktree at `4e45`; this external draft does not assert a commit or build there. The current E4 APIs correspond to the earlier `6b5f8d8683d36283eb84b275c4b14153db67e9b6` plan. This report applies the full ruling `162112975db5f37903d466117682e3c9dae68899`. No application reader, draft adapter, or test ran.

The existing judge can report a moved observed basis without a present grant. The first audit proposed a Pinboard edit to demonstrate that ordering. Ruling 13bbb177 instead requires the real session and Replica witness in this repository. Neither route offers a new way to prove admission or current authority.

## Four inputs

Paths without an absolute prefix refer to source at `4458f746`.

| Input | Existing member-key read and limit | What that read establishes |
| --- | --- | --- |
| Present grants (`JudgeContext.grants`, `Presented`) | **None** through the current `ScopeApi` or session API. A session can read membership summary or journal. Those are not a `Presented` result for this act. | `Grant` includes the issued fact, subject, key, principal, actions, scope filter, expiry, and freshness proof (`packages/contract/src/scope.ts:94–104`). `Presented.current` means the commit decided current standing from its reading (`packages/derive/src/judge.ts:40–57`). A role, action string, read session, or historical entry grant cannot stand in for this input. Missing acquisition stays `grants:null`, not `[]`. |
| Owners producer code (`Owners`) | **None** through `ScopeApi`. This is executable code supplied by the runtime, not a retained digest or a summary row. | `packages/derive/src/ledger.ts:177–215` defines `rules`, optional `reserves`, and full `reservations`. A loaded, reviewed producer can be supplied locally. An unloaded producer is unknown. The reader may state checked absence only for a declaration and actual captured state whose operation and pending-reservation needs it has checked. |
| Foreign fact bytes | Existing `ScopeHandle.entry(seq, minimum)` through an authorized scope reader, or `followReceipt` for its exact fact. A member can use the matching own-key session where the source scope permits that read. There is no access guarantee for an arbitrary foreign scope. | `entry` checks the read minimum, not the entry hash (`packages/client/src/handle.ts:148–150`). `followReceipt` checks scope, sequence, genesis, and recomputed entry hash (`229–251`). A reader must retain canonical checked entry bytes for the exact fact and apply the existing fact checks. An inaccessible, archived, partial, or mismatched read remains unavailable. A complete local declaration with no named foreign facts needs no foreign read. |
| Current observation reading | **None** through the current public `ScopeApi` or session API as the observation input that the judge consumes. | Summary, item, projection, and journal reads do not by themselves create a fresh `ObservationUse` with the required subject, source incarnation, read, reuse, window, and value evidence. An old entry can retain historical observations. That does not make them current inputs for a different act. The production authority reader uses the separate inter-scope `Membership.observe` port (`packages/scope/src/authority.ts:50–56,98–108,137–155`), not a Client endpoint. |

`ScopeApi` in `packages/contract/src/transport.ts` exposes create, submit, prepare, settle, summary, items, queryItems, applicationProjection, history, entry, outbox, log, and retained reads. No endpoint acquires Owners or current authority. This audit proposes none.

The normal HTTP transport bounds one complete reply at 4 MiB and 30 seconds (`packages/client/src/http.ts:38–54,65–82`). A caller may use lower bounds. Item queries and application projections also use their contract payload caps and at most 10 seconds (`packages/client/src/http.ts:65–67`, `packages/client/src/handle.ts:115–142`). These are per-request bounds, not a total journal-read budget. A whole Replica acquisition still needs its maintained journal loop and exact fixed-cut checks. `ScopeHandle.log` checks canonical bytes, hash, scope, definition, sequence, and increasing page order. Only a gapless session read receives whole coverage (`packages/client/src/handle.ts:152–196`). A summary alone is not a checked Replica state.

Session acquisition uses the existing own-key signed read-session request. `Reads.session` checks key and full membership identity, joins the current request, and refreshes before expiry (`packages/client/src/reads.ts:96–132`). Its request lasts 60 seconds. `requestSession` bounds the response at 16 KiB and normally 30 seconds, and checks full requested membership and key (`packages/client/src/session.ts:83–129`). This signs read authentication, not an ACT. `Reads.read` can fall back to a signed read after an unavailable or refused session (`packages/client/src/reads.ts:238–251`), so a C4 reader that requires whole journal coverage must explicitly use the matching session and verify whole coverage. It cannot assume that every `Reads.read` result used a session.

## Act-by-act needs

“None” in the last three columns describes these authored act bodies. It is not permission to substitute empty evidence for an arbitrary definition or state. A checked reader must also reject an unsupported captured declaration or unknown pending producer requirement.

| Application act | Present grant | Owners producer | Foreign fact bytes | Observation reading |
| --- | --- | --- | --- | --- |
| Pinboard `establish` | `pinboard.write` in creation handling | None | None | None |
| Pinboard `add` | `pinboard.write` | None | None | None |
| Pinboard `edit` | `pinboard.write` | None | None | None |
| Pinboard `move` | `pinboard.write` | None | None | None |
| Pinboard `resize` | `pinboard.write` | None | None | None |
| Pinboard `delete` | `pinboard.write` | None | None | None |
| Map `open-map` | `map.open` in creation handling | None | None | None |
| Map `add-place` | `map.place` | None | None | None |
| Map `edit-place` | `map.place` | None | None | None |
| Map `remove-place` | `map.place` | None | None | None |
| Map `moderate-place` | `map.moderate` | None | None | None |
| Map `comment` | `map.comment` | None | None | None |
| Map `delete-comment` | `map.comment` | None | None | None |
| Map `moderate-comment` | `map.moderate` | None | None | None |
| Map `retitle` | `map.admin` | None | None | None |
| Lending `reserve` | `lending.member` | None for this body | None | None |
| Lending `release` | `lending.member` | None for this body | None | None |
| Lending `release-by-staff` | `lending.staff` | None for this body | None | None |

Pinboard source is `dap-ui-sdk/application/definition.ts:47–109,111–156`. Every act has empty `also` and sends. The definition has no capabilities, receives, timers, or custom rules. Edits and deletion also check the actual signer-author relation. Add reads the signer for its author effect. Those checks need the real grant if judgment reaches them.

Map source is `dap-foldkit/definition/map.ts:65–145,147–168`. Every act has empty `also` and sends. The definition has no capabilities, receives, timers, or custom rules. `comment` names a local `place` item field but declares no `also`, so it does not expect the place's revision (`1–8,115–124`). Do not add a place revision check to this act. Genesis acts remain outside the ordinary `actExplore` route.

Lending source is `examples/lending/definition.ts:20–27,74–98`. `reserve` reads local held reservations, tool and day, and counts the current signer's held reservation. Release reads the reservation's state and holder. Staff release reads its state. The lapse timer can make body judgment return due before these checks. The reservation acts send no operation, but Lending circulation acts do publish to a destination (`35–70`); this table does not establish producer absence for all Lending acts or pending state.

The external Pinboard and Map files are source observations outside this repository's immutable commit. No bundled artifact or runtime correspondence follows from reading them. Bind the actual application source and checked installed declaration before implementation or validation.

## MCP gets UI actions, not a present grant object

`McpService` obtains the application room membership, asks `Reads.session`, checks the session's key and membership, and reads the membership summary. `standingIn` maps that key's active member and role to action strings (`packages/mcp/src/service.ts:307–318`, `packages/mcp/src/inventory.ts:100–110`). The declared-view result names these strings `grants`. They are display and action availability input, not `Presented[]` or `Grant[]` with freshness proof.

The actual act path sends `[]` as caller grants (`packages/mcp/src/service.ts:857–861`, also `1318`). The scope obtains authority itself. `repositoryAuthority` reads the membership that the scope's judged creation or state records, and explicitly ignores grants presented beside the intent (`packages/scope/src/authority.ts:509–556`). Core reads standing and facts, then constructs the actual judgment readings (`packages/scope/src/core.ts:675–753`). MCP does not currently acquire this server-side authority result for client exploration. A C4 adapter must not relabel `standing.actions` as current authority.

## The existing body can report movement before authority

`judgeActBody` enters the shared body without an early null-grant refusal (`packages/derive/src/judge.ts:226–249`). The body reads and checks the fields and named facts first (`330–369`). It then resolves the subjects, calls `expectedKeys`, rejects aliases, and compares each captured basis with the actual item revision (`371–400`). Only afterward does it reach the grant check. At check 9, `grants:null` returns `authority-unavailable` (`426–446`).

For a well-shaped Pinboard `edit` with an actual local note and a stale observed `on` basis, the existing body can therefore return `revision-moved` even though no present grant was acquired. `actExplore` preserves that refusal and its bound act (`packages/client/src/act-explore.ts:75–104`). This is a determinate local basis answer, not an admission judgment. A missing foreign input, due transition, missing item, or earlier opaque input can prevent that answer. No claim follows that every stale act returns the same reason.

No second `expectedKeys` reader is needed for this named local route. If later source shows an earlier unavailable dependency blocking a required observed-basis return, ruling 162 permits a second reader against Replica rows. That reader needs its own explicit source review and note statement. It must not silently broaden this result into arbitrary basis comparison or authority evaluation.

## Historical application adapter proposal, superseded by 13bbb177

This section records the original source proposal under 16211297. Its proposed Page integration and root choice are withdrawn. The four-input audit, read limits, and body-order findings remain current.

Use **Pinboard's edit-note Page** as the first bounded application. Its real browser connection already signs a session request for the joined member and checks the returned key and member (`dap-ui-sdk/src/client/bootstrap.ts:182–214`). It supplies that reader to `ScopeHandle` (`src/client/submissions.ts:76–81`). The transport uses a two-second request bound. Its current refresh reads a complete summary (`157–180`), and its submission implementation uses retained requests rather than ScopeClient. It does not already run the new Replica bridge. This is an integration obligation, not an existing working adapter claim.

The proposed reader uses that existing matching session and transport for the checked declared handle and complete Replica journal. Replica keeps its checked pinned definition, state, Own, clock, bounds, and exact head. The reader supports only the checked Pinboard declaration and captured acts listed above. It checks that no captured pending operation or reservation requires an unknown Owners producer, then states checked producer absence. It returns `grants:null`, because no current-grant read exists. For these actual local bodies it supplies the checked empty set of required foreign facts and observations, rather than claiming to have acquired arbitrary absent data. If any declaration, state, field, or producer need falls outside that checked support, it returns the existing lacks.

This requires a **partial honest context**, not an early all-or-nothing rejection merely because grants are null. `JudgeContext` expressly permits null authority; `ExplorationContext.owners` must still be explicit (`packages/client/src/act-context.ts:9–15`, `packages/client/src/act-explore.ts:40`). The constructor port's existing ready-input arm can carry that null value. An absent reader still returns unavailable. No reader invents Owners absence to enter the body.

In the in-memory suite, a real member-key session and actual checked Replica must read a recorded note, capture its observed basis, receive a later genuine edit, and run the bridge on the captured edit. The named Page must use that same reader and obtain the determinate moved-basis answer. No predicted state, scripted grant object, or summary-only fake Replica proves the route. These are future validation requirements, not results.

On submit, only a determinate movement of an **observed** basis returns the draft. Unavailable exploration returns no draft and stops no submit. Native judges every other case. This supersedes the older plan's wording that refused or unavailable exploration blocks permission. Preserve the same ownership precondition in E4 preview and builder, including the last check after awaited inputs. A taken draft writes nothing. Recheck the exact captured Replica cut after acquisition and do not silently rebase it.

The original design choice was whether to name this deliberately partial Pinboard reader as the first production adapter. Ruling 13bbb177 resolves that choice in favor of Replica alone. A fully admitted preflight with current grant authority remains unavailable through today's public reads. That broader acquisition needs a separate design disposition before E2 or E3 starts.

## Lending's pending state does not imply destination Owners code

The reservation-body table above does not by itself settle pending-state accounting. Lending's circulation acts can leave a local request pending while the destination performs publication. The two scopes hold different work.

1. `publishes` emits a `tell` to the library's recorded destination. Donate, borrow, return, cancel, and publish use it (`examples/lending/definition.ts:35–70`). The maintained JSON has empty capabilities and receives, the authored `shelf-page` rule, and the reservation lapse timer (`examples/lending/definition.json:253,362–374`). None of these forms opens a local outside operation or capability record.
2. The send executor emits `{class:"request", type:"tell"}` (`packages/derive/src/sends.ts:269–271`). The fold retains that request in the **Lending** state (`packages/derive/src/fold.ts:279–283`). A later result fills its result, and a diagnosis records its finding (`245–265`). This request is not a local operation. `packages/derive/src/fold.ts:172–176` creates operations only for actual operation effects.
3. `MemoryState.outstanding` counts local unanswered requests separately from local operation outcomes (`packages/derive/src/state.ts:551–565`). A pending publish-file request does not insert the destination's publication operation into Lending's `outcomes` list. The actual outside operation and its producer code belong to the destination that receives the request.
4. `reserved` counts timers and pending item work from the checked definition and state, including the held reservation's lapse duty (`packages/derive/src/reserve.ts:146–167`). It counts outstanding requests and diagnoses separately (`172–185`). These terms require no destination Owners code. For legacy Lending, the request term uses the declaration's clause count. For a whole-scope definition, it uses the originating reservation retained with the actual pending request; this is a distinct branch, not an inferred upgrade of Lending.
5. Owners code becomes relevant for local pending operation outcomes (`packages/derive/src/reserve.ts:186–196`) and capability-owned record reservations (`200–202`). `packages/derive/src/ledger.ts:209–215` requires a full producer Amount when the whole-scope branch needs one. A non-null list of local outcomes or capability records cannot become zero merely because this reader did not load its owner.

Thus an actual checked Lending state containing held reservation timers and outstanding remote publication requests can still have checked **absence of local Owners producers**. “Pending” alone does not require a destination producer. The inference rests on the pinned Lending declaration, the real captured state's operation and record inventory, and the actual fold. It does not rest on the currently selected reservation act having no sends.

This distinction also matters after an admitted exploration: `ActProjection.project` calls `reserved` on the whole resulting view (`packages/client/src/act-projection.ts:131–139,196–198`). A general reader cannot inspect only the new body's sends and set `owners:null` for arbitrary existing work. If the actual captured state contains an unsupported local outcome or producer-owned record, the adapter preserves unknown Owners and the existing lacks. It must not fabricate a producer or declare checked null. C4's null-authority path normally stops before this admitted projection, but that order does not authorize a false context inventory.

This source audit does not assert that any particular live Lending scope has an empty operation or record inventory. The future in-memory witness must use its real captured state. No operator read or installed-state probe ran.

## Current adapter and repository witness under 13bbb177

The production adapter receives the constructor's fixed actor, scope, definition, head, and captured act. The matching member session authenticates the existing checked journal reads. Replica owns the pinned definition, actual state, Own, clock, and bounds. The adapter supplies a partial honest context: `grants:null`, no foreign facts, and no observations. Checked producer absence requires the actual declaration and state analysis above. Unknown Owners stays unknown. An absent reader returns unavailable with its lacks.

The one adapter does not fetch a current grant, call a new endpoint, load arbitrary foreign evidence, expose StateView, or supply another evaluator. Its one constructor seam serves memory and browser storage. After awaited acquisition, the existing final cut and draft-ownership checks still apply. The same taken precondition runs before either E4 phase can commit.

Use the repository's **Lending `release`** declaration (`examples/lending/definition.ts:88–91`) for the proposed suite. It has an observed primary reservation and no foreign field, send, or operation. The fixture must place its real clock before the held reservation's `until`, so an actual lapse does not substitute for the basis question. The grant remains genuinely unread in exploration. Native obtains its ordinary authority during the real submit.

The suite must demonstrate all three current requirements through a real in-memory scope, matching member session, and checked Replica:

- Capture a release draft at an observed reservation basis, record a genuine later reservation change, and let the bridge return the moved draft with the actual `now` before any signature. A real holder release may leave the item final; the body checks the moved revision before final-state and grant checks. No forged row or predicted state proves this route.
- In a separate valid unchanged-basis arrangement, exploration returns unavailable for missing authority, the same draft continues through ordinary submit, and the scope records the genuine release. Do not reuse a terminal reservation from the movement arrangement or weaken the holder and state checks.
- Run the same ownership and outcome contract through the memory and browser store forms. Browser storage remains subject to the separately owned E4-B persistence and shared-fence implementation. No browser result follows from this source plan.

The judge-owner pin must hold the definition, view, and ordinary body constant while showing the stale expected basis returns `revision-moved` with null grants and the unchanged basis reaches `authority-unavailable`. It pins shared-body order, not a copied comparison algorithm. Exact fixture and assertion source remain for the later reviewed implementation.

Ruling 13bbb177 withdraws the named Page criterion because no Page in this repository uses ScopeClient and Pinboard lives elsewhere. C4 neither edits nor binds that external application. The missing present-grant read remains a separate E2 and E3 design question. No local admitted exploration, current-grant answer, or runtime proof is inherited from this audit.
