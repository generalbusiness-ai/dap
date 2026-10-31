# Head outcome recovery after two stopped S1 attempts

Status: proposed. Design only; implementation requires a separate request.

Both S1 scratch rooms remain stopped. The retained journals each show one head attempt with an unknown outcome. Neither public record identifies a provider failure. A later successful fold rules out the earlier observer wrapper failure as an explanation for the persisted unknown, but it does not locate the host failure.

This design selects a fixed-key original-response recovery reader, preceded by the bounded diagnostic of each exact original operation. Recovery acquires only a proven existing original reply and hands its unchanged answer to trusted Operations. No such head-reply store or reader exists in the inspected implementation. Either current attempt may therefore return answer-unavailable. A new attempt remains a separate policy boundary, not this reader's fallback. This note grants no execution or implementation approval.

## Authority and scope

Request `f0bdea6f41a90f6f9bbca459a4a27c270485460e` asks for data and design. Ruling `f15b9b44c018b1e345b3efe558fcee29d26bffb0` requires comparison of both retained attempts. It moves the start condition to after the J4 successor packet. The actual public V12 binding is `4aae8e9ea3c5ab2b708400945d031ae0b17f5aea75e6a4646b31b7d578b0e3aa`. Promise `bdf11579925ae3f045796a3bfab3a8b045b25c2e` covers this design only.

The ruling prohibits a third room, replacement, resend, Check and Continue. No room, lane, hold, original, sent mark or unknown outcome changes. Whole-S1 landing and live witnesses still wait. This note grants no recovery call, provider probe, token operation or implementation permission. Later implementation and execution need their own request and disposition.

The packet retains the four full canonical public records in `canonical/`. Their inherited stale annotations remain unchanged. The current promise rests on the request and effective ruling. The stale flags do not supply a different authority or a new operational permission.

## What both records establish

The two diagnostics used local S1 Source `52571fc2798bacd831acd600adbd2ff74dfd8751`, tree `4c3d96d0a6ca22568e25125cb7a4bf7a7e4aea66`. That is the observer checkpoint, not proof of deployed Worker bytes. Each diagnostic returned complete metadata from one actual lane fold.

| Observation | First scratch room | Second scratch room |
|---|---|---|
| Diagnostic label | `scratch-fork-state-diagnostic-1` | `r2-fork-state-diagnostic-1` |
| Closed collector receipt | `abe09912fcfec8900533fee4f36dcb66f96dad6382e85893606cd6317eeda17a` | `573aceb15300da3a3ea947edc9b76a9399a53f93358cca546861a0aa0c291150` |
| Diagnostic exit | Command 0, capture 0 | Command 0, capture 0 |
| Folded entries | 9 | 9 |
| Fork record | Creating, not selected | Creating, not selected |
| Fork-named operation | Owner matches, kind head, standing unknown | Owner matches, kind head, standing unknown |
| Recorded head attempt | One attempt, one unknown outcome | Bound 1, actual attempt 1, one unknown outcome |
| Fork outcomes | None | None |
| Readiness evidence | Seed commit absent; candidate base present; rules item present; readiness conjunction false | The narrower diagnostic did not evaluate the seed/candidate/rules conjunction |
| Read observations | 14 requests, 112,408 response bytes, all bodies complete | 12 requests, 103,446 response bytes, all bodies complete |
| Summary denials | Two 403 summaries | Two 403 summaries |

The diagnostic exits mean metadata collection completed. They do not mean fork-ready passed. The first fork-ready capture failed at Source `9b5e9a380c6cee5a7210f43b0b67105bd038aff1`. The second failed at `52571fc...`. The complete retained captures preserve their actual command, receipt, streams and Source statements. This packet does not relabel them.

R2 additionally reports `namedByCurrentFork:true` and `forSelectedHold:false`. The second comparison does not prove that the operation belongs to another hold. No fork is selected. Neither existing projection fully proves the original accepted hold-to-opening association. The next diagnostic must establish that association from immutable entries rather than infer it from the current fork record.

### The first observer defect does not explain the head result

