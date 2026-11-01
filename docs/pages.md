# Pages

A room's repository can be read as a site. The scope Worker renders each
Markdown file as an HTML page. Anyone who has the room's directory scope
ID can read the site.

## Open a site

A page's address is:

```
<base-url>/site/<directory>/<ref>/<path>
```

- `<base-url>` is the scope Worker's address, the one given to
  `dap install`.
- `<directory>` is the room's directory scope ID (`sc_...`), not a human
  name. `dap create` prints it (`Created demo: directory sc_...`), and the
  command line keeps it under the name `directory`.
- `<ref>` is `HEAD`, a published branch name or a full commit ID.
  - `HEAD` names the room's branch at the exact head that its destination
    records. The Worker never uses the Git host's current branch head in
    its place.
  - A branch name that holds a `/` uses `%2F`, such as `release%2F1.0`.
  - A full 40-character lowercase Git object ID selects an immutable
    native publication that has a written receipt. This form takes
    precedence over a branch whose name looks like that ID. The receipt's
    ref, commit and tree, and the file fetched from the same repository,
    must all match.
  - Short or uppercase hashes, other ancestors, and branches or tags that
    exist only at the Git host give no publication authority. The room
    records one branch and no tags or named versions.
- `<path>` is a file or a folder in the repository at that commit.

For example, `<base-url>/site/sc_hs5f27fz.../HEAD/` opens the room's
front page. Use the recorded branch name to follow the latest
publication. To keep a link to one published result, use its full commit
ID. Relative links and images keep that same prefix. History imported
from elsewhere is not a native publication.

Two more addresses:

- `<base-url>/site/<directory>/`, with no ref, redirects (status 302) to
  `<base-url>/site/<directory>/HEAD/`.
- `<base-url>/site/<directory>/versions/` lists the room's recorded
  published refs and exact commits, with links to their roots. It lists
  the destination's one published branch, marked "HEAD, the published
  branch". Before the first publication it lists no versions. The Worker
  never builds the list from the Git host's branches or tags. The name
  `versions` is reserved for this listing at the root.

## What every page shows

- **A header.** "Repository:" and the repository's name as the directory
  records it, linking to the root of the same published branch. Then the
  branch shown, such as "branch main (HEAD)" or "branch main", and a link
  to the versions page. The name is the one that the register gave the
  repository at the Git host, not the room's label.
- **A breadcrumb.** The ref, then each folder of the path as a link, then
  the page itself.
