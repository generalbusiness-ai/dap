# NP-1: notes name no local home directory

NP-1 removes local home-directory paths from `notes/`. The repository is
public, and 704 note files named absolute paths on the planner's and the
Mac mini's machines. The planner chose option (A) in `6d5d52a7`: rewrite
every file, and say how the SHA-256 citations still check.

## The rewrite

One script made every change, with the rules applied in this order:

| Rule | Before | After | Replacements |
| --- | --- | --- | --- |
| 1 | the shared checkout's path, then a file name | the repository-relative path | 282 |
| 2 | the shared checkout's path alone | `the shared checkout` | 10 |
| 3 | the parent directory of the checkout and its siblings | the sibling's name, for example `artroom-evidence/` | 4426 |
| 4 | the planner's home directory, then a path | `~/`, then the path | 46 |
| 5 | the Mac mini user's home directory, then a path | `<mini home>/`, then the path | 36 |

The head changes no other text. After the rewrite,
`git grep -E "/Use[r]s/" -- notes` finds no line. The 10 record lines from rule 2 now read `the shared
checkout`, and they stay that way.

## SHA-256 citations

A SHA-256 citation in `notes/` names the bytes that a file held when the
note was written. Most citations name evidence files outside the
repository, and this head does not change them. Where a citation names a
file in `notes/`, it names that file's content before this rewrite. This
head is one commit on main `60223c5c`, so the content at `60223c5c` is the
content that the citation names. The ruling named `d902e140`, the base when
the work began. Between `d902e140` and `60223c5c`, only the LC1 note and
the UW-S note changed, and the content at `60223c5c` includes both
changes.

To check a citation of a note file, hash the file at `60223c5c`:

```sh
git show 60223c5c:notes/<path> | shasum -a 256
```

Published history keeps the old paths. This head changes only the current
tree.
