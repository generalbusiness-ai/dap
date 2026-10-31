# S6: the Change card, version-bound acts and a bounded diff

Status: source implementation. The gate passed at `3a05555a`. No Worker runs this code yet.

Request `ddf2a597876b00342f7481941ca7571a1705d83e` and promise `ca23fc67fe4892bb9ddcfaef61b23a39ccb4891f` own this head.

## What changed

The owner can now review and merge one exact version of a change from a card in their assistant.

- **Change card.** `apps/views/src/change.ts` reads one change and shows the base, the integration, this version's reviews and checks, the rules, the merges, and the linked issues' conditions and decided questions. It names each reviewer as a person or as an agent with its controller. Opening the `change` screen with a subject shows this card. Without a subject, that screen still shows the updates list.
- **Version-bound acts.** A card act signs the revisions that the card displayed, in `at`. An old card's approval reaches the scope, and the scope refuses it with `revision-moved`. The Decision card now works the same way, so S4's local revision compare is gone.
- **Unknown outcomes.** While a merge is unknown, no card offers a merge. The merger's card offers only **Check original request**, and a peer's card offers no acts. Each read of a card with a subject also asks custody for an act this server sent at that scope with no outcome kept, so the offer survives a restart. Pressing a retained card runs the same check before signing, so a card signs nothing while an original at that scope is open.
- **An exit for an act that never arrived.** One minute past the signed `notAfter`, **Check original request** reads the scope's record and then sends the same bytes once. The scope answers with the first entry if the act landed, and otherwise refuses it as `expired`. The record ends `accepted` or `refused`, and the card reads fresh.
- **Bounded diff.** `packages/git/src/diff.ts` reads a diff between two exact commits through a one-time credential. Over a bound, the answer sets `truncated` and says so in its text. The generic `diff` tool and the card's **View diff** both use it. Each signs or spends one `read-token`. The answer holds no credential. A shown path stops at 1,024 bytes, and controls, bidi characters and the backslash are escaped. Both routes refuse a commit ID other than 40 hex characters before they sign or spend anything.
- **Reads and guards.** The application catalogue gains a `change` read. `packages/mcp/src/node.ts` and `apps/views/src/node.ts` supply the Git read, and hosted MCP omits `diff`. `scripts/active-source.test.mjs` allows that one import, and `scripts/security-entry-points.test.mjs` carries the new seals.
- **Documents.** `docs/mcp.md`, `docs/mcp-tools.json` and `apps/views/README.md` describe the above. `docs/testing.md` now says how a control selects a root project.

### Repairs after checker report `766b6c61`

Checker report `766b6c61` on head `4b9f6e89` asked for seven repairs. Controls R1 to R14 are in the evidence table.

| Item | Repair | Case | Controls |
|---|---|---|---|
| 1. A card locked for good on an act that never arrived | The check resends the same bytes one minute past `notAfter`, and the scope's answer ends the record. **Check original request** names the time through `checkAfter` until then | `an act that never arrived` | R1, R3, R14 |
| 2. The check on a merge held elsewhere told the caller to sign | `not-found` now says that this server keeps no record, and that this does not show the act was not sent | `witness 2` | R4 |
| 3. A retained card could sign a merge during an unknown | `#refuseWhileOpen` runs inside the admit of `#dispatch` and `#readDiff`, before signing | `an act that never arrived`, `View diff: a retained card` | R2, R12 |
| 4. A long path broke the text bound | `brief()` bounds the path in `why` strings, and `#emit` reserves `CLOSING_BYTES` | `a long path stays inside the text bound` | R5, R6 |
| 5. A huge entry name threw | `byteString` reads in chunks, and the answer says `truncated` | `an entry name of half a megabyte` | R7 |
| 6. Paths passed controls to a reader | `shownPath` escapes C0, DEL, C1, bidi and the backslash. File text stays exact, as the header comment of `diff.ts` states | `a shown path escapes` | R8, R9 |
| 7. A refusal that could be known first spent the credential | `commitIdFault` runs first in `#viewDiff` and `#diff`. A `checked` failure in `#readDiff` also says the credential is spent | `witness 4`, `View diff: a retained card` | R10, R11, R13 |

The report also answered three points that I raised. For point 1, the comment in `shape.ts` now says the scope decides for `on`. For point 2, the hosted diff read stays an open limit, below. For point 3, item 1 gives the exit.

