# Verify generic citations against independent vectors

Request: `a30f1b67`. Promise: `5a78cc01`. Planner source and reason ruling:
`f194f905`. Parent: `05d618e2`.

Status: source draft. The independent producer, compilers, focused witnesses,
control, static checks and gate remain unrun. The six vector files do not exist
yet. Root will book the producer after the typed work's executable priority.

Bytes adds `parseSequenceIdentifier` and `parseCitation` to its existing entry.
Each parser consumes the whole string, preserves its spelling and enforces the
format's digest width and the safe decimal position. Unknown format tokens
retain the generic grammar so verification can report `incomplete/format`.

Replay adds `verifyCitation(text, source, options)` in a separate module. Its
source serves raw cited and predecessor bytes; its options hold the requested
level, caller anchors, depth and an optional trusted Git hashing operation. The
result has exactly the protocol's seven members. Caller option errors throw
before I/O and do not add protocol reasons. The existing Native verifier,
reference shapes, integrity mode and judgment Replay keep their current bodies.

The verifier owns a copy of each reply and hashes it before decoding fields.
For dap1, it checks the carried genesis before position. Correctly hashed bytes
that cannot decode as an entry produce `mismatch/position`, reached 0 for the
cited event or 1 during the predecessor walk. An event above position 0 with no
valid predecessor digest also stops at reached 1. Section 4's existing reason
table and section 7's cases now state these boundaries.

Depth counts predecessor edges, including an edge to an explicit anchor. A
genesis needs no edge and can pass at depth zero. Conflicting caller anchors at
one sequence position fail before a read; identical duplicates trust the same
anchor once. Fetched or cached bytes never become an anchor. Signature failure
or an unavailable signature profile preserves a successful level 2 anchor and
its trusts.

The Node command starts with `--citation`:

```text
artroom-replay --citation <citation> --source <file> [--level 0|1|2|3]
artroom-replay --citation <citation> --git <clone> --level 2
```

Both forms accept `--depth <edges>` and repeated `--anchor <citation>` arguments.
The API defaults to level 3 and unlimited depth; the CLI defaults to level 3 and
10,000 edges. Citation mode prints the exact JSON report. Its exit is 0 for
`ok`, 1 for another protocol result, or 2 for invalid command options. Existing
Native argv dispatch keeps its current meaning.

The local source file supplies section 7's `event` and `source` members. It has
no trusted-anchor member. The reader checks its byte bound before allocation,
accepts exact UTF-8 or padded standard base64, and refuses duplicate source
digest claims. Syntax and unknown formats open no byte source.

The Git source reads stored commit bytes and their object format. It disables
replace refs and lazy fetch, reads no revision walk, and follows only the first
parent in the raw header. Missing predecessor objects remain unavailable even
at a shallow boundary. The SHA-1 adapter invokes Git itself with
`hash-object --literally -t commit --stdin`, without `-w`, in a fresh empty
directory. It makes no claim about a particular Git build's SHA1DC selection.
Git256 hashes the exact object header and raw content with SHA-256. Neither Git
format has a signature profile in this head.

`scripts/identifier-vectors.py` imports only Python's standard library. Its
TEST-only signer follows [RFC 8032 section 6](https://www.rfc-editor.org/rfc/rfc8032.html#section-6)
and retains section 7.1's first three independent signing answers. The producer
will check them before writing any output. The fixed public TEST seeds are not
custody keys; this illustrative signer is outside production code.

The producer writes only a new external directory. Its canonical JSON writer
admits these ASCII-key, safe-integer fixtures, rather than claiming a general
JCS implementation. Dap1 includes signed founding, act and preparation entries,
unsigned delivery and an unsigned alternate genesis. Git vectors include a
second parent and literal UTF-8 content. Tests will read the adopted files and
compare complete reports; they never invoke the producer or generate expected
reports with dap code.

The new real-Git owner retains raw TEST object stores with replace refs, grafts
and a shallow missing predecessor. The existing CLI owner adds citation dispatch
and lazy source boundaries. The whole Bytes fact-text/domain owners and Native
Replay owner retain their existing regression obligations.

The Bytes index has one existing whole-AST source seal. Its actual replacement
value remains pending root's maintained parser booking and review. Raw file
hashes do not replace that AST value. No inventory assertion changes in this
source draft.

Published vectors, complete reports and exact-head review are still owed. This
head has no room, wire, migration, rollout or deployment action.
