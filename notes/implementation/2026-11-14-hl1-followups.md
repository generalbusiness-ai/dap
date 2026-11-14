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

## Demo loader and pending receipt guard

The plain Node stage cannot strip TypeScript parameter properties in the
demo's client dependency graph. The owning test now loads that graph with
the checkout's pinned `tsx/esm/api` loader and passes an explicit resolved
`tsx` import to its CLI children. The gate needs no global loader or new
dependency.

The retained version 1 custody fixture still reopens its original bytes.
Its scripted accepted receipt now uses `{scope, genesis}`, sequence zero,
and a hash equal to that genesis. This modernizes the fixture without
claiming that a real register accepted the install.

The production demo helper still requires `fact.at.kind === "register"`
after `isFactRef(fact)`. Modern exact scope references have no `kind`, so
both conditions cannot hold. `postCreation` has the same obsolete check on
the signed target. Planner request `39a9f638` asks for the exact guard
replacement before production edits. The demo test's exclusion remains
until that repair. Its loader and modern fixture alone do not fix the
successful creation case.

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
- The demo Git host file under the same command after the receipt ruling
  and repair. It must pass without a caller-supplied `--import` flag.
- The runner, phase, and selection tests for the changed Node inventory.
- The platform version-question test against the unchanged frozen fixture.
- The changed documentation checks and the HL-1 gate before review.

Record actual power, raw output, exact source head, and outcomes. The
earlier passing inventory check does not cover this changed source.
