# Explicit recovery of expired custody (CE-2)

Public MCP `settle` and a repeated CLI install can end an expired
original after a checked session journal proves its actor and idempotency key absent.
Expiry and a settlement `not-found` alone still end nothing. Card checks
keep their separate route: resend the exact expired original and retain
the scope's actual answer.

Request: `2ed36d706990a34cde46cfa05bf3404aa1391fce`.
Promise: `b1a1385d80e5c4a0059c35cdb697062d4c56c694`.
Precode `ad5955ea` and rulings `d264dea5`, `bc7d46d5`, `98c1dba9`
and `d41b97c3` bind the explicit callers, scope-time proof and Card case.

## Source and behavior

CE2 source checkpoint `8a08f2a5cad246fc02c2387343eceb689cc540fe`, tree
`7ec4d8b42bd456b30d07428e821d329598257c4f`, has fourteen CE2 paths and
parent `ed48b64d747f3af750a5f5d2a2a26ebed9a5a104` (LW-1). Its normal
commit hooks passed in 0.781430 s: 950 source files and 159 bytes exports.
The development records below bind their actual working-source hashes;
they do not claim one earlier clean CE2 head. The later CLI fixture repair
and four-case pass remain distinct from its earlier three-case pass.

The joined implementation checkpoint is
`38fec867b7c6034bf1319ddb23783ba73d445123`, tree
`b569f041c290f56f1f0be601e0aa0eb6a25ce228`, parent `8a08f2a5`. It
adds only the two permitted measured presentation fields. Actual gated
head and tree and gate outcome remain OWED.

`Reads.recoverAbsent` uses the caller's session and the existing checked
log reader. It checks the complete continuous chain from genesis to one
fixed head, its scope and pinned definition, and the absence of any entry with the
kept actor and key. The verified head entry's time must reach the signing's
`notAfter`. A local clock past expiry and margin is only eligibility to
ask. Filtered, refused, archived, incomplete, malformed or contradictory
history supplies no absence proof.

`Custody.absentIf` rechecks the exact latest signing, attempt, meaning,
pinned definition and incarnation under the existing lock before committing the
local `unsent` ending. The scope reads run outside that lock. A failed or
stale proof itself closes no signing and creates no `unsent`. Ordinary settlement
may separately retain a real Native outcome; that is not absence evidence.
The original envelope and history stay under custody. Admission bounds,
storage locks and the guidance to settle earlier records stay unchanged.
No full-trigger scan, timer recovery or eviction was added.

The CLI opts in only on an explicit repeated install. It asks for the
actual Native settlement first, so a landed original does not loop on a
mere journal-present result. MCP install does not opt in; public MCP
`settle` is its recovery entry. A later tool call on an already-unsent
record returns a truthful custody diagnostic without another proof or
ACT. NF-2 keeps its existing `{error,message,next}` failure shape: local
absence supplies no Native answer, receipt or new success tag.

Ruling `d41b97c3` extends the existing Native Card case without adding a
case or deadline. It restarts McpService on the same custody, loses a late
resend before delivery, and exercises the recursive
`resendExpired:false` check while the original stays unresolved. A later
deliberate check sends the original POST bytes once and gets Native's
`expired` refusal. Each check attempts at most one envelope; no new ACT
signature, proof call, full-log read or `unsent` ending appears.
Read-session authentication may sign a session request; that is not an ACT
signature.

## Evidence

All results below are ordinary development or controls, not a full-gate
result. Walls measure the actual commands, rounded to six decimals.
The table gives full SHA-256 values and the actual argv location in each
record. Root retained the reviewed safe development files permanently.
The three control destinations below await their gate-colocated copies.

