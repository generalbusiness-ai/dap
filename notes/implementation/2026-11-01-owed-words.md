# State the founder facts and the owed words

Status: documents only. No source changes, and no gate ran at this head. No host, account or room was touched.

Request `33732795efce1bd2ff75ea4b78f52ea092bddb39` and promise `43a4805ea71509dc6edb0b20a059bdf59ac3601c` own this head, from the planner's decision `cccd205a` and the result of real call 1 in `a83f1a22`.

## What changed

- **`docs/deploy.md` and `docs/cli.md`.** Under policy `keys`, `dap claim` reads the summary first, so a key with no entry at the register in 900 seconds gets `forbidden`.
- **`docs/cli.md`.** The example of `dap install` now prints the word that the command prints.
- **`docs/security/trust-boundaries.md`.** A session of a room that a thief made reads the register's whole log, and the page says what that log holds. "Respond to a stolen key" gains the operator's REST step on Artifacts, and says what has run.
- **The two design notes.** Their status lines carry the rulings in `cccd205a`. The token note gains real call 1, labelled as the planner's run. The founder note takes the checker's words.
- **The implementation notes.** `signed-read-refusal` gives the right reason, `hosted-loop` states the script's structure, `settle-followups` says who armed the alarm, and `founder-recovery` drops the pending opt-in.

## Decisions

- **The word is "creator key", and the doc changes.** Hugh ruled on 15 October that "found" becomes "create". `0a0c1f9c` changed the printed line and `docs/cli.md:71`, and it missed the example at line 78. `d5e321cd` changed the test ([that note](2026-10-16-create-outbox-terminology.md)).
- **"No trace" says where.** A signed read writes no journal entry, and a metric point counts it with no key (`packages/scope/src/signed-reads.ts:359`). So the founder note says "no trace in the journal".
- **The ID's check keeps its limit.** `call1.py` tests the whole ID as a substring, and it tests the common prefix. So the token note states those two results, and it does not say that no part of the ID is in the secret.
- **The revocation route is the namespace's.** The docs use `DELETE /artifacts/namespaces/:namespace/tokens/:id`, as the REST row of the token note quotes it. The planner's `cf artifacts namespaces tokens revoke` names no repository either.

## Evidence

The checkpoint is `097af94542753d55cb0ea914f0ca4c25c7ca6a03`, tree `3679516b`. Raw evidence is in `~/play/artroom-evidence/2026-11-01-owed-words/`, `SHA256SUMS` `45536ecdc69edca3c4405d5148a0e5eafd94e13b3a8c471b8db2b10dd0152d0f`. The reviewed head adds only this note and its manifest. Each digest is the first 16 hex digits of the sha256 of the named log.

| Check | Command | Exit | Digest |
|---|---|---|---|
| Links | `node scripts/check-doc-links.mjs` | 0 | `1ef321dc4eca55b9` |
| Notes | `node scripts/check-notes.mjs main HEAD` | 0 | `35f5140f008ef3bf` |
| Commit messages | `node scripts/check-commit-messages.mjs main HEAD` | 0 | `e961aa82d898e342` |
| Section citations | `node scripts/check-section-citations.mjs --report section-citations.json` | 0 | `0d64b6e55be92a54` |
| Whitespace | `git diff --check main HEAD` | 0 | `e3b0c44298fc1c14` |
| No source path changed | `git diff --quiet main HEAD -- packages apps scripts examples homepage skills brand` | 0 | No output |

## Open limits

Request `33732795` owns each limit until the planner assigns it.

- **"Founder key" in the docs.** `docs/deploy.md`, `docs/cli.md`, `docs/security/trust-boundaries.md` and `apps/room/docs/roles-and-membership.md` still say "founder key", a word that the October ruling replaced in prose. This head leaves them.
- **Words about a real run.** Nobody has listed a repository's tokens through the REST route. Real calls 2 and 3 have not run.
- **Read, not run.** Each sentence about the code comes from reading it. I did not read Cloudflare's pages, so the routes rest on the token note's quotations and the planner's run.