- **A footer.** "Rendered from commit" and the commit's ID, and a link to
  [the room's page](../apps/room/docs/page.md) at `<base-url>/page/`.

## What a path answers

| The path names | The answer |
|---|---|
| A Markdown file (`.md` or `.markdown`) | The page, rendered as HTML. |
| A folder, or nothing (the repository's root) | The folder's index page, or a list of the folder. |
| An image (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.avif`, `.svg`, `.ico`, `.bmp`) | The image's bytes, with its type. |
| Any other file | The file's bytes, as a download. |
| A symbolic link or a submodule | A refusal (`not-found`). |

A folder's index page is its `index.md`, or else its `README.md`. Either
name can have any letter case or end in `.markdown`. A folder with
neither answers a list: its subfolders, then its Markdown files by
title, then its other files. A Markdown file's title is its first heading
of the highest level, or else its file name. The Worker reads titles for
the first 100 Markdown files of a folder only, and a file of more than
1 MiB keeps its name. The list leaves out names that start with `.`, but
the Worker still serves those files at their own addresses. An empty
folder, or a repository with no files at its root, answers a page that
says so.

## What renders

The Worker follows the GitHub Flavored Markdown specification, version
0.29-gfm, with GitHub's five extensions. Its test runs all 672 examples
of the specification, each with its own extension turned on as the
specification's runner does. Every example renders as specified.

- Headings, paragraphs, block quotes, ordered, bullet and nested lists,
  code blocks, thematic breaks, emphasis, strong emphasis, code spans,
  links, images, autolinks, entities, escapes and line breaks.
- Tables, with column alignment.
- Task list items, shown as checkboxes that cannot be changed.
- Strikethrough with `~` or `~~`.
- Extended autolinks: `www.` addresses, `http://`, `https://` and
  `ftp://` addresses, and email addresses written as plain text.
- A fenced code block's language, as the class `language-<name>` on its
  `code` element. The Worker does not color syntax.
- Heading anchors as GitHub makes them: `## Getting started` has the ID
  `getting-started`, and a second heading with the same text has
  `getting-started-1`.

Links and images:

- A relative address, such as `setup.md`, `../README.md` or
  `images/logo.png`, resolves against the page's own folder. The Worker
  writes it as an address on the same site, at the same ref. A relative
  address cannot reach above the repository's root.
- An address that starts with `/` starts from the repository's root.
- An address with a scheme (`https:` or `mailto:`, for example), and a
  link to a place in the same page (`#setup`), stays as written.
- A link to a folder, such as `guide`, `guide/`, `./` or `../`, answers
  that folder's index page or list, with or without a final `/`.
- A link to another Markdown file keeps its `.md` ending. The Worker
  renders that address as a page, so the link works on the site.
- A repository image renders at the same room and ref. The image route
  serves its exact bytes with a sandbox policy.

The fixture
[`packages/scope/test/site/completeness/fixture.md`](../packages/scope/test/site/completeness/fixture.md)
puts these constructs together. The `GFM completeness fixture` test in
`packages/scope/test/site-route.test.ts` renders it.

## What does not render

- **Raw HTML.** The Worker shows HTML in a Markdown file as text and
  never passes it to the browser. An HTML block appears in a box as its
  source. GitHub instead passes some HTML through after it filters it.
- **Unsafe link addresses.** A link or image to a `javascript:`,
  `vbscript:`, `file:` or `data:` address gets an empty address, and the
  link text stays. An image can still use a `data:` address of a PNG,
  GIF, JPEG or WebP image.
- **Scripts.** Every page has a content security policy that runs no
  script. A file served as itself, such as an SVG image, is sandboxed
  too.
- **Constructs outside the specification.** Wiki links (`[[Page]]`),
  footnotes, mathematics, diagrams, emoji short codes, `@` mentions and
  `#` references to issues stay as ordinary text.

## Limits

- **File size.** A file of more than 1 MiB (1,048,576 bytes) is refused
  with `too-large` (status 413).
- **Transfer size.** To read a file, the Worker fetches the commit with
  its history from the Git host. The bytes on the wire, inflated and kept
  are each capped at 16 MiB, or at the host setting's `maxBytes` when that
  is lower. The Worker also allows at most 4,096 objects and 4,096 refs,
  and checks these allowances before a download exceeds them. A
  repository whose history is larger cannot be read, and every page
  answers `unreadable`.
- **Publication history.** The Worker reads a bounded part of the room's
  records to find the published commit. A room whose records exceed that
  bound, or a path with more than 64 segments or more than 8 KiB of UTF-8,
  answers `unreadable` with the reason `publication-history-limit`. It
  never answers "absent" or "not published" for that reason.
- **Caching.** A cache can keep an answer for 60 seconds. Each answer has
  an `ETag` made from the commit, the path and what the header shows: the
  recorded repository name, the ref as written in the address, and the
  published ref that it names. The same file under `HEAD` and under its
  branch name has two tags, because the headers differ. Before a
  `304 Not Modified`, the Worker checks the room's publication, the
  repository identity, the commit, the path, the object type and the
  size. A matching tag never skips a refusal. The versions page's tag
  covers the recorded published refs and commits, and the Worker
  validates their commit objects before a 304.
- **Read tokens.** On Cloudflare Artifacts the Worker reads with a read
  token that lives two minutes. Reads of the same repository and ref
  share one live token, and the end of a read never revokes it. The
  Worker keeps at most 256 live tokens and mints at most 32 at a time.
  When no token is available, the answer is `unavailable`.

## Refusals

A refusal shows nothing of the repository. Its body is plain text: a
reason, a colon and a sentence. When a browser asks for HTML, the
refusal is a short Pages document with the same status. A
`no-repository` refusal is always the bare word `no-repository`. Every
refusal has `Cache-Control: no-store`.

A refusal from a failed read also has the header `x-site-step`, which
names the step that failed: `room`, `open`, `info`, `token`, `refs`,
`objects` or `render`. The Worker's log has one line for it,
`site <step>: <error class>: <message>`, with any token, authorization
value and URL query replaced by `[redacted]`.

| Reason | Status | When |
|---|---|---|
| `bad-request` | 400 | The address is not a site address, a path segment is empty, `.` or `..` or holds a `/`, or the address holds a credential. |
| `not-found` | 404 | No room has that directory, or no file or folder is at that path. |
| `not-published` | 404 | The room has no confirmed publication, or has not published the requested ref or commit. |
| `no-repository` | 404 | The room was created with `--host none` and has no repository. |
| `method-not-allowed` | 405 | The request is not a `GET`. |
| `too-large` | 413 | The file is more than 1 MiB. |
| `rate-limited` | 429 | The deployment refused the read under its rate limit. The answer has `Retry-After: 60`. |
| `unreadable` | 502 | The room or the repository could not be read. |
| `host-not-configured` | 503 | This deployment does not read that room's Git host, or the register that the host's setting names did not create the room. |
| `unavailable` | 503 | The deployment cannot serve the read now, or no read token is available. |

## Who can read a site

Published files are public. Anyone with the room's directory scope ID can
read every file at the recorded published branch head, or at an immutable
native publication named by its full commit ID. No session is needed,
including for files from a private repository. The Worker refuses other
commits, and branches or tags that exist only at the Git host, before it
asks the host for access. Knowing a room's address does not publish the
private repository's other branches.

The Worker reads only the selected commit, with its own host
credentials: a read token on Artifacts, or the deployment's GitHub read
token. On GitHub, the repository's ID must match the room's record before
the Worker fetches anything. The Worker finds the published commit in the
directory's and destination's records. That read records no entry, starts
no operation and changes no credential. A change of branch at the Git
host alone does not change the site, because the destination must record
the new head. When the room's records are missing or unavailable, the
Worker never falls back to the Git host's refs.

A site for members only, which would ask for a read session, is not
built.

To change a page, use [`dap edit`](cli.md#dap-edit).

## Source

Checked against main `5dc9765f` on 30 October 2026. Sources: [route.ts](../packages/scope/src/site/route.ts), [host.ts](../packages/scope/src/site/host.ts), [publication.ts](../packages/scope/src/site/publication.ts), [token-reuse.ts](../packages/scope/src/site/token-reuse.ts), [site-route.test.ts](../packages/scope/test/site-route.test.ts).