| Check and source | Actual result and wall | Raw record, full SHA-256 and argv location |
|---|---|---|
| Initial shared Client/MCP source snapshots | Client source, Node and test compilers passed; MCP source and test compilers passed. Client owners: 24 passed, exit 0, 1.710543 s. MCP group: 32 passed, 1 failed, exit 1, 2.306083 s. Reads' 11 cases, the default-256 case and install words passed; errors retained an old unsent expectation. | `/Users/hughpyle/play/artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/artroom-ce2-focused-attempt1-20261115/result.json` (`dd61a884214eb32c0bfa66122285fda3f5bfe88afbbabe8267ee117654d5707c`); its sourceBefore/sourceAfter maps retain the actual input hashes. Actual argv: `results[*].argv` in that record. |
| Repaired errors expectation | Whole errors owner: 20 passed, exit 0, 1.678349 s. The earlier group remains FAIL. | `/Users/hughpyle/play/artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/artroom-ce2-errors-followup-attempt1-20261115/result.json` (`bb9702d43112750fccf618dcd67f56df532ed007043316c5cc5e0e8f03e4db9b`). Actual argv: `[*].argv` in that record. |
| Initial CLI/Card compiler interval | MCP scope and CLI source compilers passed. CLI test compiler failed TS2353 on the fixture's unsupported `platform` property, exit 1, 0.487452 s. Later commands UNREACHED. | `/Users/hughpyle/play/artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/artroom-ce2-cli-card-dev-attempt1-20261115/result.json` (`ffee95a9fee03d52d88dcf8893e9cec0d9c6f7abb766c827fa0c46185471eb6c`). Actual argv: `results[*].argv` in that record. |
| Corrected CLI fixture; loopback setup refusal | CLI test and scope compilers passed. CLI owner failed beforeAll on OS `listen EPERM` at 127.0.0.1: no case body ran; all three cases skipped. Exit 1, 11.622660 s; Card UNREACHED. This was a setup failure, not three failed behavioral cases. | `/Users/hughpyle/play/artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/artroom-ce2-cli-card-dev-attempt2-20261115/result.json` (`cf6c32b4e07106870d3476ec2f27548e636957d96c15d6d3ebf593332e5eede0`). Actual argv: `results[*].argv` in that record. |
| Exact permission retry on unchanged inputs | CLI owner: 3 passed, exit 0, 5.034856 s. Whole Native Card owner: 21 passed, exit 0, 56.577145 s. Card stderr retained two existing Native fixture lines. | `/Users/hughpyle/play/artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/artroom-ce2-cli-card-dev-attempt3-20261115/result.json` (`23433111c900bc2d6e7cdfc954b725ca0712cfaa5768e328f65ff248e2587ebc`). Actual argv: `results[*].argv` in that record. |
| Checked-head time control | DISTINGUISHES, helper exit 0, 3.540921 s. Reads owner: baseline 11 passed; mutant 10 passed and 1 assertion failed, returning absent where unproved was required. | Gate destination: `/Users/hughpyle/play/artroom-evidence/2026-11-15-ce2-lw1-full-gate-attempt1/controls/expiry-control.stderr`, SHA-256 `e5f3cd315e5ad299dda961b7ea741b84e846208b1c25122eeea076c9cea0a042`; actual argv: retained control result.json `results[0].argv` below. |
| Snapshot attempt control | DISTINGUISHES, helper exit 0, 3.583646 s. Custody-signings owner: baseline 20 passed; mutant 19 passed and 1 assertion failed, applying a stale proof. | Gate destination: `/Users/hughpyle/play/artroom-evidence/2026-11-15-ce2-lw1-full-gate-attempt1/controls/attempt-control.stderr`, SHA-256 `fdd8e8273c3ca9559dbeca1be2b4fefe62f7762fd3ed06abf3978c4ba17d192c`; actual argv: retained control result.json `results[1].argv` below. |
| Card exclusion control | DISTINGUISHES, helper exit 0, 111.856159 s. Card owner: baseline 21 passed; mutant 20 passed and 1 assertion failed because recoverAbsent was called once. | Safe-only gate destination: `/Users/hughpyle/play/artroom-evidence/2026-11-15-ce2-lw1-full-gate-attempt1/controls/card-control.safe.txt`, SHA-256 `9552f839c921e79cc16ae3d4df524b315350d88068cd7695f4884de0f6c2caf1`. Actual argv: control result.json `results[2].argv` in the control directory below. Signed-request dump WITHHELD privately. |
| Page freshness and Security | Page assets owner: 1 passed, exit 0, 0.769151 s; no asset changed. Whole Security owner: 12 passed, exit 0, 3.885271 s. | `/Users/hughpyle/play/artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/artroom-ce2-page-security-attempt1-20261115/result.json` (`6ed960873853f7ab699cd2b9ab7a02c05d3706748a824e65d1bdee2bd1d886ff`). Actual argv: `results[*].argv` in that record. |
| Reviewed MCP source seals | One maintained calculation: exit 0, 0.212509 s; complete 39-record inventory. Four changed/new records: module, McpService, unsentRequest and absenceRecovery. | `/Users/hughpyle/play/artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/artroom-ce2-mcp-seals-20261115/result.json` (`928876fd39cfb0b23411f03c10e5ea59cb1ceddc2342d762e7f072b00155dcf0`), with execution.json beside it; service source SHA-256 `65f74e018bcdeec72c466c725d299e9d632855492a7b0e70a5fb061f897630b8`. Actual argv: execution.json in that directory, SHA-256 `a967c88970129a73363ce9148268a346209e9edbaa9dc5ec435ec507c4efb7d8`. |
| Native-settlement-first CLI extension | All three CLI compiler contexts passed. Extended owner: 3 passed, 1 failed, exit 1, 4.759609 s. The new landed-original fixture omitted required Counter target 7; the prior three-case pass remains historical. | `/Users/hughpyle/play/artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/artroom-ce2-cli-liveness-dev-attempt1-20261115/result.json` (`f1d1f11d20e6301310c0235acdee1594096deb2b8832b8871b8ee44eb14b7158`). Actual argv: `results[*].argv` in that record. |
| Corrected landed-original fixture | Fixture supplies the required `--values` target and asserts actual judged acceptance. Affected CLI test compiler passed; whole CLI owner: 4 passed, exit 0, 4.393699 s, empty stderr. Source and scope compiler passes stand on the unchanged final runtime source. END `0b3d46ff`. | `/Users/hughpyle/play/artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/artroom-ce2-cli-liveness-dev-attempt2-20261115/result.json` (`a759850fe766b3351899e6e7b073814ed3f1e265f1d9215106cde5694e9423db`). Actual argv: `results[*].argv` in that record. |
| `8a08f2a5`: once-only normal three-way comparison | PASS, exit 0, 1.888492 s. Grow 2.0 exact; all entries, definition lists and semantic IDs exact. Only Lending and Counter 0.4 presentations changed. END `b7f7ded2` initially stopped adoption for planner disposition. Stderr retains DEP0205. | `/Users/hughpyle/play/artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/artroom-ce2-lw1-id-compare-attempt1-20261115/comparison/comparison.json` (`8f61f97b3d4768aa6ce4505ec49e95f75bb8b42cbfdde52d26a5af684a2868f9`), with execution.json in its parent directory. Actual argv: ../execution.json, SHA-256 `00c9eac0da06aa58de1183d650a9f9049cbe612563b49eba4d97638197dd2ed3`. |
| `38fec867`: permitted identifier apply | PASS. Normal apply: exit 0, 0.266111 s; only Lending and Counter presentation fields changed. Normal formatting hooks and commit passed in 1.216504 s; source clean. END `de371b383e5a807e63eed01c106c4797f96c5009`. | `/Users/hughpyle/play/artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/artroom-ce2-lw1-id-adoption-attempt1-20261115/result.json` (`4c1dcee01470991cb47cd3692dc3569dc9b55768b50d55b67c2e03e8e84516af`); actual command and commit streams beside it. Actual argv: `results[*].argv` in that record. |
| `38fec867`: whole CLI examples and release reproduction owners | PASS: examples 3 plus reproduction 1, all 4 passed; exit 0, 7.245860 s, empty stderr. Normal preparation reproduces all three committed tuples. Compatibility passed. END `eee6f777083cd17a9d595a3a839de32e2b5ac273`. | `/Users/hughpyle/play/artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/artroom-ce2-lw1-reproduction-attempt1-20261115/result.json`, SHA-256 `9d66bd799434f9f6634e85bdf1f98995ff2a69da72fd9b6136cfb546484d3049`; actual argv: `results[*].argv`. |
| Permanent safe development retention | 61 explicitly reviewed files; no full Card request/display dump copied. Metadata record, not a test command. | `/Users/hughpyle/play/artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/retention-index.json`, SHA-256 `06bb9e468eb9aff6dbaf213b16689a5bdc13df69291d88cef325d520c2caf3b2`. |
| Final preflight, joined gate, Card workflow and review | OWED. No gated head and tree, gate PASS or browser PASS is claimed. | Future records not yet available. |

