# Join a second device from the command line

Status: source implementation. The gate passed at `5718e09c`. The scene ran on the deployed Worker `dap-demo`, with two homes on one Mac in place of two machines. The commands are the change, and no route, definition or Worker behaviour changes. The Worker bundle's bytes change, because the rebuilt `apps/room/page/assets.ts` differs at the same size.

Request `c74280a46e95ee7fa442e02650c9777a077028c4` and promise `de98530cd4f7ed57fccaa20d2a79983efee02720` own this head.

## What changed

A person with a room on one device can now make a device link there and join with it on a second machine that has `dap`. Before this head, only the page made or redeemed a device link, so a second key could not live under the command line or the views.

- **`dap invite <@member> --device [--hours 24]`.** `inviteDevice` in `packages/cli/src/commands.ts` signs membership's `invite-key` with kind `device` and prints an `artroom-device-key:` link. It reads the member, the role and the link's form before it signs.
- **`dap join <link>` with a device link.** `join` dispatches to `enrolDeviceKey`. `dap join <link> --check` reads the outcome and sends nothing.
- **`packages/cli/src/invitations.ts`.** `enrolKey` takes a third kind, `device`, with the retained tag `device-enrol`. `deviceBindings` and `inboxOfMember` are new. Person and agent issuance and the agent and checker receivers keep their behaviour. The one shared line that changes is the pin check, where `isAgentKeyMembership` now guards all three kinds.
- **`packages/cli/src/store.ts`, `line.ts`.** The new tag, the `--device` switch and the usage lines.
- **`docs/cli.md`, `docs/mcp.md`.** The commands, and two `(local command)` rows in the W1 inventory.
- **`scripts/security-entry-points.test.mjs`.** New seals for `commands.ts:$module`, `commands.ts:join`, `store.ts`, `line.ts` and `invitations.ts`, and a new row for `commands.ts:inviteDevice`. Each value comes from that test's failure output.
- **`apps/room/page/assets.ts`.** Rebuilt, because the page imports `issueInvitation` from `invitations.ts`. The page's own source does not change. `page.js` keeps its size, 2375 bytes of the module differ, and the built `dist/page.js` holds neither `device-enrol` nor the new join text.
- **`packages/cli/test/device-key.scope.test.ts`.** Five new tests.

## Decisions

- **A flag on `dap invite`, not a new command.** Only the page made a link. A person whose first device is the command line has no page key, and the page's route to one, "Join with a config and key", copies the key that this request exists to avoid copying. The flag reuses the page's act, its link format and its 24-hour default.
- **No retained original for the link.** `dap invite --device` behaves as plain `dap invite` does. After a lost answer the person makes another link, and the unused invitation lapses at `inviteEnds`.
- **The receiver extends `enrolKey`.** A second copy of the key, envelope and settlement code would be a second place to get custody wrong. Only the checks after acceptance differ, because a device link names no member fact and no new inbox.
- **The pending enrolment clears when the join finishes.** The agent path keeps `config.join`. `issueRetainedInvitation` refuses a config that holds `join`, so keeping it would break `dap invite --keep` on the second device. A person's join clears it too. A repeated `dap join` then answers "has a repository already" with exit 2.
- **The receiver finds the inbox by reading.** No entry sets a member's inbox reference. `seat` and `add-member` create the inbox at the member's entry, and a person's `join` creates it at that key's entry. `inboxOfMember` reads those entries, then checks the inbox's birth and owner with the existing `inboxOfOpening`.
- **Pins with a known directory pair only.** The device link's codec admits every invitation membership. `dap join` and `dap invite --device` accept the `isAgentKeyMembership` list, which leaves out `platform:membership@1`, because `boundDirectory` has no pair for that pin.
- **Any active member, as on the page.** `dap invite --device` names a handle, and the room decides who may sign. By default that is an admin. A member without `membership.invite` gets a local refusal that names the admin's command, and nothing is signed.
- **The MCP `join` tool stays as it is.** The request names `dap join`. The inventory marks both commands `(local command)`.

