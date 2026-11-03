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

The full frozen gate and checker review remain pending. O3 keeps review
and landing priority. The planner deploys before a fresh G3 witness runs
in a new room on a new empty branch of the same repository. The original
G3 room and its unknown operation remain untouched. Keep
`builder-receive-pack-probe-20261102` until the fresh witness has its record.
This head closes no G3 acceptance.
