# Why a key that signed nothing at the directory cannot read it

Status: traced, with no repair to the read. The gate passed at `a06f01c6`. This head adds one test, and states what a revoked key keeps in `docs/security/trust-boundaries.md`. Source changes in a comment of `packages/scope/src/sessions.ts`, and no seal moves. No deployed Worker ran the test.

Request `09083039541e0abc818cb906febe64b56e4ed7d7` and promise `ca502951cc47a526ce9150babfe55ce7c32fa382` own this head, under planner decisions `6d96e044` and `40ea8fdf`.

## The refusal is right, and it lasts

J1's build saw a newly enrolled key with no session get `forbidden` on its signed read of the directory, and dropped that approach untraced. The key got `forbidden` because it signed nothing at the directory.

A scope answers a signed read of its summary in two cases, and `checkedRead` in `packages/scope/src/signed-reads.ts` asks only these:

- The key signed an entry of that scope within 900 s.
- The key signed the root of the scope's genesis chain within 900 s.

The check does not ask membership. Planner decision `61cc5e50` rules it: "A key that signed nothing in the scope gets forbidden as now", and after the window "a session is required". `story.scope.test.ts` has asserted the same refusal since `b9348836`.

`apps/room/page/test/signed-read-standing.scope.test.ts` varies one fact at a time on real scopes. The session requests that get no reply or a 429 are stand-ins on the wire, and the file labels them.

| Varied | Result |
|---|---|
| Time at 0, 1, 61 and 899 s | The new key reads membership, where it signed, and gets `forbidden` at the directory |
| Time at 901 s | Membership refuses the key too |
| A settled delivery | The same refusal. The directory's head does not move for a `join`, so no delivery exists to wait for |
| A member's two active keys | The laptop signed `open-issue` at the directory and reads it. The phone signed nothing there and gets `forbidden` |
| A stranger's key | `forbidden` |
| A key retired or compromised | The key keeps its read until the window ends |
| The key signs at the directory | The directory accepts the act with no session, and the read answers `ok` for 900 s |

## What ends the refusal

- **A session.** With sessions on, the room opens once the session request answers.
- **A signature at the directory, for 900 s.** The page has no route to this, because `act` reads the summary first and stops. The test sent bytes that the key signed earlier under a session.

Time, a delivery and a key's standing in membership do not end the refusal.

The refusal reaches past new devices. With no session, the founder gets it once 900 s pass after the claim. On a Worker with no `SESSION_SECRET`, no key can open a room past that window. On a Worker with sessions on, a lost or rate-limited session request gives an active key the same refusal. `RoomOpening` clears a rejected open, so a reload or a navigation asks for a session again.

## What a page on signed reads shows

The test holds the sentence. The heading and the link come from reading `failureScreen` in `view.ts`, and no browser ran them.

| The page | What it shows |
|---|---|
| A saved room | The heading `Observation unknown`, the words `Cannot read <directory scope ID>: forbidden.`, and the link `Join another room` |
| An invitation or a config form | `Cannot read <directory scope ID>: forbidden.` No room is saved. The join stays recorded, and after a reload the invitation screen says `The original join is verified. Check status to open its saved room, or paste another invitation.` |
| A key that opens on signed reads | The lanes. The rules view shows `Cannot read <rules scope ID>: forbidden.` |

These words fall short. An active member sees what a stranger sees, with no cause and no next step. `openRoom` holds the reason (`sessions-unavailable`, `no-reply` or `rate-limited`) and loses it when its first read throws. Request `278db3de` owns that repair.

## What a revoked key keeps

The trace raised a question: the read does not ask membership, so a revoked key keeps it. The planner ruled in `6d96e044` that it may, if the bound is real, and asked for that bound from the code. The test then tried every route it could find to store an entry that a revoked key signed.

**The bound is 1200 s plus clock difference, not 900 s.** A scope holds its observation of a key for up to 300 s, and the window adds 900 s. A scope can also accept that key's acts during those 300 s, and this matters more than the read. On the scripted clock:

| After the revocation | Result |
|---|---|
| 299,999 ms | The last act gets `accepted` |
| 300,000 ms | The act gets `unauthorized` |
| 1,199,999 ms | The read answers `ok` |
| 1,200,000 ms | The read answers `forbidden` |

**Two routes pass that bound.** Decision `40ea8fdf` rules on both.

- **A founder key that is also the recovery key, at membership.** The `recovery-key` grant checks only the signer, so the key keeps signing after its revocation, and each act restarts its read of membership. The key keeps the recovery key's authority, which is worse than the read. Only a hand-built `found` makes this shape, and the test's `recoveryIsFounder` option in `support/demo.ts` builds it. Request `309f3434` refuses it at creation. An existing room ends it only by rotating the recovery key.
- **A key on the register's `founders` list, at the register.** The register is its own authority, and a room's revocation does not reach it. Each `found` restarts the key's read of the register and reads nothing of the room.

