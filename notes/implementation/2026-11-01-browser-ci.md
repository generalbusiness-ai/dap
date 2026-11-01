# Run the card browser script in a path-filtered workflow

Status: workflow and documents. The gate passed at `2b3c3539`. No source, test or dependency changes, so no Worker bundle changes.

Request `e0e34a180f92f17a704de4e1a22095fa0a91a7c6` and promise `9d3ca8447ff46b24cc85acde47f1a95747c61567` own this head. `packages/mcp/test/views-browser.mjs` failed for a long time because no gate runs it.

## What changed

- **`.github/workflows/views-browser.yml`.** New. It runs the script on a pull request and on a push to any branch, when a card path changes. The form follows `.github/workflows/celld-smoke.yml`: full-hash action pins, `contents: read`, and path filters.
- **`docs/testing.md`.** A new section, "Card browser script", says how a head cites the run, what replaces the rule of running the script by hand, how to move the pinned versions, and which other browser scripts the workflow's tools can run.

## Decisions

- **A push to any branch, not only to `main`.** A branch that opens no pull request still gets a run before its landing. A branch with a pull request runs twice, and I accepted that cost.
- **The tools live in `RUNNER_TEMP`.** `npm install --prefix` writes outside the checkout, so `package.json` and the lock file stay unchanged. The job compares the package's integrity value with the one in the workflow.
- **Chromium is pinned by its Playwright release.** `playwright-core` 1.63.0 names revision 1243 in its `browsers.json`, and the script asserts 1.63.0. The job fails if the installed path is not revision 1243. So a version moves only by a deliberate change to the workflow and the script.
- **The job refuses a stale generated module.** The browser loads card bytes from `packages/mcp/src/views/generated.ts`. A one-line fault in `packages/mcp/src/views/opens.ts` with no rebuild passes the script, 24 of 24. So the job rebuilds that module and fails if the bytes change. The path list therefore also watches `packages/mcp/scripts/views.mjs`.
- **The path list adds the script's support files.** `views-host.ts`, `standin.ts` and `packages/mcp/test/fixtures.ts` decide what the script sees.
- **`VIEW_CAPTURE_OUT` is `/tmp/views-browser`.** The script refuses a path outside `/tmp`, and the runner's `RUNNER_TEMP` is outside it.
- **One script runs.** The request asks the workflow to run this script, and to say which others it can run. The second table says so.
- **No artifact upload.** The log names the failing line and the words, and the script takes about 13 s to rerun locally. So the job needs one less action.
- **The control does not use `scripts/control.mjs`.** That helper runs Vitest or `node --test` tests. This script is neither, and a card fault here needs a rebuild between the edit and the run. I ran the before, the fault and the restore by hand.
- **The remote control breaks a tap target.** It fails by a named assertion in about 2 s. The earlier fault in `cardOpens` also fails, but by a locator timeout, and `docs/testing.md` treats a timeout as no evidence for a control.

## Evidence

The head is `2b3c35396c5520b3e3ee110020ed5377dc0b5ad8`, tree `a79439ea`. Raw evidence is in `2026-11-01-browser-ci`, `SHA256SUMS` `87f1d8aea86f8c2b58e2ca36076fd814ddfcf2db691a8a385ede87ef2aa919fc`.

"Linux proxy" means the workflow file's own `run:` text, parsed and run by `linux-proxy/run-steps.py` in an `ubuntu:24.04` arm64 container on Docker Desktop, as root, with Node 26.13.0 from nodejs.org. It stands in for an x86_64 `ubuntu-24.04` runner and does not run the two `uses:` steps. Its copy of the files has the head's tree hash.

