# Check links only in tracked Markdown files

The link checker walked into ignored nested worktrees and reported their
old broken links as failures of the current head. The checker's baseline
gate for report `7f7def61` stopped at that boundary. Request `cf33085f`
and promise `b9c090fb` own this repair.

`scripts/check-doc-links.mjs` now enumerates the Git index with NUL-framed
paths. It reads the current working bytes of those tracked Markdown files,
so an unstaged broken link still fails. It preserves the existing
`node_modules`, `.git`, test-fixture, notes, and parked-history exclusions.
The self-test still needs no Git repository.

The existing canonical-link owner now uses a real scratch Git index.
The new boundary witness retains an ignored `.builder-worktrees` document
and an untracked document with broken links, alongside a tracked document
whose name contains a space. The good tracked link passes. Changing that
tracked file to a broken link fails, without staging the changed contents.

The [focused manifest](evidence/2026-11-04-doc-links-tracked.manifest.json)
covers 24 files in one sealed public unit. Its SHA-256 is
`bfc1bb89aa364551a5f32afb838aca3239836b57caa9805de6073aa1c6232c08`.
All raw command output began in that durable unit.

| Check | Actual result | Retained files |
| --- | --- | --- |
| Whole Node owner | Exit 0, two cases pass | `owner-before.stdout`, `owner-before.exit` |
| Original scanner control | Exit 1, nested-worktree assertion fails; the existing canonical-link case passes | `owner-control.stdout`, `owner-control.exit`, `original-scanner.mjs` |
| Actual shared checkout | Exit 0, 1,028 local links and zero broken | `current-shared-root.stdout`, `current-shared-root.exit` |
| Restoration and whitespace | Exact repaired source restored; diff check exits 0 | `result.json`, `diff-check.exit` |

The control restores the original recursive scanner with the owner
unchanged. The failure reports the ignored and untracked broken links.
The repaired owner still asserts that a tracked broken link fails.
No timeout, load, or application behavior explains the observed control.

An owned dependency clone retains all 32 links inside this worktree.
No package install or dependency change occurs. The required gate has
not run yet; its actual exit and final evidence will precede review.
