# Let a second room verify itself

Status: source implementation. The gate passed at `8d5acf45`. `dap verify` runs in the person's own process, so no Worker change is needed for it. A member reads the new report after the head lands.

Request `9f80a194218f1ea278520b323d569edd6bca0c01` and promise `7e6ce13bb357e549345d6236b51809d84e72f563` own this head. The planner's decision `578e8ca5` chose option 1, with three conditions.

## The problem

A member of a room that is not the register's first room could not verify that room. The register's replay reached another room's creation result, needed that room's directory, and the service refused the read as `forbidden`. Each room's reads stay closed, so that member got `not proven` on every run. Decision `ca8ad1cf` and commit `f256c6527d` named that answer. A journey that asks a person to verify their room could not pass in any room after the first.

## What changed

- **`packages/replay/src/verify.ts`.** The option `otherRooms: { ownDirectory }` turns on one rule, `#otherRoomResult`. It takes a register entry's source on the service's word only when all of these hold: the entry delivers an applied result from that source; the source is entry 0 of a directory; that directory is not the reader's own; the register holds the request, with a matching hash; and that request's send names a seed whose scope ID is that directory. The service must also have answered `forbidden`.
- **`packages/replay/src/report.ts` and `packages/contract/src/report.ts`.** The report carries `otherRooms: true`. A consistent report's second line says what `consistent` covers and counts the results, and the anchors stand under a heading of their own.
- **`packages/cli/src/commands.ts`.** `dap verify <scope>` and `dap verify --all` pass the reader's directory. The last line of `--all` adds `and <m> creation results of other rooms on the service's word`.
- **`docs/cli.md`.** The section on `dap verify` states the rule and the words.

The words read:

```
Result: consistent, for the mode, target, coverage and trusts stated below.
This result covers the scopes under Coverage, replayed from their first entries. It does not cover other rooms on this register: 11 of their creation results stand on the service's word, because this reader cannot read their directories.
```

A register's first room has no other room's result to take, and its report carries none of these words. A test holds that.

## The planner's three conditions

**1. An anchor cannot hide a change to this room's state.** The test `a server that relabels this room's own result as another room's fails the proof` forges the register, seals every later entry again, and serves it. It runs four forgeries, with the reader's room second on the register, so that an earlier room's request is already sealed:

| Forgery | Answer | What stops it |
|---|---|---|
| An invented entry named as the last room's first entry, retained for the reader, with that room's real result removed | `not proven` | the seed check in `#otherRoomResult` |
| The source alone relabelled | `not proven` | the seed check |
| The source and the request relabelled | `mismatch` | the replay of the register, "repeat" |
| A whole copy of the other room's result | `mismatch` | the replay of the register, "repeat" |

Removing the seed check does not turn any of them into a pass. The answer moves from `not proven` to `mismatch`, because the replay derives the register's entry again. With the rule's own source check in `packages/derive/src/delivery.ts` removed too, the invented entry still answers `mismatch`. So I hold no control where a forgery reaches `consistent`. The controls show that the test tells these answers apart, and that the anchor stops first. The reader's own directory never takes an anchor, and removing that check fails the test `only an actual Session-forbidden Directory genesis`.

**2. The report states the trust in words a person reads.** The second line above, the heading, the trust line and the last line of `--all` all say it. On any answer but `consistent`, the second line is absent, because it describes what a consistent result covers.

**3. The `--all` path ran.** It ran on dap-demo in Rita's and Una's scratch homes, with the code of this head and read-only calls. Each answered `All consistent: 10 scopes, and 11 creation results of other rooms on the service's word.`, exit 0.

## The two pinned tests

- **`packages/cli/test/claim.scope.test.ts`, flipped.** This second-room test expected `not proven`. It now expects exit 0, one anchor naming the first room's directory, and the words, because the planner's decision makes that the right answer. The test's reads still go by session, and its authority assertions stay.
- **`packages/cli/test/verify.test.ts`, `only an actual Session-forbidden Directory genesis`, not flipped.** The planner named it to flip, and it stays as it was. Its fixture refuses the reader's own directory, so `not proven` stays right. It now shows that an anchor never covers the own directory. The new test beside it refuses the other rooms' directories and expects the new answer.

## Evidence

The head is `8d5acf45e2661cdcfd8c9a295018908a8fb9a9a5`, tree `929f87d1`. Raw evidence is in `~/play/artroom-evidence/2026-11-01-verify-anchors/`, `SHA256SUMS` `9b44c09048a67193f6b0fe967e64010fc8ffd6e4d608abbbac2a8334733611aa`.

| Check | How taken | Command | Result | Digest |
|---|---|---|---|---|
| Gate | observed run | `npm run gate` | exit 0: 3540 plain and 1022 native tests, 116 Node and 56 Counting | `5bf34f07e79d98de` |
| First gate | observed run, failed | `npm run gate` | exit 1 at typecheck: an untyped list in the new test. I typed it and amended | `e179d448a0c3f6f6` |
| `--all` as Rita | observed run on dap-demo, on this source before the note | `dap verify --all` | exit 0, 10 scopes, 11 anchors, no `not proven` | `7fc761c6970b78a6` |
| `--all` as Una | observed run on dap-demo, on this source before the note | `dap verify --all` | exit 0, 10 scopes, 11 anchors, no `not proven` | `7fc761c6970b78a6` |
| Control: the old answer | observed run with `scripts/control.mjs`: no anchor rule | `controls/old-answer.log` | exit 0: the second-room test fails on `not proven` | `64574383b278cee7` |
| Control: no seed check | observed run with `scripts/control.mjs` | `controls/no-seed-check.log` | exit 0: the relabel test fails, `mismatch` where it expects `not proven` | `5f3b08a45562b418` |
| Control: no seed check and no rule check | observed run with `scripts/control.mjs` over a temporary edit of `delivery.ts` | `controls/no-seed-check-no-rule-check.log` | exit 0: the same failure, and the forgery still does not pass | `98849b79df39c415` |
| Control: the own directory anchored | observed run with `scripts/control.mjs` | `controls/own-directory-anchored.log` | exit 0: the pinned test fails by an assertion | `747b81f4047e815a` |
| Control: no words | observed run with `scripts/control.mjs` | `controls/no-words.log` | exit 0: the second-room test fails on the second line | `013de1e7a70ceaf1` |

The first four controls ran before I amended the test's one list type, which changes no behaviour. The fifth ran at the gate's head.

## Open limits

- **What a reader cannot check.** The reader takes each other room's result on the service's word. A server can invent a room that no one can read and show its result, so this report does not show that a listed room exists as stated. The count and the list say how much rests there.
- **The head of the register.** The report's trust list already says that the service's answer for the head stands on its word. A server that cuts the end of the register removes a room's creation result, and no anchor is involved. The forgery table's first row needed that cut.
- **A person has not read this report.** Rita's and Una's homes are scratch homes driven by me.