The first `scratch-fork-ready-actual-phase-diagnostic-1` returned `lane-journal-unavailable`. Its allowlist omitted the retained-definition GET that the maintained inventory path needs. The retained record-diagnostic plan names that omission. Its old trace therefore cannot establish that the original unwrapped phase never tried to read the log.

After the allowlist correction, `scratch-fork-record-diagnostic-1` obtained nine entries. The later fork-state diagnostic folded them and found the unknown head result. R2 also retrieved the definition and completed its nine-entry fold. These observations separate a known observer defect from the unresolved head cause. They do not prove the provider worked, the host failed, or every observer predicate was correct.

## Source and deployment are different evidence

The local public Source inspection used Main `c8c7b63172175576116f86ed4f7facfcdd749ec2`, tree `540f57099bc8e5835b4f1c9423b387b65a1a2edf`. `source-pins.json` compares eleven named files against Git Source `5dc9765fdc6fb6896b736127801944c46ee288f9`.

Eight files match exactly. Three differ: `operations.ts` adds Destination 16 to an application-publication selector; `object.ts` adds Membership 9 to invitation proof selection; `worker.ts` adds Rules 14 to application host selection. The inspected head dispatch, answer, recovery and hold rules keep their earlier meaning. The bounded Git patch is retained as Source evidence, not a deployment attestation.

Planner survey `61039acc8582e4790155b9b158341dc75f85c250` reports health versions `7f21be0b`, `c18b5dde` and `c203d530` on the three Workers, all at Source `5dc9765f`. It reports that BO1 at Main c8 has not deployed. This is a planner report of health observations. It is not independent proof that every deployed byte equals a checkout, nor proof of which implementation ran the original provider request. No health, Native or provider request ran for this design.

## Why unknown does not identify the cause

`WorkspaceHost.send` checks the immutable request, lineage and held state before the head branch calls `ArtifactsProvider.ref`. It catches exceptions and returns null. A failed check can also return null. The operations driver writes unknown when it receives no answer in time, receives null or an invalid answer, or cannot admit a decisive answer. Those paths collapse different causes into the same journal result.

A genuine original promise can return late. `Operations.#answer` retains that callback in memory after a timeout and offers its valid answer through normal judgment. The callback is not a resend. Its lifetime does not prove that it survives eviction or process loss.

`HOLD_ATTEMPTS.head` is 1. The generic ledger cannot open attempt 2 beyond that declared bound, even though the owner's retry predicate returns true. A recorded unknown closes the ordinary sending row. `WorkspaceHost` supplies no head recovery reader or durable head replies queue. Its `late` hook delegates token handling, not a durable head response archive. The generic marked-work recovery path alone therefore cannot resurrect these already-unknown head attempts.

Possible explanations remain distinct:

- The host rejected the request or could not resolve authenticated lineage before any provider reference read.
- The provider binding, repository metadata, temporary token, Git transport or reference parser failed.
- The request exceeded its dispatch window, and the original callback later disappeared or could not record its answer.
- The host received an answer but failed to preserve or admit it.
- An observer selected, decoded or associated the wrong record. The successful folds reduce some observer uncertainties but do not prove the original-operation association.

Two unknown outcomes make investigation necessary. Two occurrences do not establish a statistical rate or identify a shared cause.

## Temporary READ-token custody stays unknown

`ArtifactsProvider.#read` authenticates the reported remote, creates a READ token, validates it, reads Git and attempts revocation in `finally`. The revocation catch deliberately does not claim success. Some failures occur before that `try` begins. No workspace credential phase in S1 proves that this internal temporary credential did not exist.

The public journals do not show whether token creation ran, whether the returned token was usable, whether Git answered, or whether revocation confirmed. Expiry remains the service's reported expiry. Unknown does not establish expiry enforcement, absence or cleanup. A fresh `ref()` call would itself create and revoke another token, so it is a provider operation rather than an inert diagnostic.

This design neither reads credential custody nor proposes automatic cleanup. If retained administrative metadata can later distinguish these stages, a separate reviewed extraction must expose only fixed stage/confirmation metadata and its exact attempt correlation. It must not mint, revoke, look up a current reference, print a token or hash plaintext. If the original call retained no such metadata, later inspection cannot recreate it.