## Evidence

The head is `5718e09cc1d49fa9f7470ed8f38af2b3a6e26bbe`, tree `8355f42f`. Raw evidence is in `2026-11-01-join-device`, `SHA256SUMS` `7e74eb37d2ad0106eb619c6eae48eb2b0c37ac4ed278a94ca0dbf07591f94922`.

The gate ran at `5718e09c`. Every other row ran at the source commit `c6b4e588`, before this head merged main at `7207db06`. That merge had conflicts in `line.ts`, the recipes test, the seals and the page module. The first gate after the merge, in `gate-failed-1`, stopped at the whitespace step on a blank line at the end of `device-key.scope.test.ts`, and commit `5718e09c` removes that line, `2a06713d8c2fb7ab`. After this gate, the head merged main at `89e59c12`. That merge touches no file of this head, so the gate was not run again.

| Check | How taken | Command | Result | Digest |
|---|---|---|---|---|
| Gate | observed run | `npm run gate` | exit 0: 3535 plain and 1022 native tests, 116 Node and 56 Counting | `fd7ef44ecf5b386f` |
| The scene on the deployed Worker | observed run at 11:27 EST on `dap-demo`, version `f171fce3`, Register 17 and Membership 8, with the commands of the source commit. A new TEST room. Two homes on one Mac stand for two machines | `node --import tsx deployed/deployed.mjs` | `dap invite @ana --device` and `dap join` exit 0. Both homes hold the same room and inbox. `acts`, `status` and `log` answer on the second home. An `open-issue` act carries the second key `key_-z0Gr4Ek...`. A second `dap join` of the link exits 2 and changes nothing. `view_needs_you` answers `empty` with no error | `874824ca632f4c09` |
| New test fails on main's source | observed run: this head's test with `packages/cli/src` reversed to `415fc265`, restored afterward | `npx vitest run --project scope packages/cli/test/device-key.scope.test.ts` | exit 1: 5 of 5 fail by assertion | `c0dceac34873a62c` |
| New test and neighbours | observed run | `npx vitest run --project scope` on `device-key`, `join`, `agent-key`, `story` and `recipes` | exit 0: 17 passed | `da51e5bc7cb86ee2` |
| Command line's Node tests | observed run | `npx vitest run --project cli` | exit 0: 176 passed | `b72be2d5c458885a` |
| W1 inventory | observed run | `npx vitest run --project mcp packages/mcp/test/inventory.test.ts` | exit 0: 5 passed | `8d6695cbb0826da6` |
| Page module and join | observed run | `npx vitest run --project page` on `assets` and `join` | exit 0: 3 passed | `78bb06a7e5394990` |
| Link codec | observed run | `npx vitest run --project client packages/client/test/device-key-invitation.test.ts` | exit 0: 1 passed | `6dda601447798dba` |
| Security seals | observed run | `node --test scripts/security-entry-points.test.mjs` | exit 0: 10 passed | `89d62e8fc68e6ca6` |
| Control: `join` dispatch removed | observed run with `scripts/control.mjs`, source clean afterward | `controls-head/join-dispatch.log` holds the command's output | distinguishes: 5 tests fail | `5a8f304f6d8b7bcb` |
| Control: handle binding removed | the same | `controls-head/handle-binding.log` | distinguishes: the relabelled link's test fails | `a1c394478d7cfe53` |
| Control: inbox read from the member's entry only | the same | `controls-head/inbox-of-join.log` | distinguishes: the joined member's test fails | `f0cd1987535bb456` |
| Control: pending enrolment kept | the same | `controls-head/pending-cleared.log` | distinguishes: 2 tests fail | `c984e11af76f0057` |
| Control: invitation of kind `agent` | the same | `controls-head/device-kind.log` | distinguishes: 4 tests fail: the page-made link still passes | `dcc4b230fdd7cdc4` |
| Control: `--check` dispatch removed | the same | `controls-head/check-mode.log` | distinguishes: the lost reply's test fails | `34a4f96fe24f6d1f` |
| Scene | observed run on real processes, with the stand-ins below | `probe/run.sh scene-head 8974` | exit 0 at the tree of `c6b4e588` | `a19aced303364d41` |
| Scene commands | the same run: each command's wall time from the witness, including Node's start | `scene-head/dap.log`, links scrubbed | `invite --device` 1158 ms, `join` 1118 ms. The link is 1173 bytes | `78e368beaf5da4ff` |