Each control changed only its named guard and restored exact source bytes
and mode 0644. No third green ran. The retained helper changed only its
retention at exit; classification, runner and deadlines stayed unchanged.
The retained control metadata directory is
`/Users/hughpyle/play/artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/artroom-ce2-guard-controls-attempt1-20261115`.
Its result.json (SHA-256 `48675c0575ce2facb4e84fa406d87f9065718d423e962a11bf11ec7943ebfaf1`)
retains actual argv in `results[0..2].argv` and the helper identity.

The Card control's full stderr and after.json contain a full signed
fixture custody/request dump. Root retained eight original files under
`/Users/hughpyle/play/artroom-private-evidence/2026-11-15-ce2-card-control-attempt1`;
those payloads are WITHHELD from public evidence. The approved safe source
is `/Users/hughpyle/play/artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/artroom-ce2-control-safe-retention-20261115/card-control.safe.txt`.
It retains only byte-exact allowlisted counts, verdict and assertion
headline, with the SHA-256 in the table. No rerun supplied that summary.

The passing Native Card owner's full stdout can also hold ACTOR-RECORD
display/envelope dumps. Its originals stay in the private tree's
`native-owner`; the table cites only safe driver metadata. Its two finite fixture stderr events are safe, and root
can separately export inspected exact pass/count lines. No recursive raw
copy is authorized. Full gate stages likewise stay private; root must
inspect gate.log before any release and retain safe numeric CE-phase
records separately.

