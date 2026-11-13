# `ScopeHandle.log`: a checked read of a scope's journal

LOG-1 is request `e79ccfaf`, the work of planner request `913fa211`. Act `5af8b09c` answers the request's first question. Ruling `ecdcd5c0` accepts that answer and adds the cut tail. The base is the NF-4 head `1904c945`, because both heads change `packages/client`.

A client outside the runtime can now fold a scope's journal. `ScopeHandle.log(cursor?, atLeast?)` returns one page of the journal as the scope stores it. The handle checks the page and says whether a fold may use it. The transport, the scope, the wire and the kernel do not change.

## Who reads whole pages

Act `5af8b09c` gives the answer, read at main `2216316e`:

- A member session reads `log` unfiltered. `readsOf` gives every member `MEMBER_READS`, which names `log`, so the readers port allows the read and `#open` sets `limit = null`. `#mine` then keeps every row.
- A chained session at a register gets `{ whole: true }`, which is also unfiltered.
- Only a signed read filters rows. Outside a register, `#mine` keeps the genesis, the key's own entries when the read is scoped, and the entries whose chain leads to the key.

The scope computes `complete` and `next` from the stored rows before `#mine` filters them. A filtered page can therefore say `complete: true` and still omit entries. Ruling `ecdcd5c0` names the worst case, the cut tail: a signed read keeps entries 0 to k, omits every entry after k, and says `complete: true`. The seqs from the cursor show no gap.

## What the handle checks

`log` rejects with `TransportError` when a page fails one of these checks:

- The page's scope reference and definition are the ones the scope's summary names. The handle has only a scope ID, so it reads the summary once and keeps the reference and the definition.
- Each entry's bytes hash to its hash, under the entry domain.
- Each entry's bytes parse as canonical values and hold the row's seq and this scope's reference.
- The seqs rise, from the cursor, and none passes the head.

## Whole or filtered

`LogRead` is a refusal as the scope gives it, or a checked page with `coverage`. Below the floor, the read is the `archived` refusal.

A page is `whole` only when both conditions hold:

- The handle read with a session: its reader is a `Session ` text, as `Session.reader()` gives it.
- The seqs run without a gap from the cursor to the page's `next`, or to the head when the page has no `next`.

Every other page is `filtered`. A signed page is `filtered` whatever its seqs are. The second condition also catches a cut tail in a session's page: a page with no `next` must reach the head.

The handle reports a signed page at a register as `filtered` too, though a register's signed read keeps every row. A caller that folds a register reads it with a session.

## The read minimum

The transport's `log` takes no read minimum, and this head does not change the transport. The handle accepts `atLeast` as the other reads do. It refuses a minimum of another scope, and it refuses a page whose head is below the minimum. It does not send the minimum, so the scope does not wait for it.

## Documentation

`packages/client/README.md` gains "Folding a scope's journal". It states the checks, when a page is whole, that a member session or a register session reads whole pages, that a signed read may not, and that a fold of whole pages from cursor 0 equals the scope's state.

## Tests

- `packages/scope/test/handle-log.test.ts` is the witness. A real scope on Durable Object storage holds ten entries, three to a page. A handle over the scope's `summary` and `log` reads the four pages, each `whole`. Derive's `applyEntry` folds them into a `MemoryState`, and its state digest equals the digest of the scope's own store. The test readers port stands in for the session check: it lets every reader read whole.
- `packages/client/test/handle-log.test.ts` uses a scripted binding:
  - Whole pages, an empty page past the head, and the `archived` refusal.
  - Refused pages: a wrong hash, another scope's page, another definition's page, an entry of another scope, and seqs that do not rise.
  - A session page with a gap is `filtered`.
  - The cut tail: a signed read whose kept rows run without a gap from 0 is `filtered`, with or without a `next`. A session page that stops short of the head with `complete: true` is `filtered`.
  - A page below the read minimum, and a minimum of another scope, are refused.

## Other changes

`apps/room/page/assets.ts` is the Page build of the client with the new method. `node apps/room/page/scripts/assets.mjs` rebuilt it, and `apps/room/page/test/assets.test.ts` passes.

No security seal changes.

## The gate and CI pass at `b54bb9f8`

The head `b54bb9f8` merges main `e7db3872`, where NF-4 landed, into `6fea47d5`. Both commits have tree `56d851c0`.

The gate at `b54bb9f8cdb398eedda6f80c336ee4edf0e99a9f` exited 0. Its START is `e5c8b73a` and its END is `69fa6fe5`. Plain passed 4,556 of 4,557 with 1 skip. Native passed 1,134 of 1,136 with 2 skips. The test step took 864.9 s. The evidence is in `2026-11-12-log1-gate-b54bb9f8-3`.

Two earlier starts at the same head stopped with exit 130 for a planner deploy window. They are not results. Their START commits are `2ab52bee`, in `2026-11-12-log1-gate-b54bb9f8`, and `33cdf309`, in `2026-11-12-log1-gate-b54bb9f8-2`.

Page browser scripts run `43366646400` passed on a push of `6fea47d5`, which has the same tree. No changed path is in the Card workflow filter. The celld smoke workflow names `packages/scope/**`, but it runs on pushes to `main` only, so it runs when this head lands. Later commits on this head change only `notes/`.

## Evidence

The working evidence is in `~/play/artroom-evidence/2026-11-12-log1-working/`. It holds each compile and test run with its exit code. `notes/implementation/evidence/2026-11-12-log1-handle-log.manifest.json` lists each file of the gate evidence and the working evidence with its size and SHA-256. Each directory holds its own `SHA256SUMS` and is read-only.
