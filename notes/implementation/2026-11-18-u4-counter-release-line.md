# U4: the Counter footer names its release

U4 (request `c8a2ba90`) witnesses an in-place upgrade of Counter from 0.6.0
to 0.7.0 on a hosted screen. Step A (report `e4f3dd02`, accepted in
`c7947159`) found that 0.7.0 keeps 0.6.0's semantic identifier
(`a5a44ebc`), so the upgrade can run in place. It also found that a user
sees nothing change between the two versions. Since the 0.6.0 signing at
`66c70688`, Counter has changed only its version string. The bundled client
changed only in U3's screen matcher and in command-line code.

A screen read before and after the upgrade must tell the two versions
apart. This head adds that marker.

## The change

`apps/counter/browser/view.ts` imports `apps/counter/dap.application.json`
and adds one footer line, `Counter <version>`, in a span with class
`release` and `data-release="<version>"`. The line is always visible, on
the installed screen and on the demo page. Each later version bump moves
the line with no second edit, because the version comes from the manifest.

The step B driver reads `[data-release]` and does not depend on layout
text.

## Release

The page changes, so the open Counter 0.7.0 presentation moves. The head
carries the new identifier in `apps/counter/release-identifiers.json` and
any seal that moves. The planner signs 0.7.0 from the main that lands
this head. A second head then adds 0.7.0's trust row.

The open 0.7.0 presentation moves from
`sha256:9df0d33ee9fc9cebf5be0d5d6562f6b37aecdbf8338cc338f3d2a63f1dfc41d7`
to
`sha256:70c32e9edc50ac6c5128fb0573f9703773bcac7098269fdd7b51b70832e5c15c`.
The semantic identifier stays
`sha256:a5a44ebcb0b85df701d08edda0ba53c54520eaa808b646635ffa13a1696bf77f`.
`node scripts/pins.mjs` passes every stage. No page or module seal moved:
the room page and the cards do not bundle the Counter view.

## Tests

`apps/counter/browser/app.test.ts`, in the stage-view test: the footer
holds one `release` span, its text is `Counter ` plus the manifest's
version, its `data-release` is that version, and it is not hidden.

## Red

| Red | What was broken | First failure | File | SHA-256 |
| --- | --- | --- | --- | --- |
| The footer names the release | `release` left out of `footer.append` | the stage-view test, `release.length` 0, expected 1 | `red.txt` | `0df1928fb31e02c0dca70ff404034ade420f0bae71ab67cb544b6c7d625a7c26` |

The output is in `artroom-evidence/2026-11-18-u4-red/`.