## Limits and remaining work

The default-256 witness uses real SQLite custody, real signatures and
McpService admission. Its other-signer destination entries use the actual
in-memory Platform/Derive judgment, seal and fold. Membership, session and
HTTP authority remain scripted. This is not a hosted-service, Native
Worker or sealed-floor acceptance proof. Rejecting floor-shaped history
and the source audit do not supply such runtime evidence.

The initial reporter hid the default-256 case's cost log. Recovery RPC,
page, entry, prefix and byte costs therefore remain UNMEASURED. Retain
actual cost observations from the ordinary owed gate's verbose/progress
output; do not rerun the 256 population just to complete this note. The
owner PASS establishes its assertions, not an invented runtime cost.

The CLI recovery rows reopen real file custody through the runtime
callback; they create no new process. They do not prove Native Worker
session authority. The older CLI launcher witness separately covers its
stated process/module boundary. No provider, live Git host or production
key ran.

The model audit found no changed protected observe/http/oauth lifecycle
function. No model execution, coverage-pin advance or new formal claim
follows. Existing formal assumptions do not prove journal absence or
storage atomicity.

The once-only comparison measured Lending presentation `188f7b84…` and
Counter presentation `52378055…`. Counter's presentation changes because
its browser bundle includes the Custody class that CE2 changes.
Planner ruling `0955cc13b38a32a23ba27e2d2d5b0384a0f3935c` authorizes
applying both measured fields once, with both versions open at 0.4.0.
The normal apply committed those fields once at `38fec867`; it changed
no version, pin, definition, scenario or signed packet. The exact adopted
Lending presentation is
`sha256:188f7b84e6b1ba29c2090265f4d7884a29884beff6ea58774a34ce8fbeef9f81`;
Counter's is
`sha256:52378055c218a42c6808af21fea097b69e42b9cc52877f3cec12ad432df8ff9e`.
The stop rule still covers Grow and every entry, definition list and
semantic identifier. Whole reproduction passed at `38fec867`.
Exact-head preflight, one joined gate, maintained Card browser workflow
and review remain OWED. The earlier RS1/LS2 gate does not discharge them.

RS1 and LS2 landed at `ce6f02ba164982dce9ead6b85c9e482ca1829f07`,
with reviewed tree `04cd7584658e2e0874344b391cb2aeb045a88c29` and normal
receipt `fdb8fbee7c175e3896360898ec76f65d32708fc6`. Both original promises
are satisfied. Checker `f2af19af` found the landing clean, and planner
origin act `6b7b421e` published that exact main. Planner reported that
each dry-run Worker bundle equals its deployed bundle, so no deployment
followed. The builder made no push or deployment.

The private integration at `7eeef11e32bfc7a8b7abe7b0475a669b5c720d7a`
preserved its full tree `4f60bede997e90fed310cd53615a989f2450ab45`.
That is the implementation checkpoint plus the two evidence notes.
Rulings `df8040e5` and `6b7b421e` end the pre-origin gate allowance
and release one gate for the head that contains published main.
Planner owns later 0.4 signing from main that carries the joined head.
