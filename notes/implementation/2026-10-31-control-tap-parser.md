# Keep assertion evidence through long TAP diagnostics

Status: source implementation. The gate passed at `e314592d`.

Request `0bcf9984a08c175522c784852a38fd2623104bde` and promise `ad69910f30dd35e103eaecf1fd2d20138f174b19` own this head.

## What changed

`scripts/control.mjs` now reads each Node TAP diagnostic through its own closing indentation. A nested ellipsis in a long Buffer diff no longer ends the diagnostic. Only fields at the diagnostic's own indentation supply `failureType` and `code`.

The helper still requires a passing baseline, comparable case counts, loaded files, no timeouts and an assertion matching `--expect` when given. Exit codes remain 0 for distinguishes, 1 for survives and 2 for inconclusive.

On an inconclusive result, the helper keeps the actual child's stdout bytes and separate stderr in its fresh scratch directory and prints that directory. Node stdout goes to `before.tap` and `after.tap`. Vitest stdout and JSON reports stay separate. Early usage refusals create no scratch directory. Conclusive results still remove the directory. `docs/testing.md` states this.

`scripts/control.test.mjs` is a new three-case Node owner that exercises the real control CLI, and `scripts/test.mjs` adds it to the fixed Node file list:

- The long Buffer failure comes from Node's actual assertion formatter.
- A thrown message tries to spoof fields and nested TAP.
- A scripted, deliberately incomplete diagnostic checks the reader boundary. That case is not evidence about native Node output.

Binary markers tell exact retained bytes apart from UTF-8 replacement.

This head also corrects the status line of `notes/implementation/2026-10-31-http-request-lifetime.md`, which still said review and landing were owed after `e3e65a0b` landed it.

## Decisions

Only stdout supplies TAP records. Stderr stays separate retained output and cannot supply assertion authority. A test can write anything to stderr, so a forged record there must not count.

An exception message never proves an assertion. Message text cannot supply metadata or nested TAP results.

An incomplete diagnostic stops at the next outer record. It cannot borrow that record's fields.

The fixture removes `NODE_TEST_CONTEXT` only in its synthetic CLI launcher. The first focused run failed because the launcher inherited that variable, so the observed Node wrote binary child-reporter records instead of TAP. That observation concerns the pinned local Node, v26.13.0, not every version.

This head changes neither the timeout policy nor the authority of a test result.

## Evidence

The checkpoint is `e314592d96ae52f5f9540cd6d8229d5c4c30d2c9`, tree `e712edbb1b8959c201ef87386d81bfbbd32f9180`. The reviewed head adds only this note, its manifest and the status line. Per [the follow-up rule](../../docs/testing.md#follow-up-after-a-gate), source and tests are unchanged, so the gate does not run again.

The focused runs precede the rebase onto `e3e65a0b`. The rebase mapped `66e324d3` to `1366d582` and `ed254389` to `e314592d`, tree `65373cb5` to tree `e712edbb`. `git range-diff` reports both commits as identical, and the changed paths between the two heads are the five paths of the landed repair. Those runs therefore cover the same control code. The gate ran `scripts/control.test.mjs` again at the checkpoint, and its three cases passed.

Digests name files in the manifest's directory.

| Check | Command | Exit | Digest |
|---|---|---|---|
| Gate at the checkpoint: 3203 plain and 889 native tests passed. The test step took 1019.3 s and the whole run 1042.11 s, in one observed run | `npm run gate` | 0 | `0e5d0156dc7f7424fbf6469e702a06cf2992339773e720d3c9c30c754fe7b2a4` |
| Control owner inside that gate: three of three passed | `jq` selecting `test:pass` and `test:fail` for `scripts/control.test.mjs` in the retained Node events | n/a | `2362f50816f645b739e5e88907d872563d8d07583edb7211d4434c0eee77dc1e` |
| Commit message check at dirty `b1069bf1` | maintained `checkMessage` on the exact message | 0 | `32a45b2a0dfc651ccd5a8355d6f4cb56b8a6b1bc10cbd8281506e37622317d19` |
| Combined owners at `66e324d3`: six fixed-runner cases passed. All three new cases failed on the inherited `NODE_TEST_CONTEXT` | `node --test scripts/test.test.mjs scripts/control.test.mjs` | 1 | `9daaf65663b824413011a54cb4d6900b5d6be18d2f8d877a22cfaed080b2bf2f` |
| Failure receipt of that run | capture receipt | n/a | `c9289e4b2f91dd6fddf676c45e4bc9dd008622bdc86218904f665b933be85994` |
| Second commit message check at dirty `66e324d3` | maintained `checkMessage` on the exact message | 0 | `32a45b2a0dfc651ccd5a8355d6f4cb56b8a6b1bc10cbd8281506e37622317d19` |
| Corrected control owner at `ed254389`: three passed | `node --test scripts/control.test.mjs` | 0 | `6a375c90639cf9f19b5b721b3fbfa1171f3b66dd1735a3ccb1ac9216c2ae1f64` |
| Control, old ellipsis terminator: distinguishes on the long Buffer case | `scripts/control.mjs` on the whole owner | 0 | `3d7c7d768599d900f9ed4e932586a2bb4e42d3e5ef463fa3f2acb68ba71c559c` |
| Control, TAP read from combined output: distinguishes on the message and stderr forgery case | `scripts/control.mjs` on the whole owner | 0 | `edad27f9f2497beb52d329fcb0409f6c2719f232eb994ff9a2fec7b0e95bd66b` |
| Rebase identity | `git range-diff` and `git diff --name-only` | 0 | `4ee6d596b301c598eba4662e13fcb76234ed07bdb27d5c374eb9de942ad0a353` and `a220c7cd41310540f526a0c68be1b99b0395af4a17ed33effd9eecd87af49037` |

The two control rows digest stderr, because the helper writes its result there. Each control's baseline passed all three cases. Each mutant passed two and failed only the named case by an ordinary assertion. In the old-ellipsis run, the retained TAP has nested ellipses at lines 19 and 27, the diagnostic's own `ERR_ASSERTION` at line 32 and its actual close at line 8235. The helper restored all tracked bytes and modes after each fault.

`focused/` holds the exact argv, both streams, process metadata, receipts, Source maps, tool and dependency provenance, and the retained synthetic child roots, with its own `SHA256SUMS`. Those captures recorded wall time as the owning process's interval and host child CPU without guest CPU. These owners use Node built-ins. No package was installed and no live service was used.

## Open limits

- S4's first control stays inconclusive. Its raw child TAP was discarded, so this repair does not prove that this parser defect caused that result. A new reproduction can establish the defect without the missing bytes. Request `0bcf9984` owns this statement of the limit.
- The two controls change Source during the fault, and the guards compare Source before and after. They show that the bytes were restored at the end, not that Source stayed still during the run. Request `0bcf9984` owns this statement of the limit.
- The focused captures did not isolate cache or host load, so their timings describe those runs only. Request `0bcf9984` owns this statement of the limit.
