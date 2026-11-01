# Wait for an active inbox in the invitation engine

Status: source implementation. The gate passed at `6c4a3f14`. No Worker runs this code yet. The planner deploys it on its next round, after the hosted agent's run.

Request `e9f268d9f982cac4a55fe184253c49a5964ed71e` and promise `93b27693777abb69a2f4d524a53f2f1dc9b4e918` own this head.

## What changed

An issuance that meets a new member's inbox before it turns active now waits, in the engine, and no longer stops at once. The page's agent-key flow and S1's enrollment both get this wait.

- **The wait.** `activeInbox` in `packages/cli/src/invitations.ts` reads the inbox once, then pauses one second at a time, at most 20 times and until 20 seconds have passed. It waits through `provisional`, and through `not-found` and `forbidden`, which a read answers before the inbox is created. Any other failed read stops at once. At the bound the engine answers `unknown` with the same reason text as before.
- **`check`.** A `check` reads once and never pauses.
- **A receiver.** `enrolKey` does not wait. Issuance read the inbox as active before it wrote the link, and an inbox never returns to provisional.
- **The script.** `enrollment` in `examples/repo-in-ai/identities.ts` loses its recheck, and the receipt in `diagnostics.ts` loses `inboxRechecks`. The runbook states the engine's wait.
- **The runbook's other sentence.** The checker's review `f6bc0ac2` of S1's wait asked for one sentence at the next edit, on what to read when `check` never settles. This head adds it.

Hosted code changes. `invitations.ts` is in the page bundle, so `apps/room/page/assets.ts` is rebuilt, and the seal of `invitations.ts` in `scripts/security-entry-points.test.mjs` moves to the owner's value.

## Decisions

- **Remove the script's recheck.** The engine now holds the same wait, with a longer bound, so the recheck adds nothing.
- **Twenty seconds.** A person waits on this in the page, so it stays short. The third S1 room's stop cleared within 11.4 seconds. That is one sample, so the bound is a judgment about cost. A wait that proves too short ends in the existing stop and recovery.
- **Wait through `not-found` and `forbidden`.** The request asks for an active inbox, and it names only a provisional one. A read before the inbox's creation arrives answers `not-found` from the deployed scope index, or `forbidden` from a scope with no index. Treating those as a stop would keep the failure that this head removes. The cost is that a lasting `not-found` or `forbidden` spends the whole bound.
- **`Context.tries` can only lower the bound.** A caller's value cannot extend a person's wait.

## Evidence

The checkpoint is `6c4a3f14fb1ff79475742db22466cd538f616a41`, tree `da678086`. It includes main. Raw evidence is in `~/play/artroom-evidence/2026-10-31-invite-wait/`, `SHA256SUMS` `c5eb251940cec57f32e2bf01aadab8a80cb985c0f171f6bebd52fa630407b3bb`. The reviewed head adds only this note and its manifest.

All 20 controls ran at the checkpoint, and each turned its named tests red by an assertion. `controls/results.json` holds them. `controls/run-at-01092cfb/results.json` keeps the first run, before main's merge. `controls/run-controls.mjs` is the runner.

| Rule | Controls |
|---|---|
| The old engine fails the new tests | C1 |
| The bound is 21 reads and 20 seconds | C2, C3, C4, C5 |
| `check` reads once | C6 |
| The engine waits through `not-found` and `forbidden` | C7, C8 |
| Other failed reads, a refused inbox and a read with no reply stop at once | C9, C10, C11 |
| The wait posts no act | C12 |
| A read session that ends during the wait renews | C13 |
| The pause is one second and names the two scopes | C14, C15 |
| A receiver does not wait | C16 |
| The reason text does not change | C17 |
| The script's recheck stays out | C18 |
| `Context.tries` lowers the bound and cannot raise it | C19, C20 |

The tests are in `examples/repo-in-ai/test/identities.test.ts`, which scripts the transport, and `packages/cli/test/agent-key.scope.test.ts`, on real scopes. `apps/room/page/test/start.scope.test.ts` shows the Worker's `not-found` answer for a scope that the index does not know.

| Check | Command | Exit | Digest |
|---|---|---|---|
| Gate | `npm run gate` | 0 | `63681056e0733296` |
| Controls, 20 | `controls/run-controls.mjs` | 0 | `c6f148b311ef7554` |

The gate reports 3262 plain and 929 native tests, 116 Node and 56 Counting.

## Open limits

- **The exact claim.** The wait signs and submits no act. It uses the existing read session, and it signs a read-session request when that session has 30 seconds left or fails a read check. If membership refuses a session, each read is itself signed.
- **Not run.** No Worker, real room or browser ran this wait. Whether 20 seconds covers a real room's window is unknown, and the third room's 11.4 seconds is one sample.
- **The page's words during the wait.** The person's button can sit for up to 20 seconds, and this head adds no words for that time.
- **The second room's 404.** That stop answered 404, and a later `check` passed. It fits the scope index in `enforce` mode, by reading the code. No run has shown that cause.
- **An older note goes stale.** `notes/implementation/2026-10-31-enrol-stop.md` states "The hosted engine does not wait" and describes the script's recheck. Both stop being true when this head lands. That note records its own head, so it stays as written.
