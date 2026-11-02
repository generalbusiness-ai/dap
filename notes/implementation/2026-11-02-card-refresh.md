# Open card sections survive automatic refreshes

## What changed

Request `76a1c0209823f83d229b232b7645ac1440f5ede0` and promise
`41aedfd1b36a381c85c51051d111a8df0b5cc92e` own this head. Product and test
source freezes at `e0b21985cac267abc5c0d2313e511d2201099302`, tree
`e67e36e796691fc25434c23192a05540e2b83969`.
After the gate, merge checkpoint `2f006269794e771b565f3fbc78102d21b8dc3059`, tree `0d283229061673a2d598a00ed9d3e25691b60fb5`, brings the landed first-press note and manifest. The product, tests, configuration, and Card inputs remain byte-identical to the gated source. Only this note and its manifest follow.

A card now keeps a reader's open and closed sections when a refresh replaces
its DOM. **Read points**, **Exact record**, and **Recorded samples** keep their
state while the reader stays on the same card. A changed cut or revision does
not close the section. A different item, view, page, or scope starts with its
own state.

The [Card workflow](../../.github/workflows/views-browser.yml) now runs
`packages/mcp/test/grow-routing-browser.mjs` after its other two scripts.
Its pull-request and push filters include that script and its direct Grow
support files. [The testing guide](../../docs/testing.md) describes the three
scripts and their citation rule. It replaces the old warning about a refresh
closing **Read points** with the behavior the script now checks.

## The decisions and why

[The renderer](../../packages/mcp/browser/main.ts) records each named details
element's current `open` value before replacing the card. It restores both
true and false values after building the next DOM. Keeping only open sections
would forget an explicit close.

The saved values apply only when the rendered card identity matches. That
identity includes the view, screen, page, card kind and item, subject, full
scope reference, and sorted query items. It excludes the revision and cut,
which an ordinary refresh can change. The renderer keeps no history of other
cards. An item that disappears during refresh cannot lend its open state to
the replacement item. Navigation also starts a new set of values.

The three disclosure roles use stable names. A missing role receives no saved
value. [The series panel](../../packages/mcp/browser/series.ts) names its sample
section so it follows the same rule. Declared surfaces retain their existing
shadow DOM and their own state through `SurfacePanels`. This change does not
rebuild that behavior.

The existing browser owner now checks two automatic refreshes while a section
is open, an explicit close through another refresh, replacement during a
refresh, and navigation to another item. It runs at 592 and 320 pixels. The
scripted fixture changes its displayed revision on each projection. Its
test-only replacement method simulates an external item change without
signing an act. Each refresh scenario records zero signatures.

Those fixture checks control the browser clock. Pausing the clock also pauses
animation-frame resizing, so clicks first advance up to ten 50 ms frames and
check the host's measured height. Two early harness attempts hit the original
30-second click deadline because the host had not resized. The retained
failures remain failures. The settled driver advances the frames and keeps
the original deadline. It resumes the clock before the existing layout checks.

The Grow routing owner uses the real automatic refreshes. It counts completed
read requests and waits for the card's final non-busy render, then checks that
**Read points** stays open across two refreshes and closed after an explicit
close. It then continues the original assignment, watering, custody, and replay
checks. Both widths and their resize checks run unattended. The generated card
module includes the rebuilt sources.

## The final evidence

The [evidence manifest](evidence/2026-11-02-card-refresh.manifest.json) records
177 files in 5 readonly units. Its SHA-256 is
`30a4045e3fc65b9a5efee48699554775e0ea9b85fe461e26a4800a6841aa9f53`. Keep these units for at least 30 days after landing.
Each unit names its checkpoint and qualification. Whole Native proof bodies,
actor records, and CI consoles stay private. Public records retain their byte
counts, hashes, and safe result summaries.

The local browser checks used cached pinned Playwright 1.63.0 and Chromium
revision 1243 on the shared Mac. The Browser plugin was unavailable. The local
checks ran on an uncommitted refresh draft atop `7b691a39`, before its base
fast-forward to the isolated first-press test repair `2f825e32`. No complete
frozen draft snapshot was retained. These runs support development. The exact
source workflow below proves the final composition, including the new Grow
workflow step and its support-file filters.

