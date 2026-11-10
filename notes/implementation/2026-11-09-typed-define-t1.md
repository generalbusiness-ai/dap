# DX-T1 typed definition authoring

Request: `00c50371c458e0bd04888f56ee04fe2e86169813`.
Promise: `b1c862b21b52ec13aacd209a09c0196d1dc194ea`.
Placement: `176190ba6ef0c0a642b1cbec0c25577c0353a8a1`.

## Changes

Promote the settled typed surface to `@generalbusiness/dap-define`.
Lending and Counter compose authored values through the package and expose
normalized declaration data to their existing consumers. Their retained
JSON and pin files remain unchanged in this source checkpoint.

The helpers cover literals, `on.take`, sibling subjects, grant and reason
vocabulary, inline rules, item quantifiers, item and act values, and
compiler diagnostics. Record list fields infer their members. Fetched
lists require an explicit `elements` annotation for member access.

## Decisions

Keep `compile` outside ordinary production imports. The pin check compiles
the authored sources, compares canonical JSON formatted with Prettier, and
compares the exact pin source files. Its default mode writes no output.
The existing Counter producer forwards to its explicit regeneration mode.

Keep the historical spike folders. Grow Room and the selected Change rows
remain canonical-spelling fixtures until the planned pin migration. Grow
Site receives the original Room digest. Manifest, story, and production
Grow migration remain with their later requests. The preserved spike
suites retain their manifest and story assertions; the supported package
adds declaration witnesses without importing those later prototypes.

The package inherits the normal strict configuration without a
`skipLibCheck` override. Its tests belong to the plain root project group.
The gate summary includes `define` and reports its observed module count,
state, and duration alongside the other projects.
The kernel dependency direction remains unchanged.

## Validation status

The first focused run used source `98859d99144073836a806fc03a7ee19c43999f96`,
tree `b9fd8982b421276f3aecaf71419d666f0c144b10`. The launcher, driver, and
maintained pipeline each exited 1. Compatibility preparation exited 0.
Counter's browser compiler found the missing `normalize` import and
reported unknown rule values. No compiler passed in that attempt.
Adding only the import resolved all of those compiler diagnostics.

Continuation 1 used source `97b82970f9fb1770d678a14873de4b9a8f134553`, tree
`6ae16d91789f42793914af75dae58d31a591d5e3`. Its maintained pipeline exited 0:
all 13 compiler contexts and all 25 plain cases passed. The following Node
aggregate exited 1, with seven passes and two failures. Both failures
belong to the five-case public release owner: the actual Git source exports
`./diff`, but the exact release exclusion tables omitted it. This repair
adds that path to both exclusion tables. Git's two public exports, five
portable source inputs, dependencies, and existing assertions stay intact.

Selective continuation 2 reran the whole five-case release owner and the
six-case runner owner, then ran the pin check. All three actual exits were
0 at `9f9dacf591df07195d78b147bd729ee781736a34`. The runner
registers the existing release owner once in the fixed Node stage; its
existing first test checks the actual argv entry. The partition and
summary owners' four passing cases retain their unchanged evidence.
The 13 compiler and 25 plain passes remain at `97b82970`: merged B changes
some Scope/MCP compiler inputs. The final gate must check that integration.

Raw evidence remains under `~/play/artroom-evidence/` in
`2026-11-09-t1-focused/`, `2026-11-09-t1-focused-launch/`,
`2026-11-09-t1-focused-continuation-1/`, and
`2026-11-09-t1-focused-continuation-1-launch/`. Both launchers recorded their
owned groups closed. Failed attempts and raw artifacts stay unchanged;
each continuation uses new evidence paths.

The pin check confirmed exact retained JSON and pin-source byte equality.
One named refusal control then ran at clean `9f9dacf5`: the existing
missing-genesis witness passed, and bypassing only the final diagnostic
throw made that witness fail with the expected assertion. Each invocation
collected all ten owner titles and skipped the nine unselected titles.
The control restored source SHA-256
`75530d52ea14d3a8e5710d9bf9cf9cce3adb21430c01397207937433147ef463`,
closed its owned groups, and exited 0. It proves this final refusal
boundary; it does not prove every diagnostic correct.

Separate owner-private metadata audits retain the three attempts and the
control under `2026-11-09-t1-pre-gate-audit/` and
`2026-11-09-t1-control-audit/`. They preserve failed attempts, exact case
identities, source/tool/dependency proofs, restoration and raw-output
hashes. Raw reports and fixture payloads stay in the original private
units. The control audit leaves the earlier audit's time-specific UNRUN
statement intact.

## Authoring corrections

Planner ruling `75cea6c4db735df25ad1eb62de0e46c844f4a4d7` requires three
source corrections before review. `row.self` keeps its whole-element
meaning. The exported `elementMember(row, name)` reads every declared
record member, including `self`, without reserving a callback method.
A required phantom carries declared keys only on record element types.
Scalar and unannotated elements cannot use this helper.

The rule package exports `ruleReferences(source)`, which returns plain
field and value-slot name arrays from the existing parser's checked AST.
It evaluates no expression and preserves admission refusals. Findings
use these names instead of scanning quoted text; validator diagnostics
still report profile refusals. A dotted validator index now selects the
complete offending form, just as a bracket index does.

Exactly three new authoring cases cover these counterexamples. Existing
strict type witnesses check member spelling and reject non-record uses.
The existing derive profile case also checks plain reference results and
unchanged refusals. The future compiled public SDK witness imports the
new rule helper. These repairs have no compiler or test result yet. The
final gate remains owed; read `gate.exit` before reporting its result.

## Generated assets

The initial static trace from Page, OAuth, and Card production entries
reached no C-authored Lending, Counter, or `define` source. The later
rule-reference repair changes a shared derive module that those clients
can reach, so that trace no longer settles their generated outputs.
Their builds may remove the unused helper export; source inspection
cannot establish exact bundled byte equality. C inherits A's rebuilt
shared-client assets, then checks whether this repair needs regeneration
before its final gate.
Counter's browser and maintained Counting witnesses read the new authored
value; their build outputs are transient, with no tracked canonical module
to refresh here. No generator ran for this inspection.

## Release integration

Planner ruling `92c1bf7141c0509343bb471c7ac4caf18bf327b5` includes
`define` as the ninth portable package. Its source version stays
`0.1.0-dev.1`; the producer maps its three coordinated dependencies to
the selected release version through the existing manifest rules.

The release plan, exact package list, manifest checks, and release guide
include the package. The producer supplies the same opt-in Web API types
as the existing portable consumers. The checker prepares a compiled
helper journey with a typed source value, runtime validation, refusal
metadata outside the pin, and strict NodeNext and Bundler consumers. The
standalone checker requires the compiled `define` stage in its browser
bundle.

`@generalbusiness/dap-define` is in the release plan, and its
compiled-output check and publication have not run.

Planner ruling `0a797a2e3e8230675ddccb86052237f01faff696` leaves the
standalone checker with the next publication request. Head C owes the
release plan and its plan-shape and package-count gate witnesses. Its
focused plan and gate start no additional package producer or capture
scene. Existing portability and output-closure assertions stand.
