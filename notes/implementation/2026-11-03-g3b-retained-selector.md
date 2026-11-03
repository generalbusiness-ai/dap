# Select the installed G3b register without an expired read

Source child `40051d7f`, under promise `078c5b2f`, supports G3 delivery
request `1bb63a2f`. The approved first G3b creation exits 1 after one
Register GET returns 403. It submits no Native act and leaves no claim or
repository in the client config. The retained plan uses Register 25 with
`keys` policy. The old selector omits that pin and requires `open`, so it
falls back to the signed summary read after the install window expires.

[The selector](../../packages/cli/src/claim.ts) now includes Register 25's
immutable initial revision. Its keys-policy exception requires that exact
pin, host `none`, an empty namespace, and the operator among the original
signed founders. Every existing service, signature, actor, seed, attempt,
acknowledgement, incarnation, and receipt check remains. Other keys-policy
pins keep the actual read path. Open-policy Register 25 uses the existing
open-install checks. This local selector supplies a revision; the Native
Register still judges the fresh `found`. No server read window, policy,
permission, or claim-continuation rule changes.

The Page imports this shared claim code, so its generated bundle also
changes. Its asset-consistency owner passes. The
[existing CLI witness](../../packages/cli/test/claim-selector.test.ts)
now covers four cohort and policy cases. It retains the wrong-incarnation
and wrong-attempt checks and adds a valid signed installation whose
operator is not a founder. All four cases pass, along with the CLI and
scope owning compiler contexts. The test scripts service replies and
keeps keys in memory; it proves local selection, not Native authority.

Two direct Vitest controls distinguish the missing pin and an operator
who is absent from the founders. Each fails by assertion in the named
keys-policy case, runs the same four cases, and restores the source bytes.
The first generic control remains inconclusive: its wrapper chose Node
from the CLI package's mixed test script and did not run the Vitest owner.
The corrected driver uses the locked Vitest tool directly.

Planner ruling `15cee681` carries the previously tested archive diagnostic
patch into this required source gate. The copy matches the original
test-only patch exactly. It records the lower SQL or wait failure and any
backward clock pair before the generic `unavailable` mapping. It changes
no allowance, retry, assertion, or production archive code. Archive parent
`64552d40` stays open: the earlier failure after entry 14601 still has no
proved lower cause.

The [focused manifest](evidence/2026-11-03-g3b-retained-selector-focused.manifest.json)
has SHA-256 `446a9928d3d2b8a8eb68d1089b235f923b65e918bd4b6277537ecdcd4dbb1f82`.
It seals 57 files across five units and indexes the refusal's durable
private originals.

| Evidence in that manifest | Result and limit |
| --- | --- |
| `2026-11-03-g3b-first-create-refused/result.json` | Actual exit 1, one GET/403, no Native write. |
| `2026-11-03-g3b-register-selector-refusal/source-proof.json` and `2026-11-03-g3b-selector-policy-addendum/plan-policy-metadata.json` | Exact source guards and read-only metadata from the unchanged new client. |
| `2026-11-03-g3b-selector-offline/probe.stdout` | Scripted CLI baseline: both Register 25 policies take the read; supported open Register 21 selects without it. No network request. |
| `2026-11-03-g3b-retained-selector-focused/` | Owning compilers, four selector cases, Page asset owner, the inconclusive wrapper run, and two distinguishing direct controls. |

Fetching the remote start record replaced the local driver's start metadata
of the same name. The actual exit, stdout, stderr, complete request list,
and private CLI outcome remain intact. The record does not reconstruct
that lost local timestamp.

The required gate at clean `4e795071`, tree `0f2073fc`, exits 1 after
104.717 seconds. Its kernel stage passes, and Node passes 132 of 133 cases.
The sole failure is this changed claim file's old security source seal.
Counting, plain, and Native remain unreached. Source and tree match before
and after, and no owned process remains.

The maintained parser confirms the reviewed claim seal as
`13400cce66b828c18f964587e294baea073c5e5c3054a86ff29a466354846dbe`.
The complete served-route inventory still matches its documentation:
308 rows across eight Workers. The isolated repair adopts that seal in
the failing test file. No production input changes after the failed gate.
The limited follow-up in [Test dap](../../docs/testing.md#follow-up-after-a-gate)
runs the whole security owner and the three unreached stages, preserving
the original failed gate as a failure. It does not repeat the whole gate
or the other Node owners.

The outer gate log starts in durable custody. Despite `TMPDIR`, the
unchanged gate writes its stage originals in the default OS temp directory.
All 23 stage files have exact, hash-verified durable copies; their OS
originals remain. The evidence does not claim those stage files started
in durable custody.

Requester addendum `1a9b4e0e` adopts that documented validation exception
for this source child, subject to independent review. At clean follow-up
head `58e079d2`, tree `0d058f83`, only the security test seal and this note
differ from the failed gate. The corrected follow-up's actual
`followup.exit` reads `exit 0`. Its recorded stage loop runs for 1,506.621
seconds, after the command-plan preflight.

The whole security owner passes 11 cases. Counting passes 56; plain passes
3,607 with one skip; Native passes 1,070 with two skips. All four terminal
reports are complete, with no reconciliation issue and zero unhandled
Vitest errors. Scope module timing remains partial because the skipped
recording module reports no duration. No process matching this worktree
or follow-up directory remains. The archive owner passes; that result
identifies no cause for the earlier entry-14601 failure.

The first follow-up driver preflight fails before any test body runs:
a generated JavaScript string contains an incorrectly escaped newline.
Its driver and diagnostics remain intact. The corrected driver uses fresh
`run2` and `evidence2` directories and runs each scheduled body once.

The [validation manifest](evidence/2026-11-03-g3b-retained-selector-validation.manifest.json)
has SHA-256 `562a08d2232f6b022c6b2591fc960abe3fab061ccaaef5ba552be5aa30cce1fc`.
It seals 13 public files and indexes 81 read-only private originals from
the failed gate and limited follow-up. It keeps both actual outcomes
separate, along with the custody and preflight limits above.

[Page browser run 41726457947](https://github.com/generalbusiness-ai/dap/actions/runs/41726457947)
succeeds at `4e795071`. The follow-up changes no Page or claim runtime
input. The [CI manifest](evidence/2026-11-03-g3b-retained-selector-page-ci.manifest.json)
has SHA-256 `7a165c67f0ca2df92f30e61cd51c5631a298c7fb2b03f4e858022d7d6521d116`
and seals four files, including that source comparison.

This head awaits independent review. It creates no room, changes no remote
source or home, deploys nothing, and prepares no new binding row. The
planner retains the ruling on the exact same-home live continuation.
G3, Goose, and archive acceptance remain open.
