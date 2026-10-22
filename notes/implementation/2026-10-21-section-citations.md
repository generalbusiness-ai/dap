# D2 section citation check

Request `0270882bfe139d554f844837aba6d0696204229c` makes the two normative
references available on Main and checks the numbered sections that comments
and documents cite. Promise `0b9a12016b7b54b43ec977c0610e65aa2620e13d`
tracks this implementation. The builder wrote the checker and its later
corrections. The self-audit is not an independent review.

## Normative references

Main adopted these documents in `83835d5b3`. Their introductory status
paragraphs name the revisions in force and point readers to
[the scopes guide](../../docs/scopes.md). This implementation changes neither
document's prose nor section numbers.

| Document | Revision | Current Git blob |
|---|---|---|
| [Scope and replay contract](../2026-10-04-scope-and-replay-contract.md) | 23, from `3b3e394f` | `c10f8ff2496e01753f5d60acac6ee5a7d6b5e3da` |
| [Authority, effects and publication](../2026-10-04-authority-effects-and-publication.md) | 28, from `8b1c3c9d` | `5d9e701b58b834203ba668c2b622406c8b3f0e96` |

Both blobs match landed Main `373f1e5926a297769f678dd7fba8d7d13018c7c4`.
The private D2 merge preserves that commit and its preceding README edits.
The branches changed no common paths, and the merge had no conflicts.

## Checker behavior

[The checker](../../scripts/check-section-citations.mjs) reads tracked and
untracked supported files. It scans Markdown prose and comments in
JavaScript, TypeScript, JSX, TSX, JSONC, CSS, HTML, and shell files. The
JavaScript parser masks strings, regular expressions, template raw text,
and JSX text before comment extraction. Markdown fences are examples,
not prose citations. Dated notes are scanned without a directory or age
exemption.

The checker compares cited numbers with numbered Markdown headings. It
recognizes the two normative document names, explicit document paths,
section lists, and bounded ranges. Markdown links bind to their actual
relative document, including bare filenames and same-file fragments.
Parentheses after a named document do not hide the citation.

A source file with one introductory reference can use that document for
bare section numbers. A citation to an unidentified manual, specification,
guide, or other recognized document description remains ambiguous rather
than inheriting that default. Unknown names, unsupported ranges, and
duplicate numbered headings remain visible for review. The checker does
not choose a document because its heading happens to match a number.

The report records each citation's file, line, numbers, target when known,
and status. A new unlisted missing heading makes the command fail. An exact
listed finding remains `known-unresolved`, separate from resolved citations.
The list binds its source file, target, missing numbers, complete excerpt
SHA-256, and one expected occurrence. A changed, duplicated, or stale
finding makes the command fail. Line numbers are informational, so an
unrelated line insertion does not change an exact finding's identity.

The gate runs the checker and its Node tests before typechecking. To write
the complete JSON inventory to a new file:

```
	node scripts/check-section-citations.mjs --report /tmp/new-citations.json
```

The one runtime-source change corrects the founding comment in
`packages/scope/src/core.ts` from authority heading `7.1` to `3.8`.
The method's executable code is unchanged.

## Five visible unresolved findings

[The exact findings list](../../scripts/section-citation-findings.json)
contains these five occurrences. The first three predate the parenthesis
correction. The last two were exposed by it and explicitly listed after
root adjudication. Their prose stays unchanged.

| Source occurrence | Syntactic target | Missing heading numbers | Disposition |
|---|---|---|---|
| Scope contract, line 1530 | Authority note | `17.2a`, `17.3` | Planner-owned mixed reference. |
| Carry-pass amendment, line 14 | `docs/protocol.md` | `35` | Historical proposed placement. |
| Carry-pass draft 3 decision, line 62 | `docs/protocol.md` | `35` | Historical proposed incorporation. |
| Scope contract, line 11424 | Authority note | `15.3a` | Adjacent-document binding does not resolve. Document-owner review is needed. |
| I2 delivery note, line 25 | `docs/lanes-reference.md` | `9` | Adjacent-document binding does not resolve. Document-owner review is needed. |

The last two parentheses may refer to their source document's own contents.
The checker does not infer that intention or rewrite the target. All five
rows remain unresolved. A matching heading establishes neither semantic
agreement nor that the code follows the cited rule. This change establishes
no such compliance claim for these rows or for resolved citations.

## Verification and remaining work

Before the Main merge, the seven focused Node cases passed with natural
exit 0. They cover explicit document binding, syntax extraction, historical
inputs, relative and same-file links, parentheses, ambiguous manual names,
and exact finding drift. The command-level control changes a named citation
to a missing heading and requires the real command to exit 1.

The corrected first inventory exited 1 and exposed the two additional
parenthetical findings above. After their exact listing, one inventory
exited 0: 2,069 supported files, 1,866 resolved citations, 12,643 ambiguous
citations, five known unresolved findings, zero new broken findings, and
zero listing errors. These counts describe the pre-merge input snapshot.
The unchanged Node suite was not repeated for the findings-only edit.

The focused evidence preserves source byte copies, source and dependency
hashes and modes, tool identities, the lock stamp, raw output, natural exit,
and command times. The before and after guards found no changes. The two
evidence directories are
`/private/tmp/artroom-d2-citation-corrections-focused-20261021-v1` and
`/private/tmp/artroom-d2-citation-list-focused-20261021-v1`.
The integrated inventory and merge record are retained with the handoff.
These are focused Node checks, not a final gate or native evidence.

The final exact-head `npm run gate` is pending. Checker review, landing on
Main, and any later deployment remain separate obligations.
This D2 change adds no runtime setting and requires no redeploy step.
No builder deployment, push, Source act, or formal review is recorded here.
