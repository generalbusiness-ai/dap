# LA-2: Wrangler 4.163.0

LA-2 is step 2 of `notes/2026-11-18-local-artifacts-simulator.md`. The
local Artifacts simulator needs Wrangler 4.163.0. This head moves the
project's Wrangler pin from 4.147.0 to 4.163.0 and changes nothing else.

## The change

- `scripts/deploy-config.mjs:6` sets `WRANGLER` to `4.163.0`.
  `scripts/deploy.mjs` runs `npx -y wrangler@${WRANGLER}` and records that
  value in each deployment receipt.
- `scripts/deploy-check.mjs:114` expects the Wrangler session log of
  version `4.163.0`.
- The `deploy:scope` and `deploy:home` scripts in `package.json` name
  `wrangler@4.163.0`.
- The comments in `apps/room/wrangler.grow.jsonc` and
  `apps/room/wrangler.lending.jsonc` name the new pin.
- `AGENTS.md`, `docs/contribute.md`, `docs/deploy.md`,
  `docs/operate-a-service.md`, `docs/operations.md`,
  `docs/self-host-cloudflare.md` and `examples/grow/runbook.md` name the
  new pin in every command.
- The tests `scripts/deploy.test.mjs`, `scripts/deploy-check.test.mjs`
  and `packages/cli/test/demo-config.test.ts` expect the new pin.

No package depends on Wrangler: the project runs it through `npx` from a
scratch directory. So `package-lock.json` does not change.

Two files keep 4.147.0, because they record history:

- `apps/jam/deployed-source.json` records the tools of the deployed Jam
  source, with the Wrangler package hash of that deployment.
- `apps/jam/README.md:53` states the tool that deployed Jam.

## The commands in the docs

Wrangler 4.163.0, run from a scratch directory, lists each command the
docs name: `artifacts repos list` and `artifacts repos delete`,
`deployments status --json`, `versions view --json`, `rollback --message`,
`tail --format`, `deploy --keep-vars --var` and `secret put`.

`artifacts namespaces` still lists only `list` and `get`. So the sentence
in `docs/self-host-cloudflare.md:249` stays true for 4.163.0: Wrangler
cannot delete an Artifacts namespace.

## What the gate cannot show

The tests check the pin text and the receipt fields with a stand-in for
Wrangler. They do not run a deployment. The first deployment after this
head lands must run the deploy smoke check and read the Durable Object
rate (`scripts/do-rate.mjs`). That deployment shows that 4.163.0 writes
the session log that `scripts/deploy-check.mjs` reads.

## Evidence

`git grep -n 4.147.0` outside `notes/` finds only the two Jam records.

The gate ran at head `31e61679172186416f1379d3af5e187cc4156783`,
tree `6b4bff2e7d862ceef472810b128e37f632cf46b8`, with zero changed
files. START `2389a9c1` and END `a52068c4` record the run. The gate
log reports 1,929.4 seconds of wall time for the test stage.

| Check | Command | Exit | Retained output | SHA-256 |
|---|---|---:|---|---|
| Full gate | `bash scripts/gate.sh` (`npm run gate` entry point) | 0 | `~/play/artroom-evidence/2026-11-21-la2-gate/gate.txt` | `a31c49e5dfd5311fc853530a1346271ef3362beea1ee816d745605e8cc8bb36b` |

The [document-only follow-up](../../docs/evidence-filing.md#follow-up-after-a-gate)
changes this note. Source and tests match the gated tree. The review
request records the exact follow-up tree.