The targeted fixture checks render real card DOM over scripted projections.
They establish no hosted authority. The Grow routing owner uses actual owned
Core and SQLite Site and Room scopes, MCP signatures, custody, and replay,
with TEST installation, membership, sessions, and grants. It performs no
provider or device operation. The views owner reports 84 rows, which are
reported observations rather than 84 independent tests. Its safe summary
records no browser errors and both refresh scenarios with zero signatures.
The retained screenshots show the open sections and wrapped content at both
widths. The implementation review inspected the 592-pixel and 320-pixel
target captures and the 320-pixel unavailable Grow card.

Two controls use the unchanged targeted driver. Forcing restored sections
closed fails the first-refresh assertion. Ignoring the card identity fails
the assertion that a replacement item starts closed. Each deliberately failing
run stops at its first expected assertion at 592 pixels. Its later 320-pixel
case is unreached. The normal driver passes both widths. The control runner
restores exact source and generated-module bytes afterward; their hashes match
the frozen source.

[Card workflow 41426562339](https://github.com/generalbusiness-ai/dap/actions/runs/41426562339)
succeeds at exact source `e0b21985`. The generated-module check and all three
browser steps succeed. Earlier run `41426211106` belongs to source `97bb3d6f`
and does not supply final-head proof.

The actual `gate.exit` is 0. The before-and-after guards match the clean source `e0b21985` and tree `e67e36e7`. Every gate stage passes. Its terminal output reports 132 Node passes, 56 Counting passes, 3,565 plain passes with one skip, and 1,029 Native passes with two skips. These counts come from the terminal gate output, rather than the optional progress stream. The test stage takes 1,188.6 seconds on this shared Mac. It is one observed stage duration, not a performance guarantee. The full test log stays private. The later first-press merge changes only its note and manifest, so the documentation follow-up rule applies.

| Check and checkpoint | Command | Exit | Output SHA-256 |
|---|---|---|---|
| First clock-paused draft; reconstructed tool result | node --import tsx first-driver.mjs | 1; original click deadline | 55889cd02ada28d151677f8728f98a178b25ef55f35093540b58112ec09084fa |
| One-frame resize attempt | node --import tsx sized-driver.mjs | 1; original click deadline | 7eb90fe2db82280644e91369ea8461add9cfe278b55a2043f23ff88db47d82a2 |
| Settled clock and resize; both widths | node --import tsx settled-driver.mjs | 0 | 91126fd9fb3b11e49858e767b35e77c81594529911c05360cb80f6974013a6c9 |
| Replacement and navigation; both widths | node --import tsx replacement-driver.mjs | 0 | de06a88942805258cdf974d17b7becd4955f4479f20dec919e40173548418d72 |
| Forcing sections closed distinguishes | node --import tsx driver.mjs after forget-open fault | build 0; child 1 at expected assertion | 0e4a0b87bfa256f8517631271a6c0ded2d0fd2e1f7e0faeba80635af2563877d |
| Ignoring identity distinguishes | node --import tsx driver.mjs after borrow-item fault | build 0; child 1 at expected assertion | 28b473623c33654495fd09dde1d9774569a1440327135cb36b9f4b6cee8947f0 |
| Whole local Grow routing owner; qualified draft | node --import tsx packages/mcp/test/grow-routing-browser.mjs | 0; both widths; replay consistent | 3572ebc700dcdc57f9f652c0726b71a66471a5e86ff136fd21d2bacfa8d109a4 |
| Whole local views owner; qualified draft | node --import tsx packages/mcp/test/views-browser.mjs | 0; 84 reported rows; no browser errors | ab9d401241979f651a56b21f06b1e60f6cc5def3ab2f674b0747f682bd73e46f |
| Exact-source Card workflow at e0b21985 | gh run view 41426562339 --json conclusion,headSha,jobs,url | 0; workflow success | 1d72c6973d0083e848e1d8fdabc4626ec9025170e7edf1407c0fb90b472813aa |
| Frozen full gate at e0b21985; tree e67e36e7 | /usr/bin/time -p npm run gate | 0; matching source guards | e56dd9f87b1dace3fe7cebff24e82d8cfe50b7f48245f819f463b6c8c50e990c |

## The open limits

- Request `76a1c020` establishes refresh behavior and an unattended browser
  workflow. Its fixture observations prove no deployed room or person-operated
  Desktop outcome. The planner owns deployment after the approved landing.
- Request `368ddc87` owns the first-press source this branch builds on. Its two
  failed gates and isolated passing follow-up remain separate in
  [its implementation note](2026-11-02-first-press.md). This refresh record does
  not change those outcomes. First press retains landing priority.
- Request `353a0ec0` owns the readable diff design. Hugh still chooses a render
  before any product renderer build. This refresh changes no diff renderer.
