# Say why a room did not open when the page holds no session

Status: source implementation. The gate passed at `162edc1a`. The Worker bundle's bytes change, because `assets.ts` holds the page. The planner deploys it. No deployed Worker ran this code.

Request `278db3deca90b16955ab142d29f50ce97b283e61` and promise `5919cf68897a494e1eb89819042a3011e0272e4d` own this head. The refusal itself stays, under planner decision `61cc5e50`. The trace under `09083039` found the words.

## What changed

A person whose session request failed used to read `Cannot read <directory scope ID>: forbidden.` under the heading `Observation unknown`. An active member and a stranger read the same thing, with no cause and no next step.

- **The reason stays.** `Unreadable` in `apps/room/page/src/data.ts` gains `noSession`, which holds `why` and `retryAfterSeconds`. Only a `forbidden` directory read on open with no session sets it. `error.message` does not change.
- **The screen.** `failureScreen` in `view.ts` shows the heading `This room did not open`, then the words, then a muted `Details:` line with the scope ID and the reason. `Join another room` stays.
- **The forms.** The start, config and invitation forms show the words through `failureText` in `shell.ts`.
- **A room on signed reads.** A room whose rules state is `unknown` with no session now shows `The complete rules could not be read.` and the words. A session holder's `unknown` state stays silent.
- **Documents.** The "Who reads" comment in `data.ts` and `apps/room/docs/page.md` state the cases, and `assets.ts` is rebuilt.

## The words for each reason

| Reason | Words | The case that shows them |
|---|---|---|
| `no-reply` | The service did not answer this page's request for a read session. Reload this page to try again. | Stand-in on the wire, browser |
| `rate-limited` | This key has asked for too many read sessions. Wait 60 seconds, then reload this page. | Stand-in with `retry-after` 1, 60 and 900, browser |
| `rate-limited`, no header | The same sentence, with `Wait a few minutes` | Stand-in on the wire |
| `sessions-unavailable` | This service is not giving read sessions to any key, so it did not check whether this key belongs to the room. Without a session, the room opens only for a key that signed there recently. Ask whoever runs this service to turn on read sessions, then reload this page. | Real, member and stranger identical, browser |
| `unauthorized` | This key is not an active key of a member of this room, so the service gave it no read session. Ask someone in the room for a new invitation link, then join with it. | Real, browser |
| `not-found`, `misaddressed` | This connection does not match an active room on this service, so the service gave this key no read session. Ask someone in the room for a new invitation link, then join with it. | Real |
| `expired`, `bad-request` | The service refused this page's request for a read session. This device's clock may be wrong. Check its date and time, then reload this page. | Real, with a skewed device clock |
| `clock-behind` | The service's clock is behind, so it gave no read session. Reload this page later to try again. | Stand-in on the wire |
| `replayed` | The service refused this page's request for a read session (replayed). Reload this page to try again. | Stand-in on the wire |
| A session held, read refused | `Cannot read <ID>: forbidden.` under `Observation unknown`, unchanged | Real |
| No session, read `unavailable` | `Cannot read <ID>: unavailable.`, unchanged | Stand-in on the wire |

## Decisions

- **A stranger and a member differ only where the service tells them apart.** With no usable secret, membership answers `sessions-unavailable` to every key before it reads the request, so both read the same words, and those words say that the service did not check the key. With a secret set, a key that is not active gets `unauthorized`. That word also covers a revoked key, a removed member and an agent whose controller is not active, and the page cannot separate them.
- **No route that does not exist.** A signature at the directory also ends the refusal, and the page has no way to make one, so the words do not offer it.
- **`Check status before editing` goes from this screen.** The screen has no such control.

## Evidence

The checkpoint is `162edc1ac8c8c7c95cbbba90516818a80dc785e4`, tree `4d11085e`. It includes main. Raw evidence is in `~/play/artroom-evidence/2026-11-01-page-words/`, `SHA256SUMS` `3d6f46391f0069738189dfedad797845b09fe816d4e6949f355892f4e19dbf89`. The reviewed head adds only this note and its manifest. The controls, the tests and the browser witness ran at `162edc1a`.

**The witness.** `apps/room/page/test/no-session-screens.mjs` is an observed run in Chromium against a local `wrangler dev` Worker. `sessions-unavailable` came from restarting the Worker on the same state with no secret. `no-reply` and `rate-limited` are stand-ins at the browser's route. It holds a screenshot and the visible text of the saved room for three reasons, the invitation form for `no-reply`, and the config form for `unauthorized` and `sessions-unavailable`. It also observes that a reload opens the saved room again, that a reload and `Check status` open the invitation room after a lost session, and that the screen fits a width of 375 px.

| Control | Rule |
|---|---|
| C1 | The reason stays on the error |
| C2 | Only a `forbidden` read gets the words |
| C3 | A held session keeps its words |
| C4 | `retry-after` reaches the words |
| C5 | A stranger's words differ from the no-secret words |
| C6 | The failure screen shows the words |
| C7 | The config form shows the words |
| C8 | `main.ts` passes the reason to the notice |
| C9 | A session holder stays silent |

| Check | Command | Exit | Digest |
|---|---|---|---|
| Gate | `npm run gate` | 0 | `88db4b78fbe549f7` |
| Witness | `node apps/room/page/test/no-session-screens.mjs` | 0 | `008a19495a71e932` |
| Controls, 9 | `scripts/control.mjs` | 0 | `5d533a4cb14a5c19` |

The gate reports 3467 plain and 935 native tests, 116 Node and 56 Counting.

## Open limits

- **A later refused read.** A room already open on signed reads still shows `Cannot read <lane>: forbidden.` with no cause. The same holds after a session ends in the middle of a page.
- **The Rules screen** keeps `Check status before editing`, because session holders share that text, and the screen has no such control.
- **A key with no standing inside the window.** A revoked key that opens the directory still sees `The view could not be read.`
- **Other failures of the directory read** keep `Cannot read <ID>: <reason>.`, including the signed-read rate limit.
- **Coarse reasons.** `no-reply` also covers a late, malformed or wrong-key reply. `bad-request` also covers a malformed request, so the clock words say "may".
- **`signed there recently`** simplifies the founder's cause-chain rule and the 900 s window.
- **No secret.** A member has no route of their own, only the request to the operator.
- **No test.** The start form's catch and the invitation `Check status` catch use `failureText`, and no test or control covers those two sites.
- **Not run.** The real 429 and its `Retry-After`, and any deployed Worker.
