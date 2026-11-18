# LS-1: current references in the local Worker smoke

## Source and scope

Request `3bacbc5ea3b32d60c9c09c4cc53163eb8705d956` and promise
`630a37a06c656fc848ec4d270bbbb0eb13f5a151` govern LS-1.
The source rides CB-1, whose separate request is `b5f200f2` and promise
is `9b083032`. One combined head and gate serve both requests.

Branch `builder/cb1-ls1-source-20261115` starts at preserved CB-1 head
`8a5880b6716dab2691a2115498125d06f347d15b`. Merge
`bfb565eed9db00b01ce10d6c62b68349f7dbaafe` takes actual main
`4b198d0fc980327d87347b05a3817106974bf8d7` without conflicts.
The old CB-1 branch, dependency view, and evidence remain intact.

## Current reference and public failure boundary

The smoke loads `isScopeRef` from `packages/bytes/src/records.ts` through
its existing pinned CLI loader. The shared codec checks register,
directory, and membership references before the smoke emits their exact
`{scope, genesis}` projection. It rejects the retired `{scope, inc, kind}`
shape and added fields. No old-shape fallback remains.

Both invitation and joined-store checks compare membership scope and
genesis. A matching scope with another genesis fails the identity check.
Rules, destination, and inbox remain ScopeIds. The actual `verify register`,
`verify --all`, and exact seven-scope coverage checks still establish roles.
Base planning, retained plan ownership, and the one-run custody marker keep
their existing behavior.

The proxy adds `operation` to its public failure metadata. The selector
accepts only a genuine `CelldSmokeError` with a maintained operation name.
Every other error produces `null`. It emits no message, stack, cause,
invitation, signature, signing key, or other arbitrary error property.
The existing private scratch-path metadata and private log retention keep
their scope. LS-1 changes no TLS, Worker, SDK, trust, lease, retry, or
process ownership behavior.

## Current composed source

The [CB1 report](2026-11-14-cb1-base-celld.md) records normal merge 7521 onto
actual published main 2055762c, the hook-state prelaunch refusal with no merge,
the LC3 three-path source commit 769482ac, original Page-owner failure, one
successful producer and its separately corrected post-build audit assumption.
Final source `25f070a71161fcd69717a95825516bc35d034131`, tree
`b2e9fb982e0c1b74767fad1c2f90b84a17d8bd97`, includes the repaired asset.
It preserves LS1 source and strict current ScopeRef behavior; no source model,
codec layout, trust, version, identifier, dependency or Worker authority changed.
Integration END is `2aa5612f6f9ce585f8c06893531b604c53f7a8a6`; Page repair END is
`892ccbb79a375f344e2ec552560d999cd4ccb070`.

LC3 request `7b51d924ef241b5fbf20d506c4a062fb38634ee1`, promise
`fa55582bec9dade2d64ef1226b45101781d4194f`, rides this combined head under
ruling `502d72944ed33e9eb5ee4dd04a1d888e31bf1187`. Its distinct primary report
is `apps/room/wrangler.lending.jsonc`, not a new note. Equal room/sandbox
host descriptors map the installed signed Lending 0.3.0 item 2 through LENDING
beside Grow. The canonical /applications/directory/item/encoded-presentation/
path serves the screen; the bare origin's root stays 404. Planner deploys the
Lending Worker first and sandbox second after landing, then reads the screen.
The Page asset change required four Page routes; all passed at 5fd226c6
after the accepted follow-up.
The original twenty-two own paths match no Card workflow filter; the later
two ID files and testing-rule sentence add no Card match.

## Witnesses and limits

The existing `scripts/celld-smoke.test.mjs` owner retains its five cases
and adds two. The first calls the actual validation, projection, and
membership-comparison boundary used by the smoke. It covers current
references, property order, malformed and retired references, and a
same-scope/different-genesis membership. The second calls the exact
operation selector used by the proxy with private sentinel error fields,
an unknown operation, and a foreign error. These are script boundaries;
they do not substitute for a real Worker or prove the whole proxy flow.

Metadata-only inspection on 15 November found `CELLD_BIN` unset and no
`celld` executable on PATH or at `~/bin/celld`,
`~/.local/bin/celld`, `/opt/homebrew/bin/celld`, or
`/usr/local/bin/celld`. No binary, version probe, proxy, server, network
request, installer, or project import ran during this source work.
This search does not claim that no celld binary exists elsewhere.

Lifecycle amendment `3f739d53d5f1aebf98bfd37c2afd5f6c66f37c06`, answering
`6edeb797`, closes LS-1 at normal joint landing with CB-1. One verdict names
both promises, and the landing receipt closes them. No real local Worker
run stands behind this head. At that source-only checkpoint the Node owner
and combined gate were UNRUN.
The current whole-owner baseline and control follow below; the later gate
FAIL and distinct passing follow-up remain separate outcomes.

