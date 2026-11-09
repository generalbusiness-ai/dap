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
The first compiler context, Counter's browser, exited 1 because Counter's
new declaration called `normalize` without importing it. The log also
reports unknown `rule` values in the browser model; the missing export
binding may cause those diagnostics. This repair adds only the import.
It changes no browser or declaration type.

No compiler passed. The other 12 compiler contexts, all 25 plain cases,
all nine Node cases, and the exact pin check remain unrun. The continuation
must run all 13 compiler contexts before those unrun phases. Compatibility
may reuse its successful receipt only while the pinned bundle, tools, and
dependency view remain unchanged.

Raw failure evidence remains under
`~/play/artroom-evidence/2026-11-09-t1-focused/`, including
`pipeline/context-00.log`, with actual outer exits under
`~/play/artroom-evidence/2026-11-09-t1-focused-launch/`.
The launcher recorded all owned groups closed. The failed run and its raw
artifacts stay unchanged; a continuation uses new evidence paths.

Focused checks, a meaningful compiler refusal control, and the final gate
remain owed. Merge current main before the full gate to include the runner
changes. Read `gate.exit` before reporting the gate result. Exact pin
equality remains unproved until its checks run.

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
