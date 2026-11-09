# Reserve control paths from application publication

Security request `b300dca1`; promise `d107501f`; ruling `d92b5f66`.
The head incorporates main `ce0290fb`, including R15 and its approved standalone smoke correction. Focused checks, the policy-bypass control and the one final gate are complete. The actual gate.exit contains exit 0.

## What changes

The destination host checks each application file publication before the
provider push. It reserves `.github/`, root and `docs/` CODEOWNERS, the
room's agent instruction paths, and current Rules control extents. It uses
the existing bounded Git inspection and extent classifier, including
symlinks that expose an ordinary file through a control path. It checks
the requested path even when the proposed content already matches the tree.

The current authenticated Rules observation must name the exact bounded
canonical extent value. A missing or mismatched policy permits no push.
The host rereads the exact publication source and private credential after
the asynchronous inspection and policy read, before forwarding anything.

A refusal keeps the existing Native evidence `{send: not-sent, seen: <actual
head>}`. Historical judges record `host-refused`. A separate host diagnostic
names the reserved publication path and matched control pattern or extent.
The outside driver records only result, evidence and retained inputs; it
does not write that diagnostic into historical evidence. No fabricated
absent result, Native rule or old journal meaning changes.

## Decisions

Ruling `d92b5f66` narrows R16 to reserved paths in every room. This head adds
no package declaration, publication capability, prefix mapping, setting,
pin or creation family. Applications may still publish any valid ordinary
path. Existing Lending shelf paths keep their original meaning.

Declared per-application prefixes and a judged Destination policy wait for
the next Rules and Destination revisions another change requires.
`publication-paths@1` remains the starting proposal for that future work.
A filed security fix uses [kernel section 7](../../docs/kernel.md); review
must assess that exception and the host-only boundary.

## Reserved readers

| Paths | Reader |
|---|---|
| `.github` and `.github/**` | GitHub workflow/configuration and ownership readers; `packages/platform/src/extents.ts:53` includes workflows and actions in `RULES_PATTERNS` |
| `CODEOWNERS`, `docs/CODEOWNERS` | GitHub ownership reader; `.github/CODEOWNERS` already falls under `.github/**` |
| Every `AGENTS.md` and `CLAUDE.md` | `extents.ts:53,78` defines the minimum; `classify` at line 290 and `judgeExtents` at line 476 read it |
| Current room extents named `rules` or classified `authority` | `rules-scope.ts:470`, `rules-scope-v11.ts:123`, `rules-scope-v12.ts:133` and `rules-scope-v13.ts:199` serve the observed value; `publication-policy.ts` checks its exact digest before classification |
| Aliases into any of these paths | `scope/src/github-host.ts:373` inspects both trees; `platform/src/extents.ts:290` classifies both directions |

The existing path grammar separately rejects `.git` and unsafe path segments.
This head changes no path grammar. It adds no setting or deploy step beyond
the planner's normal reviewed Worker deployment.

## Final evidence

The [pre-gate manifest](evidence/2026-11-09-r16-pre-gate.manifest.json)
(SHA-256 `a23da309987ce71c9c113a3ff95e3592601812c8ef8ef2ab80042f131a978176`)
seals 57 public files and complete private inventories of six raw units.
Each row names its output in that manifest. Raw receipts record UTC
intervals and Python monotonic outer durations. Each command has separate
`/usr/bin/time -p` output. These are separate measurements, not one run.

| Check | Command | Exit | Output SHA-256 |
|---|---|---|---|
| First compiler at `94db1b19` | `npm run typecheck` | 1 | `19a558bd3d328da599c62792163953548c26249ba9ca2aa12c1a03a8d6fc9ce1` (`r16-first-typecheck--receipt.json`) |
| Affected and unreached contexts at `187c9f56` | `tsc -p <context>` for the 12 recorded contexts | 0 each | `9faedb4e2196c1707fdaff92de3be23fd01ce89ba24ca4fe9debef2bfedc85ce` (`r16-typecheck-followup--receipt.json`) |
| First focused unit at `2b4f816a` | Node security owner, then frozen four-owner plan | Node 0; body 1 | `0c6868c2c44f053619cef1cc383e1d530743b574ca192ace9168a9ccf46a86e3` (`r16-focused--driver.exit`) |
| Package fixture follow-up at `765f7a97` | Affected compiler, then three incomplete whole owners | 1 | `d05d35e7bcafeeb9507a9ea1c2150029dfcee1f339db194495f1d89125be54e4` (`r16-package-followup--receipt.json`) |
| Complete follow-up at `242fc152` | Affected compiler, then policy 5, publication 5 and Lending 1 | 0 | `71ff46daa35890ef9dbd460ffe2bafd68894e9928a5c3be2520b0fdb388922ec` (`r16-replay-followup--focused--coverage-ledger.json`) |
| Host-policy bypass at `242fc152` | Policy owner, `--bail=0`, saved passing baseline | Owner 1; verifier 1; reconciliation 0 | `14c12eab6239cda3189c83be29ae08ce2d002e11ff02ff0076f574f4813c7ce6` (`r16-host-policy-control--reconciliation.json`) |
| Source-seal metadata at `187c9f56` | Maintained `sourceSeal` for two host-policy owners | 0 | `f2a7b47c2a56ee52c22b2f5e943bfda344f95c94a1c480e193d3dfa972b1b1f1` (`artroom-r16-source-seals-20261109.json`) |
| Full gate at `c96996de`, tree `81798a19aef0dc054d03e97dd73e862a7d9b9115` | `npm run gate` once | 0 | `9bac4cbf4661f3a009b9c2e55ed3cc05d89a80101c6a3ab7940bd482f6914895` (`classification.json` in the gate manifest) |

