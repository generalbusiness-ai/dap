# Accept one extra terminal receive-pack flush

Request `662dbc1f`, under promise `a612b9ea`, asks the parser to accept the
reply recorded in the [mini diagnosis](2026-11-02-g3-receive-pack-diagnosis.md).
`SmartHttpGit.send` now accepts its ordinary unpack status, exact own-ref
status, and terminal flush, followed by at most one additional flush.
The packet decoder still consumes the complete bounded body. A truncated
packet or trailing data cannot become an accepted reply.

## The boundary and its controls

The positive fixture uses the diagnosis's public layout: packets of 14
and 54 bytes, then flushes at offsets 68 and 72, for 76 bytes. It builds
synthetic ASCII with a different 46-byte ref. It reads no private provider
bytes and sends no request to GitHub.

The owning file retains its real local Git cases. Its new parser case
uses an explicit HTTP stand-in and confirms that a complete own answer
still needs the exact read-back. A different read-back stays unknown.
The named refusal cases cover two extra flushes, trailing data, a missing
flush, a wrong ref, a status for another ref, and an extra unpack line.
The foreign-ref status case uses one terminal flush, so the four-record
length alone cannot protect it.

Two controls distinguish the required rules. Restoring the three-record
limit makes the observed-layout positive fail. Removing the interior flush
check makes the foreign-ref status falsely succeed. Each helper restores
the source after its assertion failure. Neither control sends a provider
write.

## The deployments that use this parser

The shared GitHub wiring constructs `GitHubProvider` for `DestinationHost`.
`GitHubProvider.send` calls `sendOnce`, which calls this `SmartHttpGit.send`.
`sendOnce` still requires its own successful report and an exact commit
read-back before it returns accepted. Those caller bytes are unchanged.

Cloudflare Workers configured for GitHub publication and the maintained
celld host use this shared path. A mini-only deployment therefore does not
update the parser in a hosted Worker. The planner chooses and runs each
deployment after the head lands.

## Evidence and remaining work

The sealed [focused manifest](evidence/2026-11-03-receive-pack-flush-focused.manifest.json)
has SHA-256 `a24019a53639190e07587752f7490ef1300de8bbb62b45b6f94c28e7937e3775`.
It records nine public files and the digests of eight private output files.
Each run names its actual incremental checkpoint and dirty paths.

| Check | Result | Record |
|---|---|---|
| Owning Git compiler | Exit 0 | `01-git-owning-compiler.json` |
| Initial whole HTTP owner | Nine cases pass | `02-receive-pack-owner.json` |
| Observed-layout control | Final nine-case baseline passes; one assertion fails with the old limit; source restored | `03-extra-flush-positive-control.json` |
| Foreign-ref control | Final nine-case baseline passes; one assertion fails without the interior flush check; source restored | `04-extra-status-refusal-control.json` |

The frozen full gate at `cc6c1c158052163e7183da5af3d89ca5dde5a577`,
tree `1536e4931261b625240cc6293695b1377542bf69`, exits 1 after
1,607.491329 seconds on the shared Mac. All prechecks, compilers and kernel
pass. Node passes 133 cases, Counting 56, plain 3,601 with one skip, and
Native 1,060 with two skips. Native passes 281 files and skips one. Its
teardown raises one `EnvironmentTeardownError`: closing RPC while
`resolve` remains pending. The reporter names
`packages/scope/test/archive-input.test.ts`. It reports no failed case;
the unhandled error still makes Native partial and the gate a failure.

The separate investigation runs only that complete two-case file at the
same clean head and tree. It exits 0 in 5.304144 seconds. This supplies no
full Native-stage pass and claims no documented isolated-repair exception.
No source changes between the failed gate and this investigation.

| Check | Command | Exit | Public record SHA-256 |
|---|---|---|---|
| Frozen full gate | `npm run gate` | 1 | `1cb83f799214a2999cf61cbaecbb16e46f9e3f8e93f848a17b14b5c4466172e1` (`failure-record.json`) |
| Named teardown owner | `node node_modules/vitest/vitest.mjs run --config vitest.native.config.ts packages/scope/test/archive-input.test.ts` | 0 | `586befa166f3938b7ac20560d58fcf5337ffbddfe43e69e4425f8d4ae915117f` (`01-archive-input-teardown-owner.json`) |

The sealed [failed-gate manifest](evidence/2026-11-03-receive-pack-flush-gate.manifest.json)
has SHA-256 `fcf103e4ea4729ec1e7474c51b38d887f587d2a4cd2e29af76d3b88c15e55bf3`; its eight public files index 29 private files.
The sealed [focused investigation manifest](evidence/2026-11-03-receive-pack-flush-teardown-followup.manifest.json)
has SHA-256 `113febc9f2adefae1900c6f1802a0656aea387af9fa6c73754844da58fc7c135`; its five public files index two private files.
Raw output and complete stage records stay private because Native output
can contain test credentials. The terminal summary reconciles final case
identities rather than adding live progress callbacks.

Planner ruling `6500f198` permits the checker to assess this sealed record
without another full gate. Neither documented follow-up exception applies;
the ruling decides this environmental gap, and the checker may require more.
The gate remains failed, and exact-head review still precedes landing.
No gate-pass claim follows from the focused investigation. O3 has landed at
`331bf5f2`, and this candidate already includes it. The planner deploys
before a fresh G3 witness runs
in a new room on a new empty branch of the same repository. The original
G3 room and its unknown operation remain untouched. Keep
`builder-receive-pack-probe-20261102` until the fresh witness has its record.
This head closes no G3 acceptance.