After publication, the planner checks the actual main branch's **Local
Worker smoke** workflow and cites its result in the origin act. A red run
opens a new repair request with the inner error. It reopens neither promise.
The original checkpoint owed a one-line landing-obligation answer. Gate
START dca2d2af now records the 841b7903 disposition: no fleet obligation
blocks landing after a passing gate and the required Security conclusion.
The joint head follows R, E1 and NF6; current gate START records that order.

| Boundary | Result at its named boundary | Evidence or remaining obligation |
| --- | --- | --- |
| Original Node owner and its two new cases | UNRUN at the source-only checkpoint | Current baseline/control below do not relabel that checkpoint. |
| Original shared-codec loader and combined source | UNRUN at that checkpoint | Current preflight below; no LS1 AST expectation refresh occurred. |
| Actual local Worker and TLS proxy | UNRUN; no binary at the inspected paths; no real local Worker witness | LS-1 closes at joint landing. The planner checks the post-publication workflow on actual main; red opens a new repair request. |
| CB1 fleet and Security scope | Prior results retain their original heads | Fleet/machine/operator and release selection remain distinct; independent Security review and CB2 remain owed. No operator or privileged step ran. |
| Final-source preflight | Fetch/helpers/whole typecheck all 0; 0.353881625/0.565040750/16.343570000 s; outer 17.573380333 s | `T/result.json`; helper stdout `af00848d1b94433533085adfecd184e68584914cce159b58ead29f4dab584502`; whole TC stdout `a9abf7e40e10fbda74447d08a5ea3b33733361ecd9ac199658065cfbc874936a`. |
| Whole smoke baseline, END ad4c8a58518affe60d0ca67b83a2eef5264ea575 | 7 PASS, exit 0; supplies the development owner, no separate green run | `L/before.tap` — `f573060b78fe51121797aebfa05e6e59843695ee1890510cfc7d4fe081f09042`. |
| Finite-operation control, same END | DISTINGUISHES; mutant 6 PASS/1 direct ERR_ASSERTION at celld-smoke.test.mjs:168, exit 1; helper exit 0 in 1.849805833 s | `L/after.tap` — `ebe99072ac6a1623a99569b0694e6fc21eb62c451979f9cfb8e473ae59b004af`; helper stderr `8fd1fe0036698d686899d0095e31be05e348a84389f491c330e7cf1fe05a996b`. |
| Both controls and restoration | CB1 baseline 9 then 8 PASS/1 intended failure; both sources/modes restore, no third green; outer 8.531697667 s | `G/controls/result.json` — `9d0a4fd445bf1c2f5eb6e4d2973fc72c9d39ea7edf75fc3bcbdbcc84182dd43e`; original streams and safe same-gate copies remain intact. |
| Other current boundaries | Whole Security 12, Platform 328, Mac parent 1 with actual Node 20 and Python 24, deployment-smoke 11, sandbox 10 and CLI config 6 all passed; repaired Page assets 1 passed | Exact commands, process walls and hashes are in the common CB1 report and `B/result.json`, `A/result.json`; no real local celld/fleet implication. |
| Original gate and distinct follow-up | Gate FAIL END a18e2cecc1eb733b26f89189cfc00c0eaed2abbc; ruled owner/Plain/Native follow-up PASS END 2005b6dd95727162ff69c94cf3c75b5bcc71fcf2 at 5fd226c6 | The common CB1 report keeps the single original gate result, canonical repair and complete follow-up facts. All four local Page routes passed under END 718f2d46cc6d30b4a2587cb8160ca9a2e707cc97. |
| Local Page routes, END 718f2d46cc6d30b4a2587cb8160ca9a2e707cc97 | Four scripts exit 0 at 5fd226c6; outer 137.321146292 s, root QA complete | `D/result.json` — `3e660bb31909b27337a6eb8495100db05a6f4e89891d6fdf0c009324b1971ba7`; QA index `8098f24657bd21a062ee15797f8e58625cc97e75926a4623c7fa4feb55575668`; full command/wall/report rows and limits are in the common CB1 report. |

`E=artroom-evidence`;
`T=E/2026-11-15-cb1-ls1-lc3-final-source-preflight-attempt1`,
`B=E/2026-11-15-cb1-ls1-lc3-bounded-owners-attempt1`,
`A=E/2026-11-15-cb1-ls1-page-assets-repair-owner-attempt1`,
`G=E/2026-11-15-cb1-ls1-lc3-full-gate-attempt1`.
`L=G/controls/ls1-finite-operation` name the retained native control streams.
Each result.json retains exact argv, cwd, exit and process wall. Control copies
retain the actual byte digests; originals remain intact. The seventeen safe
copied records exclude the private synthetic fixture trees.

