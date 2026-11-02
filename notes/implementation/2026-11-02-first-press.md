# A first diff press reads fresh authority without unrelated discovery

## What changed

Request `368ddc87b427d663ff33feae540bced001b733e1` and promise
`097c35b0817ec94c25e01fe2adcc338c77da2475` own this head. The implementation began at
`7b691a39b756df584bbeaa1d73a1730dec509b4b`. The production repair freezes source
at `3e2c000b984de22cc5f7ce0a896b097a73a4055a`, tree
`810bbbd630fe95d2bbfbc3280067464b20cbf55f`.
The isolated test repair is `2f825e324073a692c6a0eab85da3d79686f04866`,
tree `511ff0efec1037c34547fa5433d2f68d355a5185`. It adds only three lines to
the unimported plain member-display stand-in. Production and shared inputs
remain byte-identical to `3e2c000b`. The review head adds only this note and its manifest after the isolated test
repair.

A first **View diff** press now makes four requests before its signed act.
It reads Membership, Directory, and Rules together, then reads the actual target.
It reuses the completed read session that opening the card obtained. It skips
unrelated scope pins and definitions. Each press still checks fresh standing,
the target and definition, the captured view, and custody before signing.

Three matching new-process orders made 12 requests before the act before this
change and four afterward. Each pair used the same scripted order:

- First press after opening: 4,497.4 ms before the act became 699.1 ms.
  The whole tool call changed from 7,551 ms to 3,366 ms.
- Another first press after opening: 1,779.5 ms became 308.1 ms.
  The whole call changed from 2,932 ms to 1,540 ms.
- First press after an item-page read: 1,336.2 ms became 288.3 ms.
  The whole call changed from 2,409 ms to 1,096 ms.

Received reply bytes before the act changed from 83,661 each to 15,474 each.
These observations support the request reduction. They do not promise those
times on another run.

A second **Interdiff from Version 2** press in one process changed from six
requests and 731.7 ms before the act to four and 333.5 ms. Its whole call
changed from 2,175 to 1,516 ms. The opening and item-page reads precede these
measurements and do not count toward pre-act time.

## The decisions and why

[Reads](../../packages/mcp/src/reads.ts) keeps a bounded `ReadSessions` cache
of completed credentials. A cache identity contains the service, signing key,
and the membership's scope, incarnation, and kind. Reuse checks the returned
claims and the existing ten-second renewal margin. The cache holds at most
64 identities. Eviction asks for a new session. It cannot grant an act.

Each `Reads` instance keeps its own pending requests and refusal cooldown.
Concurrent reads through that instance share one issuance. Different bounded
collections share only completed credentials. They keep their own fetch,
route admission, counters, and deadline. A closed collection's transport cannot
serve a later collection. A failed collection cannot impose its cooldown on
that later collection. `forget` invalidates both completed state and late
in-flight replies. The existing signed-read fallback and projection refusal
behavior remain. A member display also keeps its early rejection of a known
foreign incarnation. Session history records which scopes and exact memberships
this reader held; it grants no authority and exposes no credential. A known
incarnation mismatch returns before a new session request. The unchanged Native
owner checks that no request occurs. Removing this guard reproduces the original
request-count failure.

[The local service](../../apps/views/src/node.ts) supplies one cache to the
adapter and MCP service. It writes no token to disk. It shares no mutable
Membership, Directory, Rules, target summary, or view result.

[Inventory](../../packages/mcp/src/inventory.ts) starts the three independent
authority summaries together. A cold process still obtains one session before
those reads. An optional exact target limits the later discovery of scope pins
and definitions. It does not omit the fresh room authority reads. Ordinary
catalogues and generic or named acts retain full discovery.

[The exact-read path](../../packages/mcp/src/service.ts) derives a private
`Snapshot` for that attempt. It does not replace the ordinary catalogue cache,
clear its stale flag, or emit a partial list generation. The normal target,
definition, action policy, captured-view admission, signing, custody, original
request, and Native submission paths still run. A Native witness removes the
read-token grant after opening the card. Its press signs no act despite the
retained read session.

The ensuing credential read uses the same attempt's context while its
configuration digest still matches. Each poll checks configuration again. A
changed configuration takes the ordinary current-context path. Entry and signer
checks, the bounded mint search, and the one-time credential route still run.
This avoids moving the discarded discovery work after the act. The context
never authorizes another press.

The Native owning test also carries companion `9abee3a0`: `view_needs_you`
shows the actual opening entry's signer with **Opening act signed by**, across
person, agent, and checker rows. Each viewer and later writer differs from that
opening signer. The existing unknown-signer fallback remains. This companion
adds no second request basis to the primary promise. Work uses the same
`RepoInAi.#rows` and `Collection.openingSigner` path. This question-approval
fixture has no agent commitments, so it supplies no separate Native Work row.

Ruling `e9c812f9` requires a Card workflow citation when service admission
changes. The workflow now includes `packages/mcp/src/service.ts` in both path
filters. Its filters already include `actor-cards.ts` and
`change-view.scope.test.ts`. The testing guide now names all three citation
owners. Reviewed source seals cover the changed service import and class and
the inventory's parallel reads and target selection. Routes and gate classes
remain unchanged.