## Decisions

- `capturedExpected(at, fresh, act)` allows one extra name in `at`: `on`, or an `also` subject with no code. A superseded version leaves the live summary, so without this allowance an old card fails locally and never reaches the scope. Coverage of every live subject stays required.
- Approve names the first extent of class `content`, and the card says so. An approval for the rules or for deployment files stays outside the card.
- The restart check covers only cards with a subject, only acts in phases `sent` and `unknown`, and only this service, this signer and the card's own scope. A lost `read-token` reply therefore does not lock the card, because that act targets the destination.
- Settling an unknown merge reports the acceptance of the merge act, not its publication. The card returns to the check on its next read, because the merge stays unknown.
- **View diff** is a reserved `view_act` ID outside a card's two acts, because reading a diff signs a `read-token`. A second click signs a second one. A failed read says the credential is spent.
- Each changed file gets one hunk, from its first to its last differing line. The hunk is correct, but it can be larger than the smallest edit. The read fetches one pack of up to 32 MiB, because `OwnGit` has no shallow or filter support. A larger repository answers `truncated` with no content.
- Decision's `admit` keeps only the brief check. The scope now answers for a moved revision.
- The exit for a lost act differs from the route that ruling `f2ffbcfc` accepted. That route has custody resolve the record as "not sent, expired". This head keeps custody's meanings and asks the scope, because `judge.ts:217-224` answers a landed intent with its first entry at any time and refuses an unlanded one as `expired` once the scope's clock passes `notAfter`. The answer comes from the scope, not from this server's clock, and no new state can be wrong. Act `02d014d9` told the planner, and I saw no objection before filing.
- The clock margin is 60 seconds, `EXPIRY_MARGIN_MS`. The contract states no clock bound, so 60 seconds is my choice.
- Generated views always settle through `#viewSettle`, so a card's check behaves the same whichever application reads the service offers. The generic `settle` tool never resends.

## Evidence