**The routes that gave nothing.** A refused act writes nothing. Resent landed bytes make no new signed entry. An old intent sent after the delay, a comment at a lane, a preparation and an old grant each get `unauthorized`. `join` and `enrol` get `key-in-use`. A signed time gives nothing, because an entry takes the scope's clock. A stalled membership gives no more time, because the act gets `authority-unavailable` at 300 s and writes nothing.

## Decisions

- **No repair.** The refusal follows `61cc5e50`. Asking membership at read time would widen who can read, and that is the planner's decision.
- **The docs omit one sentence of `40ea8fdf`, and the planner withdrew it.** The sentence says that an operator must remove a stolen key from the register's `founders` list, a step that I recommended in `aaf573dd`. No such step exists: `founders` is `fixed: true`, and `install` alone writes it. `662fec93` told the planner, and decision `6379bc9d` withdrew the sentence and let these docs stand. The page says that no command removes the key.
- **The operator's steps start with the rotation.** `dap act` asks for a session first, and a revoked key gets none, so that command cannot send the rotation after the revocation.
- **The discarded setup did not cause the refusal.** A case in the test reproduces the step's condition: a lost session request, sessions on, and a new key.

## Evidence

The checkpoint is `a06f01c64dda3a71c9ed79c48541a9914d8d1839`, tree `81cd8b34`. It includes main. Raw evidence is in `~/play/artroom-evidence/2026-11-01-signed-read/`, `SHA256SUMS` `c63ca3c24326c3bd38df1dc146a9fdeb4c8e03248a9f8edab85a9aea6258fa4b`. The reviewed head adds only this note and its manifest.

The test and the controls ran at `9105a6ed` or earlier, as each log's head states. The checkpoint merges main twice, and the head adds only the note and its manifest. `gate-stopped-for-main/` holds a gate that I stopped when main moved, and it reached no result. `head-run-3.log` holds all 14 cases at `9105a6ed`. `first-run.log` keeps the first failing run, where the test looked for a key row that a summary does not list. `a stolen key` uses a session-owner child with a new secret in place of a real `SESSION_SECRET` change.

| Control | The test that failed |
|---|---|
| Any recent signer reads | Two active keys |
| A key's own signature does not count | A key that signs at the directory |
| A local signer has no window | Two active keys |
| A genesis root has no window | Two active keys |
| Any signed read reads a summary, the widening | A newly enrolled key, which then opens as `@una` |
| The page stops on a lost session request | A Worker with sessions on |
| `c7`: the observation's age doubled | `the bound`, the stall case, the case that no route stores an entry |
| `c8`: an enrolled key may join | The case that no route stores an entry |
| `c9`: a read may name any end | `a signed time gives nothing` |
| `c10`: every entry counts as the key's own | `what a revoked key reads in the window` |
| `c11`: any key may `found` | `a new scope` |
| `c12`: the recovery rule off | The recovery route |
| `c13`: a rotation may name an enrolled key | The recovery route |
| `c14`: `founders` not fixed | `a new scope` |
| `c15`: any secret accepted | `a stolen key` |
| `c16`: a session reads at its end | `a stolen key` |

| Check | Command | Exit | Digest |
|---|---|---|---|
| Gate | `npm run gate` | 0 | `308150536211ec37` |
| The test, 14 cases | `vitest --project scope signed-read-standing` | 0 | `afcb8f0b78b86764` |
| Controls, 16 | `scripts/control.mjs` | 0 | `56899180c934ed2f` |

The gate reports 3467 plain and 963 native tests, 116 Node and 56 Counting.

## Open limits

- **A stolen key on `founders`.** Each accepted `found` also opens a claim and a repository's creation, and no command removes the key. The fixture's git double holds one repository, so no run showed a second one created. Design request `788d0ec8` owns how a register retires a founder, and nothing in this head builds it.
- **Clock differences.** Nobody measured a real difference between membership's clock and a reading scope's clock, and the bound adds that difference.
- **The command line and a stolen recovery key.** No command prints a new key's ID for `--set key=<new-key>`, and `dap act` signs with the config's key, so it cannot sign with a separate recovery key. The first signer of `rotate-recovery` names the next recovery key, so a holder of the stolen key can get there first. I read that race from the rule and did not run it.
- **Not run.** `install`, `found` under policy `open`, hosted and application scopes, and `member.remove`'s path in `docs/mcp.md`.
- **A room past the window with no session secret.** No key can open it, and the same holds during a session outage. Changing that means the widening above.
- **`data.ts`'s head comment.** The "Who reads" comment omits the lost and rate-limited session requests. The words repair changes that file and owns this too.
- **No browser or deployed Worker.** No browser and no deployed Worker ran this test. I do not know which deployed Workers bind the secret, although the docs require it.
