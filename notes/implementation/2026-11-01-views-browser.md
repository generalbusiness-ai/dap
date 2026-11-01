# Open an incomplete card's available entries

Status: source implementation. The gate passed at `5595ddd7`. No deployed Worker or desktop AI app ran this code. The Worker bundle's bytes change, because `packages/mcp/src/views/generated.ts` changes. No hosted route changes.

Request `bdb8dfccd590f39cb10f3cfb9c596d32b29d2c96` and promise `f68c88cb9de59386839ba6390d0555cf7a45e54c` own this head. The request gives the views-browser part of `2082efd9` its own landing, because a landing closes its request.

The green run and the control ran at `2fa99b16`. This head changes only that commit's trailers, so the tree stays `cffd8751`.

## What a person sees

Ren opens a card that says "6 updates since your last review" and "Read the available entries before marking them reviewed." One of the two scopes has an entry that the read could not load.

Before this head, the card's title was plain text, and the card had no other way to its detail. Ren could not read the entries the card asked Ren to read.

Now Ren presses the title. The page lists the available entries and says:

```text
Unavailable: change-9 entries 9–9.
```

The page offers **Back** and no **Mark reviewed**. An unavailable placeholder still does not open.

These words come from the run in `green`, on the fixture host. No shipped source reaches this state today: `apps/views/src/change.ts` and `apps/views/src/decision.ts` return `incomplete` with no card, and `packages/mcp/src/views/declared.ts` does not return it. The fault sits in the card kit, which accepts a card with that status from any `ViewSource`.

## The cause

The card lost a behaviour, and the script was right. Commit `2602c5281f`, of 19 October 2026, changed two lines of `packages/mcp/browser/main.ts` for declared queues:

```diff
-  if (!display?.card) return;
+  if (!display?.card || display.status !== "ready") return;
-  if (summary) {
+  if (summary && display.status === "ready") {
```

That commit needed the condition for its new unavailable placeholder. The condition also removed the link from an incomplete card.

The script's `incomplete` case dates from `21296fdaf7`, two days earlier, and `2602c5281f` did not change the script. The design packet asks for this behaviour: in `notes/2026-10-17-journey-views-design.md`, the partial example lists six entries, names the unread scope, and keeps Mark reviewed disabled. No gate runs the script, so the gate stayed green.

## What changed

- **`packages/mcp/src/views/opens.ts`.** New: `cardOpens(status)`, true for `ready` and `incomplete`.
- **`packages/mcp/browser/main.ts`.** The title and `open()` both use `cardOpens`.
- **`packages/mcp/src/views/generated.ts`.** Rebuilt by `packages/mcp/scripts/views.mjs`.
- **`packages/mcp/test/view-sessions.test.ts`.** One new test. It checks `cardOpens`, and it checks that an incomplete card's detail holds its entries and no act.

The script `packages/mcp/test/views-browser.mjs` does not change. After the fix, the later fixtures pass with no other change: `checks-failed`, `loss`, `empty`, `denied`, `absent` and `unavailable`.

## Decisions

- **Name `incomplete`, and keep every other status closed.** A check of `status !== "unavailable"` would also open `stale` and any later status. An unknown status stays closed.
- **One rule for both sites.** The title and `open()` must agree, or the link does nothing. `2602c5281f` wrote the condition twice.
- **A plain test in the gate.** The rule is a pure decision, so the test runs at the cheapest boundary. It does not show that the page calls the rule. The script shows that, and the gate does not run the script.
- **No browser run in the gate.** The script needs `playwright-core` 1.63.0 and Chromium, and neither is a dependency of this repository. This head therefore adds no step to `scripts/gate.sh`.

## Evidence

The head is `5595ddd746647c2382e3209f5cbde64323c963c2`, tree `cffd8751`. Raw evidence is in `~/play/artroom-evidence/2026-11-01-views-browser/`, `SHA256SUMS` `d280459014271eccc03d6cf953772ba7ce7efaf171a2a0b94aec82b4393c2369`.

| Check | How taken | Command | Exit | Result | Digest |
|---|---|---|---|---|---|
| Gate | observed run | `npm run gate` | 0 | 3533 plain and 1013 native tests, 116 Node and 56 Counting | `56535ba94f06a88b` |
| History | read from Git | `cause/history.log` holds the output | not a run | `2602c5281f` is the only commit that changed the status condition. It did not change the script | `be4933ea81dda095` |
| Red run | observed run at main `8851f19d`, in 38.1 s | `node --import tsx packages/mcp/test/views-browser.mjs` | 1 | Times out at `views-browser.mjs:90`, `fixture=incomplete`. 7 of 24 cases finished | `e498764773a4e0ee` |
| Green run | observed run at `2fa99b16`, in 12.74 s elapsed and 16.97 s CPU, Mac17,7, load about 3.3, Node 26.13.0, Chromium 153.0.8010.12 | the same command | 0 | 24 of 24 cases, no errors | `b03bbd6abbc1a4c6` |
| Named control | observed run at `2fa99b16` with `scripts/control.mjs`, source clean afterward | `control/incomplete-opens.log` holds the output | 0 | `status === "ready"` in `cardOpens` distinguishes: "an incomplete card opens its available entries and offers no act" fails by an assertion | `3b43bbd979454b74` |

`attempt-1` is a passing run on the uncommitted tree, in 12.78 s. The locator's timeout takes 30 s of the red run's 38.1 s.

## Open limits

- **The script checks the model context for the unread scope, and not the visible words.** It asserts `context.unavailable`. The `green` report's text holds "Unavailable: change-9 entries 9–9.", and I read that once. The builder owns a stronger assertion, if the planner asks for one.
- **No Load more.** The design packet's partial example offers it, and `packages/mcp/browser/main.ts` has none. A person reads the available entries and cannot load the rest from the card. The planner owns that decision.
- **Other browser scripts.** No gate runs `packages/mcp/test/*-browser.mjs` or `apps/room/page/test/*.mjs`, and this head ran none of them. Each can hold a fault of this kind. The planner owns where they run.
- **Not run.** Any mutation sweep.