| Check | How taken | Command | Result | Digest |
|---|---|---|---|---|
| Gate | observed run | `npm run gate` | exit 0: 3534 plain and 1013 native tests, 116 Node and 56 Counting | `91f4ef9a607465bc` |
| Workflow on a branch | observed GitHub Actions run 41325527216 | `git push origin builder/browser-ci-20261101` | success: 24 of 24 cases | `8a54fb5a5475f0a6` |
| Workflow on a broken card | observed GitHub Actions run 41325663435, `controls/control-card-target.patch` with the module rebuilt | `git push origin control/browser-ci-20261101` | failure in the script step: `light-592 target`, height 34.48 | `84158f2e9e68580f` |
| All run steps | Linux proxy at tree `a79439ea` | `python3 run-steps.py wf.json /work` | exit 0: `npm ci`, tools, module, script, 24 of 24 cases, Chromium 153.0.8010.12 | `1ec6c10a7bdcdcd9` |
| Tap-target control | Linux proxy at tree `a79439ea`, tree restored afterward | `git apply`, `views.mjs`, the module and script steps | module step exit 0, script step exit 1: `AssertionError: light-592 target` at `views-browser.mjs:50` | `b46799106d9802a7` |
| Historic fault | Linux proxy at tree `5875ac63`, with the same `run:` text before one comment was added to the workflow | `git apply` of `controls/control-card-opens.patch`, `views.mjs`, the module and script steps | script step exit 1 in 37.9 s: timeout at `views-browser.mjs:90`, 7 of 24 cases finished | `0a88b804d07c4986` |
| Stale module | Linux proxy at tree `5875ac63`, with the same `run:` text | the same patch with no rebuild, then the script alone, then the module step | script alone exit 0, 24 of 24. Module step exit 1 | `bba1050b945dc2d7` |
| No skip | Linux proxy at tree `a79439ea` | the script with no tools set, and the tools step with revision 9999 | both exit 1 | `49fc3f5e73515d3a` |
| Each script once, macOS | observed runs at `415fc265`, Node 26.13.0, Playwright 1.63.0, Chromium 153.0.8010.12, Mac, load 2.7 to 7.6 | `runs/run-all.sh` | second table | `0259e17281ada9dd` |
| Each script once, Linux | Linux proxy at tree `5875ac63`, with the tools that the workflow's step installed | `linux-proxy/others.sh` | second table | `6900e2e47bfb6ea9` |
| Workflow form | observed run | `rhysd/actionlint:1.7.7`, `js-yaml@4.1.0` from a scratch directory, the pin expression of `scripts/celld-smoke.test.mjs` | all exit 0. Two pins match. No `if` or `continue-on-error` key | `4c7624d9cc7c1782` |
| Documents | observed run | `node scripts/check-doc-links.mjs`, `node scripts/check-notes.mjs 415fc265 HEAD`, `node scripts/check-commit-messages.mjs 415fc265 HEAD` | all exit 0 | `859dc7512a101554` |
| Scrub | observed run of `scrub.py` over the evidence | pattern search, and long or recorder lines withheld by digest | 0 secret patterns after the scrub | `daeedf2c4b4df640` |

Times of the Linux proxy come from `run-steps.py`. It reports the module step as 0.0 s, and I do not rely on that figure.

An unquoted shell heredoc of mine started `scripts/gate.sh` by accident at `415fc265`. I stopped it by its process group after about 2 minutes. It is no evidence. Its `npm ci` replaced the worktree's copied `node_modules` from the unchanged lock file, after the macOS runs had finished. `af617097bc132dc5` records it.

### The other browser scripts

The macOS column gives the exit and the elapsed seconds of one run. The workflow runs none of these today.