## First proposal: one authenticated journal per original operation

This is a diagnostic specification, not an executable packet or a command release. A later reviewed program treats the two rooms as two independent inputs and outputs. Each invocation reads exactly one target lane journal. It uses existing owner read authority through a maintained capability; it accepts no arbitrary home, file, SQL, provider URL or raw-body path.

For each room, the diagnostic needs the existing public identity bindings and a separately released maintained owner capability. It must bind the following facts:

1. The full lane ScopeRef, including original kind and incarnation, and the authenticated journal frame/head.
2. The accepted hold FactRef, including its full scope, sequence and hash. Derive the actual hold epoch from that entry and the pinned rules. Refuse an absent, ambiguous or mismatched open effect rather than assuming an epoch from the public projection.
3. Exactly one corresponding `hold@2` head opening in the immutable effects, with its actual opening sequence and ordinal. Compute its operation ID with the maintained operation-ID function.
4. Attempt 1 of that exact operation, its opening entry and every actual recorded outcome in order. Verify the outcome owner/kind, operation and attempt against the immutable opening.
5. The later current record only as a cross-check. A fork-named operation alone cannot supply the original association.

Missing, archived, ambiguous or mismatched evidence returns a fixed not-established classification and stops. It must not substitute the latest fork, use another room or infer success from an empty projection. There is no second journal read, polling loop, Check, Continue or provider access.

The fixed output includes source/input pins, same-scope/incarnation/origin booleans, actual opening ordinal and attempt counts, finite operation standing, finite outcome result/basis labels, entry positions, retained-reference presence/binding booleans, and whether a genuine late outcome is already recorded. It emits no arbitrary stored string, outcome evidence body, provider name, original envelope, credential or exception. Source and input digests bind public inputs only. It never hashes a bearer or arbitrary private body for publication.

A journal read can report a late outcome that the native driver already admitted. The observer cannot create that outcome. If a trusted native metadata surface already exposes a durable send/receipt relation, a later design may add fixed booleans to this projection. No new endpoint or SQL reader is assumed here.

Use the existing diagnostic's finite ceilings unless a separate review changes them: 16 journal pages, 512 entries, 48 admitted HTTP requests, 64 classified attempts, 4 MiB per response, 64 MiB aggregate responses and 65,536 chunks per response. Limit the target journal to the one frame being authenticated. Summary, definition and session reads needed for that authority remain distinct support reads. An unexpected route or exceeded bound stays latched through SDK error handling.

The existing 30-second per-request and 120-second network abort deadlines are advisory when a transport ignores abort. A separate collector owns a 180-second command deadline followed by bounded termination and reap. These are not a guaranteed whole-wall ceiling or physical drain proof. A normal read session can issue/renew and local proof retention can write; “no Native action” does not mean zero credential, local or background effects. Actual future costs and closure need their own receipts.

## Selected contract: recover one proven original reply

Choice A is the selected design. Its reader retrieves existing original-response custody for one fixed head-operation key. It never queries a current provider reference. The diagnostic can conclude answer-unavailable; that is a complete and honest result, not a failed attempt that permits a new lookup.

The reported `5dc9765f` Source has no durable head-reply store and no such reader. This contract does not create missing custody retroactively or establish that either current attempt is recoverable. A genuine in-memory callback might already have admitted a late answer. In that case the journal observer reports that entry and the reader makes no lookup or offer.

### Fixed request and trust boundary

The following proposed types describe a service contract only. They add no contract export, public tool or deployed endpoint. `ScopeRef`, `FactRef` and `Digest` keep their existing closed meanings.

```ts
type OriginalHeadReadInput = {
  v: 1;
  scope: ScopeRef;
  acceptedHold: { fact: FactRef; item: number };
  opening: { fact: FactRef; ordinal: number };
  attempt: 1;
  provider: {
    host: "artifacts";
    namespace: string;
    repository: string;
    ref: string;
    originalRequestBinding: Digest;
  };
};
```