The first compiler failed because the new fixture widened its valid role
string to `string[]`. The repair keeps its literal type. Other workspace
pipelines passed. The follow-up ran the affected Scope test context, its
unreached Node support context and ten unreached root contexts. Later
test-only repairs passed the affected context. Production TypeScript stayed
unchanged.

The first Native body passed 14 cases, failed the current fixture package
because it omitted explicit result clauses, and interrupted three existing
publication cases. Ordered Lending did not run. The static ledger also
missed Vitest's quotes, a truncated parameter and the describe separator.
The failed ledger stays intact. Its complete eight-case Destination owner
passed; the seal driver reconciles its names against the static source and
same-run report without another run. Node's complete 11-case security owner
also passed at that head and remains unchanged.

The second body passed seven cases, failed the current replay because the
fixture omitted the actual device capability code, and interrupted two
existing publication cases. Lending remained unrun. The repair adds the
real `CAPABILITY_CODE` to replay. The final follow-up passes all 11 cases in
the three incomplete whole owners with an exact static ledger. Together
with Destination, it covers 19 cases in four owners. Only the new test file
changed between these source heads.

The new five-case owner covers bounded canonical Rules values, missing or
mismatched values, aliases, and unchanged requested control paths. Three
Native cases cover raw historical, trusted-package historical and current
device-package pins. Each refuses workflow, instructions, both CODEOWNERS
locations and a custom Rules authority path. Each keeps the specific host
diagnostic separate from the generic recorded reason. Ordinary files commit
and replay remains consistent. Both older routes publish through the actual
unchanged Lending definition. The current family uses its existing finite
device package; no new creation offer follows.

The control replaces only the host-policy call with an allowed result.
All three Native cases publish `.github/workflows/x.yml` and fail the
intended aborted-state assertion at line 159. Both pure cases pass. The
original verifier exits 1 because JSON abbreviates the received object.
A metadata-only reconciliation checks the full same-run stderr diff and
three exact JSON assertion locations; it exits 0. No control rerun follows.
The driver restores every tracked byte and closes its group.

Node 26.13.0, TypeScript 7.0.2, Vitest 4.1.12 and esbuild 0.28.1 come from
an owned physical dependency copy with 14 checkout-local workspace links,
48 source exports and fresh Vite directories. No installation changes the
lock. Real ephemeral workerd scopes, SQLite, Native creation, package
proofs, production adapters, Git objects and replay supply the witnesses.
Git provider maps, inspector reads, package HTTP and fixture clocks remain
explicit stand-ins. They prove no live provider or deployment.

Hugh's standing patch authorization covers the maintained source-seal
outputs. This head changes one existing seal and adds the new policy owner.
All route and gate assertions remain. Independent review must assess these
source changes and [kernel section 7](../../docs/kernel.md).

The [gate manifest](evidence/2026-11-09-r16-gate.manifest.json) has SHA-256
`bde4cd790fcb6c034f770e79485c29de58144034000893944cfc8a9e011f2d68`.
It seals 18 public files and the complete private inventory of 2,393 files.
I read `gate.exit`: exit 0. All maintained stages passed: Node 142, Counting
56, Plain 4,028 plus one skip, and Native 1,122 plus two skips. Reports
contain no contradictory, unhandled or coverage errors. The 102 unknown
observations reconcile to 34 Node file wrappers. Scale stayed outside this
change and the gate omitted it by the maintained path selection. No scale
case or archive attempt is claimed.

The gate ran from 13:42:25.355 to 13:58:51.612 UTC on 9 November, with
986.255 seconds of Python monotonic outer elapsed time. Its source snapshot
stayed exact and its group closed. Three process samples found no other
validation body; samples do not prove continuous isolation. After the gate,
only this note and its gate manifest change. Source and tests remain the
bytes that the passing gate checked. The exact final tree accompanies the
review request so it does not create a self-referential note hash.

## Open limits and deployment

Exact-head review remains due under `b300dca1`. The planner deploys after landing. This head changes no live room and supplies no live acceptance result. Declared prefixes and judged Destination policy remain deferred by ruling `d92b5f66`.

GitHub's [workflow reader](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
uses `.github/workflows/`. Its [ownership reader](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
uses `.github/CODEOWNERS`, `CODEOWNERS` and `docs/CODEOWNERS`.
The reserved-reader table above lists the repository-owned policy readers.