## The final evidence

The [evidence manifest](evidence/2026-11-02-first-press.manifest.json) records 252 files in 10 readonly units. Its SHA-256 is `db87f4f3e6e385603c4fd17c2d77e3ced383a43e6b657252ed89f827e76dbee0`. Each unit names its own checkpoint and qualification; draft focused work does not stand in for the frozen source proof. Whole raw Native and CI logs stay private, with bytes, hashes and safe terminal extracts in the listed units. Keep every unit for at least 30 days after landing.

The observed runs used one shared Mac, the same local stdio driver and logger,
the enrolled agent-a witness, and isolated custody that starts fresh per phase.
Each case starts a new process. Cases in a phase share that isolated directory.
The planner reported
that dap-demo ran source `f277867f` throughout. The benchmark copied only the
allowed config and its selected key, then verified both original hashes stayed
unchanged. It read no original custody, session cache, other identity, or J4
private directory. Each phase made four accepted read-token acts: three first
presses and one second interdiff. No business-state edit formed part of the
measurement. The logger records an accepted answer but does not recover the
nested receipt's entry sequence. Its null `actSeq` is no observed entry number.

Before ran first, then after. Network and backend warm state can vary. The after
runs overlapped gate startup. They were not randomized paired trials. In each
after trace, all three authority requests started before any of them finished.
The before traces account for the extra unrelated summaries, the twice-refused
scope read, and the 52,048-byte retained definition. The original historical
runs and the unexplained later 2.8 seconds remain in
[the earlier press note](2026-11-01-card-press.md). This head makes no claim
about that unexplained time.

The timing script measures pre-act wall time from writing `tools/call` to the
fetch dispatch of the act. The sum of individual request times is a separate
sum. It overlaps after this change. To regenerate the public counts and timing
comparison without touching private identities or sealed output, run
`python3 /Users/hughpyle/play/artroom-evidence/2026-11-02-first-press-after-2/summarize.py --report`.
The script checks its computed records against the retained comparison.

Draft focused runs preceded the frozen commit. They support implementation
work, while the frozen gate owns final-source acceptance. An initial Native
run failed because a test's grant restoration reused its idempotency key.
An early stand-in fixture omitted `diffAvailable` and two new cases failed.
The source-seal check initially reported the changed inventory hash. The fixes
retain those failures and their actual exits. They do not turn them into passes.

The first frozen gate at `7b691a39` ended with exit 1. Its only failure was the
Native member-display assertion: a foreign incarnation returned no data but
made one extra session POST. The repair changes production code and keeps that
entire test file unchanged. Its whole owner passes, and the named guard control
fails the original assertion when the guard is removed. This production change
requires a new full gate at `3e2c000b`; it does not use the isolated test-file
follow-up exception.

That second gate also ended with exit 1: its plain member-display stand-in
lacked the new history method. The original sequencing case waited for its
query gate and reached its unchanged 60-second deadline; Vitest also reported
the missing-method rejection. Native was unreached.

The isolated `2f825e32` repair adds an empty-history `hasHeld` and `held` to
that explicit stand-in. Removing exactly its comment and two methods reproduces
the old file bytes. All four original cases, assertions, and deadlines remain.
No other file imports it. The changed compiler and whole owning file pass.
Under the documented isolated repair rule, the follow-up then runs only the
unreached Native stage. That stage exits 0: 1,029 cases pass and two skip;
271 files pass and one skips. The aggregate follow-up exits 0, and its source
guards match exactly at 2f825e32. Both full gates remain failures. A passing
follow-up does not change either exit.

The initial after-runs at `7b691a39` also used four requests, taking
564.6 / 400.9 / 348.9 ms before the first act. The final repaired source has its
own new-process after-unit and the measurements at the start of this note.
Both units retain their exact traces; no later run overwrites an earlier one.