Only those keys are accepted. There is no caller-supplied result, evidence, basis, response, body, provider credential, file path or replay permission. In particular, an operator cannot label data `own-answer`. The input identifies an expected target; it does not authenticate that target by assertion.

A trusted host reader derives the actual key from the authenticated original opening and its original host request binding. It compares every input field with that derived key. The opening FactRef must name the same complete lane ScopeRef, including kind and incarnation. The ordinal must name the actual `hold@2` head operation in that entry, and the accepted hold must be the one that opened it. Attempt 1 must already exist with a genuine sent mark. Another hold, opening, incarnation, ordinal or provider reference refuses before lookup.

The epoch comes from the accepted entry's actual hold-open effect and replayed item, not from a hardcoded diagnostic claim or caller field. `derive/src/hold.ts:68` currently emits `epoch:1` for open. The workspace owner also requires epoch 1 for eligibility. The reader must verify those actual effects and refuse an absent, ambiguous or mismatched epoch. The existing public projections do not independently expose the accepted entry's epoch value.

The provider binding contains only original nonsecret request metadata. Its digest must exclude credentials and private response bodies. The reader must verify the repository/reference association from retained authenticated request provenance; matching caller text or a provider request ID alone is insufficient. If that association was never retained, the result is provenance-unproven. No new repository discovery or provider call can fill the gap.

Trust rests on the host's authenticated original-response provenance. The native judge cannot independently prove that a host answer came from the provider. Replay must retain that same trusted-host qualification. A new host record can supply proof of an already received original response only if it preserves the original correlation; it cannot turn a later observation into that response.

### One acquisition and one logical handoff

The fixed key comprises the full lane reference, accepted hold FactRef/item, opening FactRef/ordinal, owner `hold@2`, kind `head`, attempt 1, exact original provider reference and verified request binding. The service accepts no wildcard or enumeration. It has no provider transport, mint, revoke, send, polling or current-ref dependency.

A future trusted service must durably serialize acquisition for that key. Before acquisition or logical handoff it records the corresponding once marker. A missing store, unsupported schema or incomplete mark refuses without native effect. The acquisition has these finite transitions:

1. Authenticate and collect the original target journal once. Paging within the declared 16-page/512-entry bound remains one collection. Do not refresh its head or start a second collection to get a preferred result.
2. If that collection already proves a decisive outcome, report already-recorded or outcome-conflict as appropriate. Do not look up a reply or offer anything.
3. Exclusively claim the key's lookup marker. Retrieve at most one existing reply row through the reader's fixed local custody index. Do not search files, list replies, follow a caller path or call the provider.
4. Verify the row's original request/response association and bounded head response shape. An absent, incomplete, unproven, unknown-only or mismatched row records a terminal local classification and causes no native effect. Do not create an unknown outcome merely because the lookup failed.
5. For a proven decisive original response, durably cache the exact canonical answer and claim the logical handoff marker. Only the trusted host/Operations boundary constructs the `own-answer` evidence and hands that answer to the existing native machinery. The key has one acquisition and one logical handoff. The operator receives metadata only.
6. Preserve the actual native result and its immutable entry reference before acknowledging native settlement. An acknowledgement of acquisition or handoff alone never claims native settlement. Neither kind of acknowledgement deletes the original response or rewrites the old unknown.

The ordinary judge still verifies operation/attempt existence, owner/kind, sent provenance, evidence shape, the pinned owner's rules, retained prerequisites and current authority/eligibility. It may refuse or return unavailable. A proven original response is not permission to select a fork, revive a hold or bypass native checks. If the hold has ended, ordinary derivation may record a failed fork instead of opening new work. A confirmed null head can derive no-head failure. Report what the actual judgment does.

Acquisition and native handling have different bounds. This reader performs at most one existing-original-reply lookup and one logical handoff for its exact key. Existing `Operations.answered` may keep an unavailable genuine answer and reoffer it on later native wakes. Preserve that behavior. Do not add a one-shot judgment seam or claim exactly one native offer. Native handling still permits at most the existing admissible late decisive outcome; exact repeats cannot add another entry.

### Duplicate, interruption and acknowledgement rules

