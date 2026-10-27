# Read installed releases through the operator session

Implementation and focused verification are complete. The ordinary gate,
sealed evidence and exact-head review remain due. No live query or deployment
is part of this child.

## What changes

The installed-release command acquires at most one existing operator read
session before its summary loop. It keeps the session only in memory and
reads each listed scope once. The saved report still contains only application
metadata, fixed errors and the manifest path and digest.

The command validates the saved manifest before reading signer custody or
sending a request. It reuses the existing session client and the same fetch
wrapper that prohibits redirects. A valid session refusal, or absent configured
membership, selects initial Signed reads. A transport failure, timeout or
malformed session answer stops with a fixed error before any summary or output
file. The command neither retries a summary nor renews its session.

Session acquisition is the one request beyond the summary GETs. The host can
write bounded replay and rate bookkeeping in `session_request`; it makes no
history entry. Registration and business mutation remain excluded. Reads can
still run existing host maintenance. `docs/deploy.md` states these qualifications
and retains the planner's three-Worker report requirement before R11 deployment.

## Why the paths differ

This child is request
`git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:0c4a42365997af33c52f1ea6a68717d62258aa7a`,
under promise `316f5777efc29b9282d804776607abc97790c1f5`. It amends the
session prohibition in ruling `2dc765ac41e0287b5854e0790622ad29a4d0033a`.
The starting source is Main `d73b53c971d90bb246bad868815912bad0e83682`.

At that source, `scope-index-applications-command.ts:83–88` always passed a
null reader to `signedReads.summary`, selecting Signed authorization. The
signed request binds the actor, scope, read, argument and expiry
(`packages/client/src/signed-read.ts:35–68`). The host first checks framing,
signature, exact target, clock and expiry. A summary then requires a recent
local entry signed by that actor, or a recent genesis causal root signed by
that actor (`packages/scope/src/signed-reads.ts:315–376`). The proposed authority
window is 900 seconds (`packages/contract/src/bounds.ts:77`). A fresh request
expiry does not renew an old entry's authority. This Signed path bypasses the
readers port (`packages/scope/src/reads.ts:114–126`).

Inventory and sweep first acquire a membership session and read entry/history.
Those wrappers can also retry a forbidden session read through Signed authority
(`packages/cli/src/commands.ts:173–223`). Their success therefore does not prove
that sessionless summary should pass or identify which path admitted each
remote read. This adapter does not reuse those retry wrappers.

The existing host session issuer validates membership, active member and key,
signature, expiry, nonce and usable deployment bindings. A target separately
checks its session MAC, deployment, exact recorded membership/incarnation,
clock, expiry and requested permission (`packages/scope/src/sessions.ts`).
The existing client checks its answer shape and binds the requested membership
scope, incarnation and actor key; it does not authenticate the token or establish
hosted permission. The target performs that check when the token is used.
Ordinary members can receive summary permission. `SESSION_SECRET` and
`DEPLOYMENT` are required; this child changes neither setting nor authority.

The planner retained eleven Grow and eight Lending summary refusals, all
`forbidden`, at the starting head. Demo lacked a configured repository and
Directory. Those observations establish neither the failed internal Signed
condition nor a defect in session settings. The planner owns Demo configuration
and reruns all three Workers from the landed source. Deployment stays held
until those reports are complete.

## Evidence

Evidence is being assembled at
`/Users/hughpyle/play/artroom-evidence/2026-10-27-application-release-session`.
The recorded scripted host witness uses identical summary data and authorization
policy for sessionless refusal and session admission. It proves the command's
choice and handling of protocol replies, not native session issuance, an actual
Worker configuration or hosted authorization.

The two focused files passed 15 cases: nine command-boundary cases and six
projection cases. Both CLI source and test compiler contexts passed. The first
focus invocation also named a nonexistent legacy filename; Vitest selected the
two existing files, so it provides no legacy-file result. The legacy dispatcher
was not changed.

The paired record prints only TEST report metadata and counts: three Signed
summary GETs return forbidden; one acquired session and three summary GETs
produce two application rows and no errors. The temporary recording line was
removed byte-for-byte afterwards. This is one scripted authorization policy,
not a production signature, MAC or membership check.