| Check | Command or retained driver | Actual result | Output SHA-256 |
|---|---|---|---|
| Current before presses | baseline/press.mjs; commands in steps and setup metadata | four accepted reads; three first presses use 12 requests | 63b9c2cc640b38feb7786a8b5a9b8be4f3136fdf8276325d6a43a147c5e07ea2 |
| After presses and comparison | after-2/press.mjs; after-2/summarize.py --report | four accepted reads; each uses four requests; authority reads overlap | 5523794cc0f069884bffa5888fe5dd89ad3129e67d44a3a770e941311102968e |
| Comparison regeneration | after-2/summarize.py --report | exit 0 | 12cfe563f557d50de129a548f7929baee6e487ddec51f5cc29c3604c6a65327d |
| Cache and context owners | vitest run --project mcp packages/mcp/test/reads.test.ts packages/mcp/test/first-press.test.ts | exit 0; eight cases pass | fc3289d96a9fd03dae53e33389fc0530672d060bf37880bee0701923939a8265 |
| Existing budgets | vitest run --project mcp; exact selection in focused/commands.json | budget owner passes; the same draft run records the two fixture failures | a60f71d43ef5acaa54bd7c797701f31165ba0163b5243df05b00d863d133fdd1 |
| Application owner | node --test apps/views/test/s4.test.mjs | exit 0 | 1074326acc1634348ca38b9c00abf6429d4c90130d07900e1c62998b258796be |
| Reviewed source seals | node --test scripts/security-entry-points.test.mjs | exit 0; ten cases pass | fbbb854b8f67fc56686dccf5ee74c74de2c126e25553f7af67ecc0765a07acb9 |
| Native press and signer focus | vitest run --project scope packages/mcp/test/change-view.scope.test.ts -t 'witness 4:|signed entries and receipts' | exit 0; two cases pass, eighteen skip by selection | 0f23980aa9bb6be1f75eeea37f5959d574869308d1b963cee8137b7c9e2e98b9 |
| Late-reply control | scripts/control.mjs; focused/commands.json names the single mutation | exit 0; the named test fails by assertion with the guard removed | 016a280595e9b5ef37c06a2619517d0db772f53947b4e5ddb163b429d148f3a9 |
| Partial-catalogue control | scripts/control.mjs; focused/commands.json names the single mutation | exit 0; the named test fails by assertion when the context replaces the catalogue | b769a14fd724c9e3335105350e3d0605e83505b564df34352ce6d0e6f29871c2 |
| Configuration control | scripts/control.mjs; focused/commands.json names the single mutation | exit 0; the named test fails by assertion when credential reuse ignores configuration | dcf50cd97560c4c54b287dca3251a23777d1cf9eb9c35d4f7cbb19e3c1622309 |
| First frozen gate | npm run gate at 7b691a39 | exit 1; sole Native member-display request-count failure | 0b748980c841cbfef582d5ce2a6bef06bb16cad8618ab377a16c0541ed4310f8 |
| Unchanged Native owner after repair | vitest run --project scope packages/mcp/test/declared-members.scope.test.ts | exit 0; the whole one-case file passes | 8af81271d03adc2b5ad52720bdbc71ad2219e24151880bec05add253f4dd252c |
| Known-incarnation control | scripts/control.mjs; foreign-context-fix/control-command.json | exit 0; removing the guard fails the original zero-request assertion | 15cce31af10eddb6abe8501ebbb9c64bcc6e2a829256c11c33e63c00d930dc6c |
| Repaired-source gate | npm run gate at 3e2c000b | exit 1; 3,564 plain passes, one stand-in timeout, one skip; Native unreached | ff3b334716bee421e5ed778b2bd95eff71537ec8cd2617b63739f9d603bb8c97 |
| Isolated-repair scope | followup/scope-proof.json | only one unimported test changes; all other test bytes and production inputs match | 5ee97bb89f9c369464a16eec86d9225a399e51daf0d79081e15b235498eebbe3 |
| Changed compiler and whole owner | tsc -p packages/mcp/tsconfig.test.json; vitest run --project mcp packages/mcp/test/declared-members.test.ts | both exit 0; all four owning cases pass | fe245dfe779e2a4047ea49ad05d15ba9161a3ca2aa99ea910211eadeef250dc3 |
| Sole unreached Native stage | node node_modules/vitest/vitest.mjs run --config vitest.native.config.ts | exit 0; 1,029 cases pass and two skip; aggregate followup.exit 0; source unchanged | 2f2e1c9f27d75de601b8fab3bd8272033d8e1d577717592a17216e323a592d8d |
| Card workflow | gh run view 41424913952 | success at exact 3e2c000b; generated module and both browser scripts pass | 3d30f5278ea859da06d9b39d28e6c7e66fb592ea578684c9ab05d6c3809b11de |

[Card workflow 41424913952](https://github.com/generalbusiness-ai/dap/actions/runs/41424913952)
runs at the final repaired source checkpoint. The earlier workflow
[41421693434](https://github.com/generalbusiness-ai/dap/actions/runs/41421693434)
succeeded at the initial source. All product, workflow and browser inputs remain byte-identical through the isolated test repair and the later note/manifest commits. The only test change after 3e2c000b is the unimported plain stand-in; the Card workflow does not select it.

## The open limits

- **Other first acts.** `368ddc87` owns this optimization. The measured path is
  the existing exact Git read. Generic and ordinary card mutations still use
  full inventory. This head does not claim the same request count for them.
- **Host latency.** `368ddc87` has observed Mac stdio evidence and the Card
  workflow. It has no new person-operated Desktop timing. The planner owns
  the remaining Desktop session under `1a44`; the earlier press note states
  what that session owes.
- **Card refresh.** `76a1c020` owns the refresh that can close Read points.
  This head does not change rendering or the refresh interval.
- **Diff content and design.** `e4d0cfed` owns cut-short diffs. `353a0ec0`
  delivered the design renders, and Hugh's decision still precedes product
  diff implementation. This head changes neither the renderer nor truncation.
- **Deployment.** The planner deploys. These local composition changes take
  effect when the local stdio process runs the new source. The planner last reported all Workers at f277867f with hosted MCP closed. This record establishes no new deployment.