A duplicate reader request reads only the key's durable acquisition/handoff status and cached answer metadata. It neither repeats the original reply lookup nor commissions another logical recovery. It cannot alter the cached answer. Existing trusted Operations machinery alone may retry that exact genuine answer. The native ledger's `recordedOutcome` treats an exact decisive result/evidence copy as repeat and returns its existing entry. A conflicting decisive answer writes nothing. The operator cannot resolve a conflict by changing evidence, ordinal or key.

Acquired means the trusted service durably verified and cached the original response. Handed-off means it durably bound that same answer to the Operations path. Neither means recorded. A native result of recorded or exact repeat permits a settlement acknowledgement only after the trusted boundary binds its entry to this operation, attempt and exact canonical answer. A refusal or conflict keeps its actual classification. Unavailable can leave the answer in the existing native pending queue. That is ordinary handling of the same cached answer, not a fresh acquisition, provider read or resend.

A crash after an acquisition marker but before a durable result leaves lookup-unknown. Do not repeat the original-row lookup. A crash around logical handoff leaves native handling uncertain until the trusted machinery or a separately authorized journal collection establishes the actual result. A future host archive may restore its already-acquired exact cached answer to the existing retained-replies path after restart. That is resume of the same logical handoff, not permission to reread an original index, replace a response, query a provider or create a new operation. The archive/adapter needed for that durability is not present in the inspected workspace host and needs separate filing/review.

A journal observer can acknowledge an already-recorded result only when the trusted boundary verifies the complete operation/attempt and canonical result/evidence association. It cannot infer success from standing, a provider ID, a current ref or marker presence. An unproven handoff stays handoff-unknown. The old unknown and original custody stay intact.

The service's markers are bookkeeping for no-repeat acquisition, not native authority or proof of delivery. Source-only data retention cannot prove that an original promise or reply survived eviction. A restart never clears sent marks, rewrites history, changes the answer, creates another key for the same attempt or replenishes an acquisition budget. Ordinary native reoffers remain subject to the existing per-pass bounds and lifetime behavior. Their total count and closure need actual observations; this design invents no global offer-count or physical-drain guarantee.

### Literal output and refusal vocabulary

The trusted service returns a bounded metadata projection. It never returns the reply body or a plaintext/body hash. The following closed union is the proposed output schema:

```ts
type OriginalHeadReadOutput = {
  v: 1;
  status:
    | "already-recorded" | "answer-unavailable" | "provenance-unproven"
    | "recorded" | "repeat" | "outcome-conflict" | "native-refused"
    | "native-pending" | "lookup-unknown" | "handoff-unknown" | "refused";
  error:
    | null | "bad-input" | "unauthorized" | "journal-unavailable"
    | "journal-incomplete" | "binding-mismatch" | "epoch-mismatch"
    | "sent-proof-unavailable" | "reply-store-unavailable"
    | "reply-absent" | "reply-unproven" | "reply-invalid"
    | "bound-exceeded" | "native-refused" | "native-unavailable"
    | "conflicting-outcome" | "step-indeterminate";
  originalBound: boolean;
  acceptedEpoch: number | null;
  attempt: 1;
  lookupCount: 0 | 1;
  handoffCount: 0 | 1;
  observedNativeOffers: number | null;
  unknownHistoryPreserved: true | null;
  nativeEntry: FactRef | null;
  acknowledgement:
    | "none" | "acquired" | "handed-off" | "native-settled" | "indeterminate";
};
```

All fields are mandatory. `nativeEntry` is non-null only for an authenticated existing or recorded native entry; it is never a fabricated receipt. A lookup can return answer-unavailable/reply-absent with lookup/handoff counts 1/0. An unproven row returns provenance-unproven/reply-unproven with lookup/handoff counts 1/0. A malformed or unauthorized target returns refused with lookup/handoff counts 0/0. No classification claims that absence of a reply proves no original provider action. Duplicate reader results reuse durable counts rather than increment them. `observedNativeOffers` is null unless actual native metadata establishes a count. A handoff does not default that field to 1.