| Script | Needs beyond Playwright and Chromium | macOS | Linux proxy | The workflow's tools can run it |
|---|---|---|---|---|
| `packages/mcp/test/declared-members-browser.mjs` | nothing | 0, 2.8 | 0 | yes |
| `packages/mcp/test/declared-surfaces-browser.mjs` | nothing | 0, 4.7 | 0 | yes |
| `packages/mcp/test/declared-views-browser.mjs` | nothing | 0, 6.2 | 0 | yes |
| `packages/mcp/test/grow-members-browser.mjs` | nothing | 0, 5.0 | 0 | yes |
| `packages/mcp/test/grow-views-browser.mjs` | nothing | 0, 18.4 | 0 | yes |
| `packages/mcp/test/grow-measurements-browser.mjs` | nothing | 0, 19.9 | 0 | yes |
| `packages/mcp/test/grow-routing-browser.mjs` | nothing | 0, 39.2 | 0 | yes |
| `packages/mcp/test/owned-scopes-browser.mjs` | nothing | 1, 31.8 | 1 | yes, and it fails today |
| `apps/room/page/test/no-session-screens.mjs` | `WRANGLER`, `WITNESS_DIR`, local Worker | 0, 18.0 | 0 | yes |
| `apps/room/page/test/mcp-second-device.mjs` | `WRANGLER`, `WITNESS_DIR`, local Worker, real `dap mcp` | 0, 17.4 | 0 | yes |
| `apps/room/page/test/two-devices.mjs` | `WRANGLER`, `WITNESS_DIR`, local Worker | 0, 399.3 | 0 | yes |
| `apps/room/page/test/screens.mjs` | recorder in the `scope` project, clean tree | 1, 11.9 | 1 | no: it rewrites tracked screenshots, and it fails today |
| `scripts/demo-captures.ts --recorded` | recorder in the `scope` project | 1, 78.9 | 1 | no: it makes captures, it exits 0 without its tools, and it fails today |
| `notes/2026-10-17-journey-views-design/render.mjs` | `PLAYWRIGHT_MODULE`, `CHROME_PATH`, a static server | 0, 51.5 | not run | no: a frozen design packet |
| `notes/2026-10-17-compact-cards-design/verification/accessibility.mjs` | a server on port 63462, and Chrome in `/Applications` | 1, 0.8 | not run | no: a record of a past run |
| `notes/2026-10-17-compact-cards-design/verification/browser.mjs` | `/tmp/artroom-builder-compact-cards-design-20261017`, which is gone | 1, 0.2 | not run | no: a record of a past run |
| `notes/plans/retired/027-artroom-usability/preview-qa.mjs` | `~/play/artroom-worktrees/usability-review`, which is gone | 1, 0.5 | not run | no: a record of a past run |

`apps/counter/scripts/test-browser.mjs` is not a browser script. It runs Node witnesses, and the gate's Counting stage runs it. Here it exited 0 in 2.3 s.

The gate ran at `2b3c3539`. This head then merged main at `7207db06`. That merge touches no file of this head, so the gate was not run again. The workflow's path filter ignores the note and the merge's other files, so no new run is cited.

## Open limits

- **`owned-scopes-browser.mjs` fails.** After "Open Room A", the heading "Bench grid" never appears: a 30 s timeout at line 73, on both machines. This head leaves it. The planner owns its filing.
- **`screens.mjs` cannot record.** `record.scope.test.ts:97` calls the Worker with an empty environment, and `packages/scope/src/scope-index.ts:74` then throws "Invalid value used as weak map key", on both machines. This head leaves it. The planner owns its filing.
- **`demo-captures.ts --recorded` fails, differently on each machine.** On macOS, the "Save changes" click times out at line 188. On Linux, `JSON.parse` of the record fails at line 105, and the error prints 4.3 MB of recorder text. The script's own comment says recorder output must not become a diagnostic. This head leaves it. The planner owns its filing.
- **A head's run depends on a push.** Nothing pushes a head's branch before its landing. `docs/testing.md` asks the head's author to push and cite the run. The planner owns whether a landing requires that citation.
- **The path list is narrow.** A card can also change through `packages/mcp/src` outside `views`, `packages/scope/test/fixtures.ts` or the lock file, and those do not start the job. The list follows the request. The planner owns any wider list.
- **The Chromium download has no digest.** The revision pins it, and the Playwright CDN serves it. The planner owns any stronger pin.
- **The action-pin test reads one file.** `scripts/celld-smoke.test.mjs` checks only `celld-smoke.yml`. I ran its expression on the new file once, and nothing repeats that. The builder owns extending the test.
- **The other scripts stay outside the workflow.** The second table says which can join. The planner owns that choice.
