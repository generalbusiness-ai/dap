# T1 historical witnesses

The tests in `../test/witnesses.test.ts` pin the compiler plan §4.2's
outcomes independently of the declaration checker. A failure of another
kind or at another frontier does not satisfy an assertion.

`witness-boundary.json` freezes the unchanged harness, client, manifests
and kept models from main `9c4e04e5`. Run-1 witnesses use the historical
projection-only privacy budget. Run-6 and V3-F2 witnesses use the current
readable-events privacy budget, as their diagnoses require. All replays
use the current unchanged foundation. The six unauthorized run-6 leaks
that the current foundation already repairs are outside the three named
payload-audience witnesses.

| Replay | Pinned result |
|---|---|
| Run 1, seed 158 | Dana at 7: mismatch; oracle accepts `o3`; view has `accepted: null` and `no_such_offer` |
| Run 1, literal manifest case 3 | Dana at 20: mismatch; oracle `already_decided`, view `no_such_offer` |
| Run 6, seeds 172, 181, 200 | Carol at 4, Bob at 4, Bob at 4: budget; counter readable by payload addressee outside actual parties |
| V3-F2 steps against run 1 | Counter at 7 is effective; Carol at 7: budget; Bob cannot read it |
| Run 1, seeds 72, 96, 172 | Three steps end at 4; unknown-stub replacement/withdrawal is effective and violates the invariant |
| Baseline `fd1e23b`, literal manifest trace | Bob at 10 cannot read the effective counter; checker is clean; required readership differs |

`sale-fd1e23b.json` retains the exact model source from
`fd1e23ba29e930f33860588fd530cd6135b14a42:spike/fixtures/sale.ts`, its source
digest and historical package identity. The test writes those exact
bytes into a temporary layout with the unchanged current `src` directory
linked alongside. It preserves the module fingerprint and does not
rewrite or replace any original fixture or corpus. The baseline trace's
counter payload names `seller: alice`, as the historical manifest did;
the repaired trace names `author: bob`.

The positive derived Sale manifest and campaign checks are separate.
Club's retained A5 witnesses and A1 guard limit remain in their original
test files.
