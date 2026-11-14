# HL-1: repair the excluded harnesses

## Source checkpoint

The follow-ups start at clean HL-1 head
`0acd46c25c2918569404f22b5c153d1f0d557c48`, which includes reviewed main
`5b342ee9c484c0c653dc1a363b852be83ef1d77b`. Requests `8fd9ffe0`,
`37aabf14`, and `4734b15a` follow ruling `bddcc124`.
Promises `cbfd7a38`, `e834dbb7`, and `63bc8f36` cover the three requests.
This checkpoint contains source changes only. CUT-A holds the executable
slot, so no test, compiler, build, generation, installation, or deployment
ran.

The [original HL-1 note](2026-11-13-hl1-unrun-tests.md) retains the earlier
failed runs and the exclusions at that head. Those results do not validate
this follow-up.

## Views process startup

The two-process fixture wrote `register: {scope: "sc_test", genesis: ...}`
because its stand-in has no register. The production `fileStore.config`
reader rejects that invalid scope ID before `apps/views/src/node.ts` starts
stdio. The app only needs the existing room, signer, and explicit Brief.
Its config now omits the unused optional register.

The harness also rejects pending requests when a child exits or its input
pipe fails. It clears their timers and keeps at most 4 KiB of stderr.
An early startup failure no longer waits for each 30-second request
deadline. The three existing cases still exercise two real app processes
over one real file-store home. Their loopback service remains a stand-in
that supplies scripted answers and proves no native scope judgment.
The file now belongs to the gate's Node stage.

No production MCP transport, session, custody, or lifecycle source changes.

## Retire the unused demo creation path

Planner ruling `47c57403` answers request `39a9f638`: delete
`scripts/demo-git-host.mjs` and `scripts/demo-git-host.test.mjs`, without a
repair, Node-stage entry, or loader. The CLI's `dap install --plan`,
`dap install --planned`, and `dap create` supply the supported path.

Before deletion, `git grep -n 'demo-git-host' HEAD` ran at
`2f2afca7e01c81c8f104c2437d921df77d47f602`. Its matches named the script,
its test, the frozen version-question fixture, historical notes, and the
stale exclusion in `scripts/test.mjs`. No active caller appeared.
A broader search also looked for `buildCreation` and `postCreation`:

```sh
git grep -n -E 'demo-git-host|buildCreation|postCreation' HEAD -- \
  ':!scripts/demo-git-host.mjs' ':!scripts/demo-git-host.test.mjs' \
  ':!packages/platform/test/fixtures/version-questions-86179b0c.json' \
  ':!notes/**'
```

That search returned only the stale exclusion, which calls nothing. Both
paths and the exclusion are now deleted. Deleting the whole test also
removes the scoped loader and modern fixture drafted at `2f2afca7`. No
demo test enters the Node inventory, and no replacement loader remains.
The frozen fixture and the historical notes stay unchanged.

The deletion delivers promise `e834dbb7` under ruling `47c57403`. It makes
no claim about a repaired demo or a new executable result.

## Unused browser modules

Request `4734b15a` removes the Counter and lending
`browser/storage.browser.test.ts` modules. Each exported a browser witness
object, declared no test cases, and had no committed caller. The source
search still finds no caller outside the modules. The deleted files remain
in Git history.

Their two exclusions are gone, and the lending README no longer calls its
module a browser-storage test. The frozen version-question fixture stays
unchanged. Its test reads pinned predicates and answers, not the existence
of the old source paths. If a later check finds a contrary dependency, ask
the planner before changing the fixture.

## Evidence still owed

After root grants a slot, run these targeted checks once:

- The views two-process file under plain `node --test` with
  `ARTROOM_TEST_PHASE=node`.
- The runner, phase, and selection tests for the changed Node inventory.
- The platform version-question test against the unchanged frozen fixture.
- The changed documentation checks and the HL-1 gate before review.

Record actual power, raw output, exact source head, and outcomes. The
earlier passing inventory check does not cover this changed source.
