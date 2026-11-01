# Name enrollment stops and recheck a provisional inbox

Status: source implementation. The gate passed at `d1af2197`. No room has run the recheck yet. No hosted code changes.

Request `a34e29784853fb30949db3f2d01f5aa9b46f491b` and promise `7b0de57d099ed98527db0f7120ce774e864163fc` own this head.

## What changed

An S1 enrollment that reads a new inbox too early now rechecks it, and a stop names its condition in the receipt.

- **Recheck.** `enrollment` in `examples/repo-in-ai/identities.ts` runs the invitation engine again in check mode, up to 10 times, 1 second apart. A recheck signs and submits no act. It uses the existing read session, or opens one if that session has ended. It may record a settled stage in the owner's private records. It runs only for the two inbox words below, and only in `new` and `continue` modes.
- **Fixed words.** `invitationCause` in `examples/repo-in-ai/diagnostics.ts` maps each engine reason to a word at stage `invitation-result`: `inbox-not-confirmed`, `inbox-not-readable`, `opening-unresolved`, `invitation-act-unresolved`, `invitation-unverified`, `directory-unverified`, `binding-unverified`, `successor-pending` or `unknown`. No reason text reaches the receipt.
- **Receipt.** A new field, `inboxRechecks`, holds the count, also when the enrollment completes.
- **Runbook.** `examples/repo-in-ai/runbook.md` lists the words and the recovery.

The S1 note's limit on this stop now points here.

## Cause

The likely cause is timing, and the records do not show it directly.

A new inbox starts `provisional` and turns `active` when its creator's confirmation arrives. `inboxOfOpening` in `packages/cli/src/invitations.ts` accepts only `active` and does not wait, so the engine answers `unknown`. A local native run at `c1ff846e` reproduced the same shape: `new` read the inbox as `provisional` and stopped with `unknown`, and `check` then read it as `active` and verified. That run is a stand-in. It shows a path to this stop, and it does not show that the rooms took that path.

**A correction to the second room.** Request `a34e2978` says the last read answered 200, and the S1 note says the second room took the same path. The second room's `enrol-a` receipt says GET, category other, status 404. The third room's `enrol-checker` receipt says status 200. So the second stop reads as `inbox-not-readable` under the new words, and the third as `inbox-not-confirmed`. Nothing shows where that 404 came from.

`check` stopping at `receiver` is by design. `check` never starts a receiver, and a receiver with no pending enrollment refuses `check` at `invitations.ts:376`. `continue` starts the receiver from the kept handoff.

### What the records cannot show

- The inbox's status at either stop. The receipts hold a read status and no body.
- The engine's reason text. The receipts withheld it, so the two rooms' words above come from the read status alone.
- The length of the window. The next `check` started 11.4 s after the stop in the third room, and 5 min 42 s after it in the second. Both are upper bounds, read from the capture receipts as finish times minus elapsed time.
- The source of the second room's 404.

## Decisions

- **Repair in the script, not the engine.** The real fix is for the engine to wait for `active`, with the `waitFor` and `active` helpers. `invitations.ts` is in the page bundle, and `scripts/security-entry-points.test.mjs:293` pins its hash, so a change there is hosted code. This request needs no deployment, and the real room comes first.
- **A recheck is the same read-only settlement as `check`.** A stop after the last recheck keeps its exit code, its word and its recovery.
- **`check` does not wait.** It reports once, as before.

## Evidence

The checkpoint is `d1af219760ae65b15f82182ab83948cb55d6e4c1`, tree `7114e67a`, based on main `c1ff846e`. Raw gate evidence is in `~/play/artroom-evidence/2026-10-31-enrol-stop-gate/`, `SHA256SUMS` `041e2ee69f821a20b1f57e3789b2c4b211b7c7b13727a40a83318767641853b3`. The reviewed head adds this note, its manifest, the one-line change to the S1 note, and one corrected sentence in the runbook. Source and tests do not change after the gate.

The controls and the native probe are in the separate sealed unit `~/play/artroom-evidence/2026-10-31-enrol-stop/`, `SHA256SUMS` `0e7b7f585e16f46e79094b7bdcc403a1f48730d0f6720e8dd9bbb74ef6586385`. They ran at this same source, and 22 of 22 controls distinguish, each with one log.

| Done-when item | Evidence |
|---|---|
| The note names the cause, or says what the records cannot show | The two sections above, and `native-probe/trace.txt` |
| A test holds the fixed word | `t1-word-inbox-not-confirmed`, `t4-word-table`, `t4-binding-word`, `t4-second-room-404`, `t4-unlisted-stays-unknown`, `t4-other-state-keeps-word`, `t4-engine-text-guard` |
| A test holds no private value | `t1-no-secret`, `t1-no-session-token`, `t1-no-reason-text`, `t1-no-link` |
| A recheck signs nothing and recovers | `t1-no-act-on-recheck`, `t2-no-act-on-recheck`, `t2-recheck-completes`, `t2-steps-record-count`, `t2-receiver-keeps-count`, `t3-not-readable-rechecks`, `t3-check-does-not-wait`, `t1-t3-bound-is-ten` |
| The recovery the runbook states | `t1-check-reaches-receiver`, `t1-continue-completes` |

| Check | Command | Exit | Digest |
|---|---|---|---|
| Gate | `npm run gate` | 0 | `30c2d2b205009614` |

The gate reports 3240 plain and 901 native tests, 115 Node and 56 Counting.

## Open limits

- **The recheck has not run live.** Only local tests and a stand-in native run have exercised it. Whether 10 rechecks cover a real room's window is unknown. If they do not, the enrollment stops with the word, and the runbook's recovery still applies.
- **The hosted engine does not wait.** The page's agent-key flow calls the same engine and can still meet this stop. This head does not change that.
- **A 404 rechecks too.** `inbox-not-readable` rechecks because the second room's read answered 404 and its later `check` passed. A lasting refusal spends the 10 seconds and then stops.