The LS1 fault changes only `return operations.has(operation) ? operation : null;`
to `return operation;`. The retained class check still requires a genuine
CelldSmokeError. The exact existing case “proxy errors expose only a maintained
smoke operation and never arbitrary private error state” then directly sees
the synthetic private sentinel instead of null. Its later loop specimens are
unreached after the failing assertion and receive no fault-pass claim.

The helper uses the whole unchanged seven-case owner; no test-name filter,
new timeout or classifier edit runs. Its retained copy differs only by
preserveScratch false to true. Both source bytes and 0644 modes restore exactly;
the original two-control result records no unloaded/timeout/cancelled/skipped
case and root reaped all children. Separate Node stderr contains only DEP0205
warnings. CB1's own control and current nested Mac results keep their distinct
boundaries in the common report; a parent Node case is not its child counts.

No real local Worker or TLS proxy ran. Security 12 is a whole test owner, not
the reviewer's independent Security conclusion. The actual published-main
Local Worker smoke, distinct fleet/operator witness and CB2 still have the
owners and qualifications above. The original full gate failed on Lending's
current presentation before Counter and later packet/trust assertions; those
later assertions receive no pass claim from that run. Rulings
`7e4bf8ba4e6702d9e1783cfe391bc56b0bb9d79a` and
`42140027ceb491bd6571ea1a0df747f9a654bc35` authorized the separate repair route.
One normal comparison at 25f070a7 measured only the open-0.4 Lending/Counter
presentations. Apply commit `2159cf25b193a0ef6ffc2b35f3d008bbd9ec06bd` preserves
Grow, tuple entry/definitions/semantic, signed 0.3 packets/trust, source versions
and LC3's installed-0.3 descriptor. Docs commit
`5fd226c6c1a758b793d86055b2ae755637ba0b16`, tree
`388bbbac70a97e57a8bb22e568b06a6c74f52b27`, adds the public pre-gate whole
reproduction-owner rule. No LS1 production source changes in either commit.

The common CB1 report records comparison END
`7720b98d503916380ddc5314f203651a76bf78ef`, exact-head preflight END
`99cfe22590daf8de8e1699430908f8d665c74be5`, and follow-up START
`528493f77399a886a327454c162179570997ab87`/END
`2005b6dd95727162ff69c94cf3c75b5bcc71fcf2`. Whole reproduction 1, Plain 4858
plus 1 skip and Native 1136 plus 2 skips pass there. Node/Counting/kernel do not
repeat. The original full gate remains FAIL. Natural Scale omits the command
and result, not a zero-case pass. Terminal evidence is complete with zero
unknown/suite observations and contradictions; scope-stories timing stays
partial. All four local Page routes later passed; review, filing, landing
and publication remain owed. The common report contains the actual counts, walls and root-verified
hashes; no second gate outcome is created here.

The eventual note-only successor changes only this existing LS1 note and the
existing CB1 note. All other bytes remain checked by the ruled follow-up at
5fd226c6/tree 388bbbac; root's later source act binds the final documentation head and tree.

Original gate START `dca2d2af6d84b3f22a985a7acf4ed1b736475477` remains attached
to its failed 25f070a7 run, separate from the later follow-up START.

The four Page routes ran under START
`9abbba9e85652c4e0363c7c112d5e66a9d3d1b94` and completed END
`718f2d46cc6d30b4a2587cb8160ca9a2e707cc97`. The common CB1 report records their
actual per-script walls and safe report hashes. `D=E/2026-11-15-cb1-ls1-lc3-page-four-safe-attempt1`
retains twenty-two inspected safe files plus the QA index. Root viewed seven
PNGs and read the reports/streams; no unexplained clipping, overlay or error
remained. Recorded unread lanes/live-update warnings are not complete-list
proof. The claim route retains its no-Scope-admission/no-native-completion
stand-in limit; the label route retains its fixed TEST label and expected
switch truncation. No key, encoding, signed body or raw journal was exported;
unselected images or caches are not thereby called secrets.
Browser scripts ran locally on macOS at this head. The Linux workflows have
not run at this head. No Card, hosted-provider, fleet, device or NF7 result
follows. Final documentation-check END accompanies the final source act.
Root runs the four maintained citation, link, note and commit-message checks
once after this note-only commit and records actual head/results externally.
Root's final source act binds the two-note successor and documentation-check
END; all 23 non-note paths and modes preserve 5fd226c6, with 4,902 other
entries unchanged.