Bounds are explicit: one full key; attempt exactly 1; one existing-original-row lookup and at most one logical handoff over that key's lifetime; 8 KiB canonical input; 512 UTF-8 bytes each for namespace/repository; 1,024 bytes for the original ref; fixed digest forms; safe nonnegative item/ordinal integers; a 4 KiB projected response; and at most 8 KiB of bounded original head-reply/correlation metadata from one trusted row. Unknown or overbound shapes refuse. Any sensitive retained original stays under host custody and never enters public output.

The authenticated journal collection retains the diagnostic's finite page, entry, network and process bounds above. The proposed reader allows at most 5 seconds to await its single local original-row lookup and at most 5 seconds to await the first handoff result, each also capped by the remaining 120-second invocation abort deadline. These await deadlines leave lookup-unknown or handoff-unknown when completion is uncertain. They cannot stop synchronous storage or native work that ignores cancellation; the separate 180-second process deadline and bounded cleanup remain the outer ownership limit, not a guaranteed total wall ceiling. Timeout permits no new acquisition or provider call. The existing native turn can report unavailable and retain the cached answer for its ordinary reoffer path. A completed operator process does not prove that native background work or an original in-memory callback has drained. No public output supplies a universal response-time or recovery guarantee.

### Selected policy and the separate new-attempt boundary

This contract selects original-response recovery only. It can produce answer-unavailable for both current rooms. No durable original head response archive exists in the inspected `5dc` implementation, and the public records establish no alternative original-response custody. The design therefore does not claim the two attempts can recover now.

Choice B below records a separate policy boundary. It is not a fallback of this reader, an available command, a selected retry plan or an implementation instruction. If no original response survives, only a separately authorized design for new work could observe a current reference. This packet does not choose its version, budget, migration or authority.

## Selected recovery and the separate policy boundary

| Choice | Truth it can record | Required evidence and authority | Compatibility and restart consequence |
|---|---|---|---|
| Recover the original answer | A second outcome of the same original operation and attempt, following its unknown | A retained authenticated response bound to the full opening/original request, exact provider reference, request identity and ordinal | Existing late-own-answer ledger semantics can remain unchanged if the response is genuinely original. A host service must retain and replay the exact answer through ordinary judgment. |
| Declare a new attempt | A new observation of a provider reference at a new time | An explicit attempt budget, ordinal, intent, provider request provenance and authorized selection policy | Existing `hold@2` operation has bound 1. A new version and an explicit migration/authority disposition must define any new operation. Old outcomes and old replay remain unchanged. |

### Why the selected reader requires original-response proof

Matching repository, branch and commit is insufficient. A branch is mutable. A fresh read of the same reference proves only what that new request observed. It cannot acquire `own-answer` provenance for attempt 1 merely because an operator, host or recovery port labels it so.

The admissible identity includes the lane incarnation, authenticated opening FactRef and ordinal, operation owner/kind, attempt number, original immutable request/provider reference and a retained response or provider request identifier that proves the response belongs to that request. The actual responder and response authenticity need a stated trust basis. The public projection can expose binding booleans and nonsecret metadata, while private custody keeps any sensitive material. A provider ID without a retained association is not proof.

The current kernel permits at most one late decisive outcome after the unknown, and requires `own-answer`. A current read with basis `read` cannot follow it. Recovering a genuine retained answer needs no new provider request or resubmission of the original mutation. A future host service could use the existing durable-replies hook, keyed by full scope/operation/attempt, even after the ordinary sending row closes. It must handle eviction, exact duplicate delivery and durable acknowledgement without clearing the sent mark. The host must not rely only on an in-memory promise.

The old unknown remains an entry. Replay verifies the subsequent late answer against the original operation and preserves its trusted host provenance. A genuine late response may still fail eligibility or produce a failed fork if the hold has ended. It does not promise a selected fork or revive expired authority. A refusal settles only what the owner's existing rules actually derive. No wall-clock inference supplies an outcome.

There is no public evidence that such an original response archive exists for either room. This choice is conditional, not an available recovery action. Calling a fresh provider read “declared recovery” would change the contract and needs the same explicit semantic review as Choice B.

### Choice B is separate and must declare new work