Two focused source controls compile and fail the unchanged named assertion.
Passing null instead of the acquired reader makes the admitted branch fail.
Continuing after an uncertain acquisition makes the fixed-stop witness fail.
Both restore the exact adapter and test bytes. The first null-reader control
failed compilation because its reader variable became unused. That result is
inconclusive and remains retained; the repaired `(void reader, null)` control
compiles before showing the assertion failure. No mutation sweep was run.

Focused wrappers retain command, exit, wall time, child CPU, head, tree,
working-file hashes and output digest. Control child records retain command,
exit, timings, source/test hashes and output digest; they do not record their
own Git head or tree. These checks ran on a working state based on Main
`d73b53c971d90bb246bad868815912bad0e83682`. The adapter SHA-256 is
`cce5a0ef30f14511368a3a78ed90476d512659b1f77020d012e2d5bc90634c6c`;
the final test SHA-256 is
`14763201633751dd38025d17765959fe72243018b6447f177711c5812eab331e`.
No package was installed. The private dependency view was copied from the
verified exact-lock view and rebound to this worktree with no dangling links.
The lock SHA-256 is
`645224923cabfd70b51b8add2a43be12673444779d18002a42ed4254b3216d6e`.

Before this child's first ordinary gate, R14 landed as Main
`6f47bf98fa09ac0f3957ac9f6cc3ae21b2333b1e`. This branch was recut onto it
without conflicts; all four task files were byte-identical across that rebase.
`recut-provenance.json` records the old and new heads and file hashes. The
listing adapter and tests retain the exact SHA-256 values above. The ordinary
gate now checks the combined baseline, including the landed R14 script.

Paths below are relative to the raw directory. Gate checkpoint and final
manifest remain pending. Times are individual local command observations,
not whole-edit latency or a controlled benchmark.

| Check | Command | Exit | Output and SHA-256 |
| --- | --- | --- | --- |
| Focused command and projector: 15 pass | `Vitest cli; applications and applications-command files` | 0 | `focused-listing/output.log`: `c4ddf1f459b6f0248f9dfe134ccacde0e9929c381dd7df4f7631f9df6d25416b` |
| CLI source types | `tsc -p packages/cli/tsconfig.json` | 0 | `cli-types/output.log`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| CLI test types | `tsc -p packages/cli/tsconfig.test.json` | 0 | `cli-test-types/output.log`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Recorded scripted forbidden versus admitted pair: one pass | `Vitest cli -t uses one acquired session` | 0 | `recorded-scripted-authorization-pair/output.log`: `bf72ae4fa7878ee64824060130b2441f5e1a78cc3d3c4d8eee1e33224fbda49d` |
| Initial reader control: unused variable, inconclusive | `tsc -p packages/cli/tsconfig.json` | 1 | `control-ignore-session-types/output.log`: `b9fa29d44f8d5022d5d2931cbacdaada6240d857cae53ffd1726f10e8878f1b3` |
| Repaired reader control compiles | `tsc -p packages/cli/tsconfig.json` | 0 | `control-ignore-session-compiled-types/output.log`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Ignoring session: named assertion fails | `Vitest cli -t uses one acquired session` | 1 | `control-ignore-session-compiled-witness/output.log`: `011ff0b3bc9cc114ce855ba1808a79d779c49264e2fe39bdc384fc26ff4b6487` |
| Uncertain-acquisition control compiles | `tsc -p packages/cli/tsconfig.json` | 0 | `control-continue-after-uncertain-session-types/output.log`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Continuing after uncertainty: named assertion fails | `Vitest cli -t stops private session exceptions` | 1 | `control-continue-after-uncertain-session-witness/output.log`: `79f3d32f968a962ee177f0971aa895344423602ec818f2d931bdc1ec01954bbb` |


## Open limits

The parent installed-release request `521f57a1` already landed. This child
owes implementation, the paired recorded control, PD-2 evidence, gate and review.
The planner owns all hosted reruns under this request and the Demo configuration
gap. Summaries retain the previous projection limits: no genesis revalidation,
global inventory proof, authority grant or trust-policy decision.
