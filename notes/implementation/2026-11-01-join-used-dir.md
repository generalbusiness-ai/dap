# Say what a used directory holds when `dap join` gets a new link

Status: source implementation. The gate passed at `5790b1ac`. The words run on a person's machine, so no deployment is needed.

Request `c5fba4bbb9d5eed74acaf8e181be57101eb93f5e` and promise `dd58054656b9a026f75d1b95c184b4070eb1551d` own this head. The planner ruled in `4e97323a`, question 3 of `5a8699fe`: a new link in a used directory stays refused, and the command says so plainly.

## What changed

A new device link in a config directory that holds an attempt used to answer "The original device enrollment is unavailable or unverified. Nothing was replaced. If an answer was lost, run the same command with --check." That answer named the wrong thing and the wrong step. It now answers:

```
This config directory holds a failed attempt: an earlier link was refused with revision-moved. This run sent nothing. A new link needs an empty config directory.
```

An attempt with no refusal says "an attempt with another link. To finish that attempt, run that link with --check". A directory with a room already has its own words, "This config directory has a repository already", and they stay. Agent-key links keep their words. The change is in `packages/cli/src/invitations.ts`, and `docs/cli.md` shows the new line. `scripts/security-entry-points.test.mjs` holds the file's new seal, because the file is an entry point, and the branch adds no route or authority.

## Evidence

The head is `5790b1ac5b501c095c1838cbfde3687c513e7731`, tree `a74f8f91`. Raw evidence is in `~/play/artroom-evidence/2026-11-01-join-used-dir/`, `SHA256SUMS` `a526122a2603daea3891e6bd5e38a6285ce391cabea6d318e3463a79b4987324`.

| Check | How taken | Command | Result | Digest |
|---|---|---|---|---|
| Gate | observed run | `npm run gate` | exit 0: 3538 plain and 1024 native tests, 116 Node and 56 Counting | `f4707bac2dc1ac86` |
| First gate | observed run, failed | `npm run gate` | exit 1: the seal of `invitations.ts`. I moved the seal into the head's one source commit | `6322666e50707e0f` |
| Second gate | observed run, failed | `npm run gate` | exit 1: "Page module differs". `invitations.ts` is in the Page's bundle. The head then merged main, which held the Page change, and a rebuilt bundle matches main's bytes | `6392f31af93cea6a` |
| Control: the old words | observed run with `scripts/control.mjs` | `controls/old-words.log` holds the output | exit 0: "a link older than the roster is refused and retained" fails by an assertion. The control ran before the seal and the bundle moved, and neither changes this file's words | `d9c99f38ab7ad490` |

## Open limits

- **The words for an attempt with another link.** No test presses that branch: the scene's directory holds a refusal.
- **The rule stands.** A used directory still needs replacing. Moving a person's attempt aside stays the person's step.