If original-response proof is absent, a newly commissioned reference read needs its own declared operation/attempt and timing. Its request must carry the exact selected lane/hold/instance and provider-reference provenance. Its authority must hold when the new work is admitted. No automatic new room, hold renewal, selection or token grant follows.

Increasing `HOLD_ATTEMPTS.head` in place would change `hold@2` history, reserved closure and replay. Reject that shortcut. A later request must choose a compatible new capability version and define the transition for these existing pinned lanes, or explicitly decide that no migration is permitted. It must not silently activate a new definition on them. The old operation keeps its recorded bound of 1 even if a later definition activates. Any authorized new opening must keep that old operation, its owner and its outcomes intact. If the filing rules do not permit the proposed part, the planner must resolve that before implementation.

A bounded retry policy needs a finite ordinal and decreasing budget, an admitted opening before dispatch, one durable possible-send mark per attempt, no fresh attempt after an unknown without that explicit authorization, and a limit on duplicate or late results. The journal keeps the original unknown forever. A new successful observation cannot settle it. Selection must bind the new observation and existing immutable destination/hold lineage, with a rule for conflicts with a genuine older late answer. The design must reserve the full closure and keep cleanup separate from success.

This packet intentionally does not choose that version, migration or retry count. No evidence here justifies one extra attempt rather than another policy. Those choices require the separate implementation request and planner ruling.

## What further evidence could decide

| Evidence, if it already exists | What it can distinguish | What it cannot establish |
|---|---|---|
| Exact-original journal projection for both rooms | Correct association, ordinal, recorded unknown and any already-admitted late outcome | Which host/provider stage ran, private token custody or a response that never reached the journal |
| Existing correlated host stage/dispatch metadata | Pre-provider rejection versus dispatch, timeout versus explicit host failure, answer-received versus answer-admitted | Provider execution without a correlated provider record; complete absence from missing logs |
| Existing provider request/response metadata linked to that original request | Whether provider work and a response actually occurred for that request | That a current reference value was the old response; native admission or revocation unless separately confirmed |
| Existing revocation acknowledgement for the exact temporary credential | That specific cleanup confirmation under its stated provider trust | Token absence merely from TTL or no workspace phase |
| Exact deployed artifact plus original invocation correlation | Which host/adapter implementation governed the attempt | The runtime path taken or a callback's survival |

Read-only metadata extraction still needs its own reviewed channel and public projection. This design does not authorize opening private logs or account custody. It also does not assume those logs exist. If the host lost an in-memory response, no provider request identity survives, or the provider never recorded a historical reply, the exact cause can remain unknowable. A new probe cannot repair that evidentiary gap.

## Selected design and kernel filing

Adopt the fixed-key original-response reader design, conditional on a separately filed host archive/adapter and verified provenance. First use the diagnostic design to establish the exact original association and whether a late result already exists. The reader must report answer-unavailable or provenance-unproven when existing custody cannot supply the original reply. It cannot make either current room recoverable by design alone. A new observation requires Choice B's separate policy, authority and migration decision. Both rooms remain stopped. The evidence identifies neither provider failure nor host failure.

This packet adds no kernel code, export, scope kind, capability name/form, tool family or record model. It closes no K item and claims no gate. `docs/kernel.md` section 7 governs later implementation review. The proposed reader and any required host archive/adapter need a separate implementation filing. They can belong to host services because they supply provenance through existing rules. Ordinary Operations acquisition/handoff recovery must preserve its existing reoffer semantics. The metadata observer can remain operator tooling. Neither service nor observer can change the meaning of an outcome.

Any change to late-answer admissibility, attempt budgets, reservations, owner dispatch or replay belongs in the shared kernel review. A host cannot unilaterally reinterpret `own-answer` or settle unknown from a current read. A new version of the existing capability still needs an explicit compatibility and filing disposition. A new record model or form would also trigger section 7.1's waiting rule unless the planner names a satisfied K-item condition. No such addition or exemption is assumed here.

Root can adopt this reviewed note later on an appropriate clean Main. Adoption must preserve the actual Source/gate history, both sealed evidence units and the existing rooms. This Source-only packet ran no project code, test, gate, signing, native read, provider operation or recovery.
