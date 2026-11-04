# Generate bounded Git framing variants

This head adds 94 deterministic wire variants and three minimal historical
seeds to the existing Git HTTP owners. Every admitted upload variant must
return the exact independently known object bytes. Every receive variant
must preserve its reported result and attempt classification. A malformed
reply stays unknown even beside a matching ref, and a send makes one POST.

Request `0466ff4e` and promise `d8697d39` own this test-only change. Planner
acts `928b537a` and `4973d367` place it after the landed Question summary fix
while O4 waits for browser access. The two modified paths are
`packages/git/test/http-read.test.ts` and `packages/git/test/http.test.ts`.

## Independent objects and separate wire grammars

The upload fixture writes a small commit, asks real Git to make its pack,
compares raw `git cat-file` output with the supplied bytes, and uses Node
zlib to check the pack entry's type and inflated length. Those fixed checks
run once per owner invocation. All generated upload cases reuse that pack.
The new generator never uses the production pack encoder as its oracle.

The 48 admitted upload variants combine optional text LF, absent or framed
HTTP service preambles, capability and feature order, shallow sections,
and whole or seven-byte sideband payloads. Split payloads also include an
empty keepalive and binary progress bytes. Twelve single edits corrupt a
length, remove a flush or delimiter, duplicate a required capability,
substitute a shallow ref, add an unrequested section, or append extra
flushes or bytes. Advertisement refusals send no POST; response refusals
send exactly one. Neither path falls back or retries.

[Git's packet-line format](https://git-scm.com/docs/protocol-common)
permits a missing final LF on text packets. Its
[protocol-v2 description](https://git-scm.com/docs/protocol-v2) supplies the
capability, section, delimiter, and sideband rules. The
[HTTP protocol description](https://git-scm.com/docs/http-protocol)
supplies service-marker framing. The retained `a03d3153` repair separately
establishes dap's accepted HTTP-preamble-before-v2 case.

Receive-pack has its own small grammar. Twenty-four admitted variants
cover creation, update, and deletion; success or explicit rejection;
optional text LF; and one or two terminal flushes. Capability order also
varies. Ten single edits corrupt a length, remove a required status or
flush, substitute the ref, add a status, add a third flush, or append bytes.
Every malformed answer remains unknown even when read-back matches the
requested value. A successful report still needs exact read-back; an
explicit rejection keeps its refusal classification.

[Ordinary report-status](https://git-scm.com/docs/pack-protocol#_report_status)
ends with one flush after the unpack and ref statuses. The second flush is
the retained provider compatibility case from `920029d5`. The generator
keeps that allowance bounded to one additional terminal flush.

The receive HTTP replies are stand-ins. The existing real-Git checks still
witness actual creation, update, deletion, a racing compare-and-swap
refusal, and a lost reply without another POST. The upload owners retain
their real Git OFS/REF delta and zlib checks. Every pre-existing case stays.

## Minimal seeds distinguish the three historical checks

| Repair | Minimal seed | Reverted check |
| --- | --- | --- |
| `485e785c` | LF-free version 2 | Require a final LF again |
| `a03d3153` | Service marker, flush, then version 2 | Require version 2 as the first frame again |
| `920029d5` | Unpack ok, exact own ref, two terminal flushes | Accept only three decoded report records again |

Each seed removes optional capabilities, sections, progress, keepalives,
and segmentation where those do not define the historical case. Each
control passes its one named seed before the change and fails that seed by
assertion afterward. Every control restores the production source bytes
exactly. These are the three requested historical reversions, with no
mutation sweep.

The evidence uses a copy of `scripts/control.mjs` whose only change keeps
the conclusive scratch output instead of deleting it at exit. Its test
commands, assertions, deadlines, classification, and source restoration
stay identical. The retained source hash and one-line retention diff make
that change reviewable.

## Validation preserves the initial limitations

The first affected-owner run passed all 120 cases, but Vitest shortened
parameterized titles and produced 36 duplicate names in the upload owner
and 12 in the receive owner. Explicit full titles now identify every wire
choice and remain unique.

The first LF control remains inconclusive. Vitest serialized its promise
rejection as `Error`, and the control helper could not count an assertion.
The seed now captures the complete read result and asserts equality
directly, including the actual refusal on a failed read. The corrected
three controls all distinguish. No expected object byte, grammar rule, or
deadline changes to obtain those results.

The final complete affected-owner run passes 120 cases: 76 upload and 44
receive. Its 97 new cases include all three seeds. The source and test
compiler configurations pass. On this arm64 Darwin 27.2 Mac, with Node
26.13.0, Git 2.54.0 (Apple Git-157), warm dependencies and transforms, and
unmeasured concurrent load, the two-owner command took 2.47 seconds. The
new cases' reported test-body durations sum to 28.89 ms; that sum excludes
fixed fixture setup and runner startup.

These focused checks ran while the owner files were uncommitted over
`0455c637`. The evidence records that base, the final frozen file hashes,
the controls' original runtime hashes, and the complete raw reports. The
frozen source commit is `10f753176dfc8427a6cea2e663bcc4787d60377e`, tree
`2f92120a04dcfaed4d4b04ba4df774d9d0b14bd4`. Its required gate runs at that
actual commit.

The focused manifest seals nine public files, SHA-256
`7a154302ff6fe55c60af24af8a5c4b17d3c8ee2fa64152fc69d216db22ad7ed7`.
Its retention record indexes the initial focused run, initial inconclusive
control, and final controls, including their child reports. Original raw
files stay owner-only and read-only. The record supplies no hosted Git
operation, Native judgment, or deployment claim.

The actual gate.exit reads `exit 0`. The unchanged gate took 1,204.36
seconds at the frozen commit and passed 135 Node cases, 56 Counting cases,
3,711 plain cases with one skip, and 1,070 Native cases with two skips.
All four terminal phases are complete, with no contradictory records or
unhandled errors. Source and dependency snapshots match, and the owned
process group is closed. The record retains 99 suite or unknown
observations and the skipped Page recorder's absent final module duration.

The gate manifest seals 13 public files, SHA-256
`bbfaf941595b63f7204de4500641b1fcb0f6db2433c2c74faa5e0cc422275748`. Its retention record indexes 2,276 private raw originals,
including TEST custody. A recorded wrapper redirects only bare
`mktemp -d` placement so the unchanged gate opens its output in durable
storage. The archive owner passed in 228,230 ms; request `64552d40` still
owns the unproved historical failure cause.

The two manifests verify 22 read-only public files:

| Manifest | Files | Source |
| --- | ---: | --- |
| [Focused owners and controls](evidence/2026-11-04-git-framing-focused.manifest.json) | 9 | Working-tree checks and frozen-file identity, as qualified above |
| [Complete gate](evidence/2026-11-04-git-framing-gate-validation.manifest.json) | 13 | Actual `10f75317` commit |

Only this note and its two manifests follow the validated source. These
Git-only test paths do not trigger the Card workflow or require its
citation. This head changes no runtime and needs no deployment.