The scene ran `wrangler dev` on `apps/room/celld` with real scopes and read sessions, on the `commons` cohort, `platform:membership@9`. It ran `dap` as a child process for each home, `apps/views/src/node.ts` over stdio on the second home, and a real Chromium with the card bundle in a sandboxed iframe.

Four things stand in. The local Worker stands for a deployed Worker. Two `DAP_HOME` directories on one Mac stand for two machines. The witness process passes the link in memory where a person would use a private message. The witness is the host in place of a desktop AI app.

The scene showed these results:

- Ana founded the room on the first home with the command line alone, ran `dap invite @ana --device`, and ran `dap join` on the second home.
- Membership lists two active `device` keys for `@ana`. The second home holds the same room references and inbox as the first, under another key.
- No file in the second home and no membership entry holds the invitation's credential. The first home does not hold the second key. `config.json`, the key and the private request are mode 600.
- On the second home, `dap acts`, `dap log inbox`, `dap status`, `dap remote` and `dap mcp` with `inspect` answered. An `open-issue` act carries the second key as its actor, and `dap issues` on the first home lists that issue.
- On the second home, `needs_you` listed Vic's request, and Ana pressed Approve in the card. The lane's `approve` entry carries the second key as its actor.
- `dap invite @vic --device` by `@vic` exited 1 and signed nothing. An admin's link, made on Ana's second home, joined Vic's second home with Vic's existing inbox.
- A link made before a `set-actions` act exited 1 with `revision-moved`, and that home saved no repository.

The first scene run, `scene-1`, and the first control and red runs, `controls/` and `red-on-main-source.txt`, were taken before the final amend. They stay in the directory, and this table does not cite them. `probe/run.sh` now ends without its cleanup line, which ran during `scene-head`. That line touched only the run's scratch directory.

## Open limits

- **A second machine and a needs-you row on the deployed Worker.** Two homes on one Mac stood for two machines, and `view_needs_you` on the deployed room answered `empty`, because nothing there needed that person. The local scene showed a row and an approval under the second key. J5's deployed run can cover both: the planner owns asking for it.
- **A refused link holds its config directory.** After `revision-moved`, a new link needs another empty config directory. The command says so. Any act that moves the roster or that member's revision refuses a waiting link. Another member's join and another key's enrolment do not. No request owns a replacement in the same directory, and the main builder decides whether to file one.
- **The page's hint.** The Devices screen tells a person to open "Join with an invitation". It does not mention `dap join`. The builder asks the planner whether to file that page change.
- **The MCP `join` tool.** It refuses a device link. The builder asks the planner whether to file that.
- **A link from the command line on the Page.** No run in this table redeems a link made by `dap invite --device` on the Page. The J5 deployed run `756bb8b9` does that, and the builder reports it there.
- **Three faults near this change.** `dap join --check` prints a usage line that names only agent-key links. A lost reply in agent and checker enrolment prints "unavailable or unverified". `docs/mcp.md` says a handle may hold dots and underscores, and `isHandle` refuses them. This head leaves them, and the builder owns each at the next edit of that code.
- **Desktop AI app.** No run shows the views under a desktop AI app on a device-link key. The J2 acceptance `2082efd9` owns the desktop app.
