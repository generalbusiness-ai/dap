# Static sources for the readable diff proposal

These files describe the proposal in [Read large diffs one file at a time](../implementation/2026-11-02-readable-diff-design.md). They change no product code. The HTML contains static proposed DOM, inline CSS, and native disclosures. It contains no script, RPC bridge, parser, or live read. The browser's color scheme selects the theme, and its viewport supplies the width.

The three cases have distinct sources:

- `ten-file.html` and `ten-file.DATA.json` use the successful local J2 fixture. The full files retain the exact bytes from history range `5f42f885..cbc844c4`. Local synthetic commits hold only those ten changed paths. The default index closes every body.
- `interdiff.html` and `interdiff.DATA.json` annotate the retained deployed J2 Version 2 to Version 3 answer. One file is a definite edit. The other remains uncertain against the changed base and retains its two separate version statements.
- `truncated.html` and `truncated.DATA.json` use the successful local J2 fixture with exact file bytes from `09420198..86afb6a5`. Eight paths arrived. The original answer omits the final 385 patch lines of `hosted.scope.test.ts` and every later path.

The DATA format is an offline design annotation. The server does not emit it. Each patch names its own endpoints. Each hunk keeps its original range, typed source rows with endings, and completeness flag. `group` retains the answer's attribution. Local open state belongs to HTML, never to that attribution. These inputs do not define a finished production wire schema.

`card-frame.css` copies the current card stylesheet at the evidence checkpoint. `proposal.css` records the added visual rules. Each HTML file embeds both so the preview needs no server or outside resource. Only native file, context, and commit disclosures work. Disabled read buttons show placement for the existing whole-file action. They promise no context-range action.

The three PNGs under `renders/` copy unmodified browser captures. The implementation note's evidence manifest covers the complete twenty-image final series at both widths and themes, the twelve-combination DOM checks, byte accounting, provenance, and earlier attempts. Hugh's decision follows review and landing, before implementation.