The checkpoint is `3a05555a1304764e392c2d36083af548cb0768b8`, tree `67e7d1ff6093d9dae5a3cb3f77583bf58187348e`. The reviewed head adds only this note and its manifest. Per [the follow-up rule](../../docs/testing.md#follow-up-after-a-gate), source and tests are unchanged, so the gate does not run again. Digests name files in the manifest's directory, `2026-10-31-s6-change-view-repair`. Its `earlier-checkpoint` directory holds copies of the runs from before the repair, and each row says the commit it ran at. The sealed directory `2026-10-31-s6-change-view` keeps the originals with the gate at `98c055ae`.

The request's five witnesses map to these cases. All passed in the gate at the checkpoint, as its progress records show.

| Witness | Case |
|---|---|
| 1. An old card is refused, and a fresh card is accepted | `witness 1` and `the Decision card` in `packages/mcp/test/change-view.scope.test.ts` |
| 2. A merge from any card is refused during an unknown | `witness 2` in the same file |
| 3. A lost reply settles after a restart, and nothing is sent twice | `witness 3` in `packages/mcp/test/lost-reply.test.ts` runs a real `dap mcp` and kills its PID, and `after a lost reply and a restart` covers the card |
| 4. An over-bound diff says truncated | `witness 4`, and `packages/git/test/diff.test.ts` |
| 5. A complete native merge | `witness 5`, on stand-ins, and owed in a scratch room. See the open limits |

| Check | Command | Exit | Digest |
|---|---|---|---|
| Gate at the checkpoint: 3217 plain and 897 native tests passed, with 98 Node and 56 Counting. The test step took 1065.7 s in one observed run, from the gate's own log, while other work shared the machine. An earlier gate stopped by SIGINT at ruling `f2ffbcfc`, which changes the source, and its logs are in `stopped-planner-ruling` | `npm run gate` | 0 | `c10b267cc74d5dd663ce2dcfbea7826bf6527c48800fa1a8ec99c05b40ce057a` |
| Control R1, at the checkpoint: the check never resends. The lost act stays unknown | `scripts/control.mjs` | 0, distinguishes | `4ef909a30505901f71cccae46d9aab4c9c522e133f40e0d1210131320f084c38` |
| Control R2, at the checkpoint: a press makes no custody check. A retained card signs a merge, and the scope accepts it | `scripts/control.mjs` | 0, distinguishes | `1654f2913457eb75c407fd6d99b3c0242b294b75bb610cb3beab2ed7565751fa` |
| Control R3, at the checkpoint: the check resends before `notAfter`. The merge lands from the check | `scripts/control.mjs` | 0, distinguishes | `955f982087ae3b35029f390472b0914bc1a110d211633141cc1da8001d0642d2` |
| Control R4, at the checkpoint: the old `not-found` text returns. Witness 2 fails | `scripts/control.mjs` | 0, distinguishes | `45fe2e391770b0a8f953dff742ea9cad8a19efef12a38fc9aec01cb6c8e7643d` |
| Control R5, at the checkpoint: `brief()` keeps the whole path. The answer reaches 10,683 bytes against a bound of 8,192 | `scripts/control.mjs` | 0, distinguishes | `4663c9d6195ab6855dedacef643d8706c202ba57bb9e5583e405f04680576b6d` |
| Control R6, at the checkpoint: no bound on a shown path. Two `diff.test.ts` cases fail | `scripts/control.mjs` | 0, distinguishes | `11f76f9fc3408d5b65001b2c417d4aaed3516f3b22b908566de03f7c4634ac7e` |
| Control R7, at the checkpoint: `nameKey` spreads the bytes again. The half-megabyte case fails | `scripts/control.mjs` | 0, distinguishes | `43b721a8849f023ba5934bed28c5257a208733d2a2c898372b9d3c0d83e28603` |
| Control R8, at the checkpoint: the backslash goes unescaped. Two names read the same | `scripts/control.mjs` | 0, distinguishes | `cbfdb9a5487d0eb8340d7d1bea9c84d5f0a1a78c74f6843141f80874b18ef85e` |
| Control R9, at the checkpoint: U+202A to U+202E go unescaped. The path case fails | `scripts/control.mjs` | 0, distinguishes | `dee7e499af8de06b4e90d094d22188d7d3830d999d19ae3030d3705efa00e93b` |
| Control R10, at the checkpoint: the tool admits 64 hex characters. It spends the credential and then refuses | `scripts/control.mjs` | 0, distinguishes | `762ce56576302a6c3b10cee79d9790b52ece99bb91bc53e960e20747adeafcc7` |
| Control R11, at the checkpoint: the card admits 64 hex characters. It signs a `read-token` | `scripts/control.mjs` | 0, distinguishes | `2149a214f37ae86cef9c923352c1a526169644c2b86ec3b4bffdf3f84e9b4347` |
| Control R12, at the checkpoint: **View diff** makes no custody check. It signs while an original is open | `scripts/control.mjs` | 0, distinguishes | `952a912e6b918159ebe634350a6a1fc120dc5c1c85c29b671d77e9a5833cf45f` |
| Control R13, at the checkpoint: an oversized answer throws. The error omits the spent credential | `scripts/control.mjs` | 0, distinguishes | `bfa073dd21bd75878f61ecf53ea6a7571b494d2897c11050756b046afdf85cfc` |
| Control R14, at the checkpoint: the margin is gone. The record reads `refused` before the margin passes | `scripts/control.mjs` | 0, distinguishes | `4d402ef3db54c5873b8e3eb1297c85353ba4634055acb9aaf92ea3c652d74c90` |
| Diff owner: 3 passed, at `61ff4367` | `vitest run --project git test/diff.test.ts` | 0 | `f7e0ced70a849f150ea38275f47c8466d794e2cbb224c321d2a0d15d6aee5a47` |
| Change card owner: 6 passed, at `932f0cac` | `vitest run --project scope ../mcp/test/change-view.scope.test.ts` | 0 | `675e9619dcd2720903a9d16ce7993fa60d80719d0916f4743721621946d1df7a` |
| MCP plain owners, 11 files: 80 passed and 1 skipped, at `932f0cac` | `vitest run --project mcp` on those files | 0 | `654ab64ca60cb5ac0a90ca4c0db58e285bb31de66afceb716c2fe1065aab1ab3` |
| J4 workspace, room, captured revisions and card actions: 5 passed, at `61ff4367` | `vitest run --project scope` on those files | 0 | `d48369be9f80229f1048d4fc4d5953b8d92c0e7abc12f5ed4412a3b16e0c2a5a` |
| Views Node owner: 11 passed, at `61ff4367` | `node --test apps/views/test/decision.test.mjs apps/views/test/s4.test.mjs` | 0 | `4b6dc6f7c25cdb408ee7e7284808c0ca5f39c118983195ae1dc9fc176a80b845` |
| Active source: 12 passed, at `61ff4367` | `node --test scripts/active-source.test.mjs` | 0 | `d2fa9f062f4f387322c2d203f5c87c2ce3b9261026665826fd46c1b78992bb43` |
| Security entry points: 10 passed, at `932f0cac`. No route, method or gate class changed. The seals of `hosted-tools.ts` and `service.ts` moved, and three named seals are new | `node --test scripts/security-entry-points.test.mjs` | 0 | `62238b7498448dc84b9382897d351ad8974355f320ad58cf193c77ab8d3e0554` |
| Control C1: the service ignores `at`. Witness 1 is refused as an invalid intent, not `revision-moved` | `scripts/control.mjs` | 0, distinguishes | `2cf2077354dd4fe286743cbdf20e140e2259895be9876d53b45840569739e6d9` |
| Control C3: the service ignores `at`. The Decision card is refused `stale-question`, not `revision-moved` | `scripts/control.mjs` | 0, distinguishes | `0c8f3f9a469191945487241eda75c945c67b975732500bc2bb5ae05b4016260e` |
| Control C4: S4's local compare returns. The Decision card stops locally | `scripts/control.mjs` | 0, distinguishes | `04b5e9c950e789a68339498b3c1310f76b66d1ef10713e6e7f8e0828a8375ff3` |
| Control C2a: no allowance for `on`, before commit `a0f492dc`. It survives, and that commit added the case that catches it | `scripts/control.mjs` | 1, survives | `98c3e6b11705b1a0a99f16e95ac0033d93efb4c85454e810bc1270445381e3d2` |
| Control C2b: the same fault after `a0f492dc`. The Decision card signs nothing | `scripts/control.mjs` | 0, distinguishes | `636aa1c6d193aac62669e3c68f943795ac9c0390f5390b65c37542ee3c3c51cb` |
| Control C2c: a final `also` subject is not allowed. Witness 1 fails with a local shape error | `scripts/control.mjs` | 0, distinguishes | `5d7e0eabf88f18fb395594dbb389ccfeb7347fdcedf8792235416fac5e71e25b` |
| Control C2d: a computed name is allowed. `shape.test.ts` fails | `scripts/control.mjs` | 0, distinguishes | `3015ea6bb88c4d413dce4eba0a7a4afe1f9809d8eeb98e9c6bf82e781209d234` |
| Control C5: the unknown merge check is off. Witness 2 fails | `scripts/control.mjs` | 0, distinguishes | `b59e72527ae2591fd58d0251ed90fe26617f60778a0d2e8a3b77c31417a4e8eb` |
| Control C6: the card read makes no custody check. The restart case fails | `scripts/control.mjs` | 0, distinguishes | `02c25e58691a828a3c7bc9fbba952c38ec214d2c13285e1ca01dabca31e81b3e` |
| Control C7: Approve names a non-content extent. Witness 5 fails with `rules-not-met:source` | `scripts/control.mjs` | 0, distinguishes | `f78d1a304406b7c643e59b3397c2fe74918445d63f59986a507c14459795aa4f` |
| Control C10: the custody path differs per process. Witness 3 fails with `not-found` | `scripts/control.mjs` | 0, distinguishes | `c7c01c0aa9357f72e68f218421c4fc18e82577153a548e0a1a1df0cf0dd6fdb0` |
| Control C11: `send` resends a kept act. Witness 3 sees two posts | `scripts/control.mjs` | 0, distinguishes | `e44aea5a816aa899e6c0f88dee3716fe7a022f4e3856f314180715ac34a0e23a` |
| Control C12: the diff is never truncated. Two cases in `diff.test.ts` fail | `scripts/control.mjs` | 0, distinguishes | `9328b9fa173a607344901a0e3789601f2cc2752c2b26e9985bc05171853fa504` |
| Control C13: the diff endpoints swap. The `git apply` case fails | `scripts/control.mjs` | 0, distinguishes | `eac1c076c88e8fa36cb5a0fd594269e6246f50bc62a148cecac7c7945ee8491d` |
| Control C14: the diff is never truncated. Witness 4 fails | `scripts/control.mjs` | 0, distinguishes | `fb4d079b09061fce8175e41dcddf78eb67b90f5e3cea3436c09a4ff434e390a4` |
| Control C15: the card's `at` goes unchecked. `view-sessions.test.ts` reads "ready" where it expects "unavailable" | `scripts/control.mjs` | 0, distinguishes | `346e046402b50e049f16a496e052501c60024e9edd1139fc139d886e91cd9055` |
| Control C16: the card's `at` overwrites the action's. `view-sessions.test.ts` fails | `scripts/control.mjs` | 0, distinguishes | `e5022e7a3126cfe6c2db8681455df28dc1b35a8fcf70db391bfbb8694430df70` |
| Control C17, by hand: the import guard widens. The active-source case fails | edit, `node --test`, restore | One of 12 failed by an assertion. The file records no exit code | `5f4e5722d76583f5625e984eb2c9f6a269544a5193097b5b750fcbc66ed723ec` |

Earlier runs of R1 to R13 are in `earlier-controls`. In the first batch, R5 survived, so I added a case with a small bound. R7, R12 and R13 were inconclusive because a thrown error ended the case, so I changed those cases to fail by assertion. R9 was inconclusive because its old text did not occur in the source, so I changed that text. The runs in this table followed those changes.

The retained file for C9 is not evidence. Removing the merge guard from the definition moved its digest, so setup failed and the tool's word says nothing about the guard.

## Open limits

- **Hosted merge witness.** Witness 5 ran on `OwnGit` and `WorkspaceStandIn` with hold, a scripted clock and a pause scheduler, under real rules and membership, with `ownerMayReview`. It merged through `propose-file`, because the stand-in's manifests stage no repository. No room reaches a merge yet: plan 034's recovery reader is not scheduled, and both S1 scratch rooms stopped. The scratch room witness stays owed under request `ddf2a597`, and this head does not close the parent's live witness.
- **Diff on the real host.** No real provider diff ran. Witness 4 places objects directly in `OwnGit`. From reading `packages/scope/src/artifacts-host.ts`, integration commits live in a fork until the stage step, so a destination read token probably cannot read them before merge. The diff would then say unavailable when a reviewer most needs it. That reading needs a live check, and request `ddf2a597`'s hosted witness owns it. If a destination token cannot read an integration commit before merge, **View diff** needs a design change. Per ruling `f2ffbcfc`, the Change view is not finished for a reviewer until that witness runs.
- **An act that never arrived.** The route has no live run. Its witness runs on the Native test room, and a case drops the request. From the bounds, a lost act locks the card for about 16 minutes: the 15-minute intent lifetime and the margin. If the scope is unreachable, the record stays unknown and the card stays on the check. If the scope's clock lags this server's by more than 60 seconds, the resend lands the act and the answer says `accepted`. That act is the one its signer asked for, under the same key, and its signed revisions still bind it. Request `ddf2a597` owns this statement.
- **Retained cards.** The refusal reads this server's custody only. An act from another custody home reaches the scope, which judges it by its revisions. The check leaves out `prepared` records, so two services pressing at once have a narrow race, and the scope's revisions bind them. Request `ddf2a597` owns this statement.
- **Diff text.** File text keeps ESC, CR and bidi characters, and it reaches the card and the model as data. A shortened path does not apply with `git apply`, and the answer then says `truncated`. Request `ddf2a597` owns this statement.
- **Unknown merges persist.** A merge stays unknown until the destination can say whether the push landed, so the whole change waits. Plan 034 and ruling `90ee0518` own that recovery.
- **Not witnessed.** The browser's **View diff** change is typechecked only. No native case covers the verdict's `request` field for an open review request, required checks, or a manifest publication. The restart check's exclusions for `prepared`, standalone and other signers have no case. The scope's `merge-in-progress` refusal has an assertion by exact name and no valid control, which the checker accepted in report `766b6c61`. Report `766b6c61` also did not reach adversarial inflate and delta cases in `decodePack`, or the CPU time of decoding a 32 MiB pack, where the 20-second bound is checked only before reads. Request `ddf2a597` owns this statement.
- **Provider read.** `allow-reachable-sha1-in-want` on Artifacts has no witness. Request `ddf2a597`'s hosted witness owns it.
- **Deployment.** `packages/mcp/src/service.ts` runs in the hosted Worker, so the planner deploys this after the J4 witness closes. Workers stay at `112eff12` until then.
