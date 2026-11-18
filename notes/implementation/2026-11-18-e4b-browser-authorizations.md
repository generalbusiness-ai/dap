# E4-B: the browser store keeps authorizations

Status: built. The tests, the control, the real-browser witness and the
gate passed; the Evidence section lists each run.

E4 gave the client an authorization port (`AuthorizationPort` in
`packages/client/src/authorization-store.ts`) and a memory store. A
`ScopeClient` needs `store.authorizations`, so a browser `ScopeClient`
could not compose until `browserCustodyStore` held one. E4-B adds that
port to the browser store. It adds no scope kind, platform definition
name, capability, tool family or record model.

## The store

`browserCustodyStore` keeps authorizations in the IndexedDB database
that holds custody, in its own object store `authorizations`
(`packages/client/src/browser-custody.ts:56-60`). One row holds the whole
batch of one owner and scope:

- The key is `canonicalize({ owner, scope })`, the same name that
  `memoryAuthorizations` uses.
- The value is `{ at, text }`: `at` repeats the key, and `text` is the
  canonical JSON of the batch.

`read` runs one read-only transaction on `authorizations` alone. An absent
row reads as `[]`. A row whose `at` differs from its key, whose text is
not canonical JSON of an array, or which holds a row of another owner or
scope reads as `unreadable` (`browser-custody.ts:236-251`).

`write` validates and serializes the batch before any transaction starts,
so a refused batch changes nothing. It then runs one read-write
transaction on `authorizations` alone. That transaction puts the row,
reads it back and compares the text before it completes
(`browser-custody.ts:252-263`). The transaction asks for strict
durability, so the permission mark is on disk before the signer runs.

## Item 2: the authorization write commits first, under one fence

The order lives in the client, and the browser store keeps it:

1. `Custody.#kept` (`packages/client/src/custody.ts:588-598`) and
   `Custody.#resigned` (`custody.ts:641-659`) run the build and the custody
   write inside one `store.exclusive` call. In the browser store,
   `exclusive` is the Web Lock `<lock>:exclusive`
   (`browser-custody.ts:282`). That lock is the coordinating fence.
2. Inside the build, `ScopeClient.#signRetained` commits the
   authorization batch, with its permission mark, before it calls the
   signer (`packages/client/src/scope-client.ts:1039`).
3. The browser `write` of the port awaits its transaction's `complete`
   event. The custody transaction starts only after the build returns.

No custody transaction includes the `authorizations` store, and the
authorization transaction includes no custody store. The two writes are
separate commits, in that order. One transaction for both is not
possible: ruling `f494b29d` keeps the mark of a failed signing, so the
mark commits before the signer runs, and the custody write needs the
signed envelope.

A reload between the two writes leaves the permission mark with no
custody record. The retry reads the mark under the fence and stops with
`authorization-used` (`scope-client.ts:1127`, and
`AuthorizationTransaction.permit` at
`packages/client/src/authorization.ts:263`).

## Item 3: removal

An authorization's history leaves only in the transaction that removes
the custody record of its key (ruling `d48ce431`). The browser store has
no such transaction, because it removes no custody record:

- `write` puts the record in `records` and deletes the same identity from
  `archive` in one transaction (`browser-custody.ts:294`). The record
  moves back to the live store.
- The archive moves each terminal record past `terminalLive` from
  `records` to `archive` in that same transaction
  (`browser-custody.ts:298`). `read` still finds it.

So no authorization history leaves the browser store today. The custody
write transaction covers `records` and `archive` only, so it cannot
change an authorization. A later step that removes a custody record must
remove the key's authorization row in the same transaction.

## Item 4: an earlier database

The database version moves from 2 to 3 (`browser-custody.ts:60`). The
upgrade runs in `onupgradeneeded` (`browser-custody.ts:122-133`):

- Old version 0 creates all five stores.
- Old version 2 with the exact released layout creates `authorizations`
  and touches no other store and no row. The exact layout is the four
  stores `records`, `archive`, `outcomes` and `lengths`, each with
  out-of-line keys and no key generator (ruling `14609eb8`).
- Any other old version or layout aborts the upgrade. The database keeps
  its version and its stores, and the store answers `unreadable`.

A tab that still runs version 2 code reads the store as `unreadable`
after the first version 3 load in another tab, and must reload. The
reload case below describes it.

A version 2 database holds only signings without an authorization
reference. Before E4-B, the browser store had no `authorizations`, so no
`ScopeClient` could use it, and `Custody` builds through a fence with no
port. The client reads such a signing as `legacy` (ruling `34791662`):

- `CustodySigning.authorization` is absent (`custody.ts:166`).
- Delivery checks `canCopy` only for a signing with a reference
  (`scope-client.ts:978`). A legacy signing still passes the checks on
  bytes, latest occurrence and expiry.
- A request equivalent to a live legacy signing resends the kept bytes
  and invents no authorization (`scope-client.ts:1157-1166`).

## The reload case

Planner ruling `be902732` chose this case. A tab that holds the database
open when another tab first opens version 3 reads custody as
`unreadable` until it reloads. No custody row moves, and nothing is
lost:

1. The version 2 tab receives `versionchange`. Its version 2 code closes
   the connection and retires the store, so the upgrade is not blocked.
2. The new tab adds the `authorizations` store. Every custody row stays
   as it was.
3. Every later call in the old tab answers `unreadable`, and nothing is
   signed. The version 2 page cannot tell the cause.
4. After a reload, the tab runs version 3 code and reads every row.

If that old tab reloads before its page code updates, its open of
version 2 fails with `VersionError`. The store answers `unreadable` and
signs nothing until the page code updates.

This head makes the next upgrade tell its page. On `versionchange` the
store retires as before, then calls each observer once
(`browser-custody.ts:90-101`, `browser-custody.ts:145`). The observer
re-reads, and the store refuses the read `unreadable`. The new method
`retired()` names the cause: `"version-change"`, `"closed"` or `null`
(`browser-custody.ts:69`, `browser-custody.ts:354`). The page can then
show "This page was updated in another tab. Reload this page."

`retired()` is the smallest shape that fits. `CustodyError` holds a
`HeldBack` (`custody.ts:257-273`), and none of its reasons names a
version change. A new `held` value would change the answer of every
custody store and every caller that switches on `held`. `retired()`
belongs to the browser store alone. It adds no record model, no held
reason and no capability name.

Counter 0.8.0 and Lending 0.7.0 show the message. Both versions are
open, so their browser code may change under the application version
rule (ruling `163de663`). The signed releases, Counter 0.7.0 and Lending
0.6.0 and earlier, keep the old behavior: their store retires in silence,
and their page shows only its usual storage failures.

- Counter: `whenCustodyUpdated` in `apps/counter/browser/storage.ts`
  observes the store. On a version change, `apps/counter/browser/main.ts`
  opens the setup dialog and puts the message in its `.setup-message`
  status, where the page shows other custody failures.
- Lending: `lendingStorage` in `examples/lending/browser/storage.ts`
  returns `whenCustodyUpdated`. On a version change,
  `examples/lending/browser/main.ts` sets the message as its plain
  `notice` and draws the page again.

`apps/room/page/src` does not use `browserCustodyStore`, so the room page
needs no change. Neither app has a unit test for its storage module, so
the version-change test of the client store is the only automated
witness.

## Item 5: the bound of 64 positions

`AUTHORIZATION_VERSIONS_MOST` is 64 (`authorization.ts:62`, ruling
`52b638a9`). `AuthorizationTransaction.retain` stops with `versions-full`
before any write when a key already holds 64 positions
(`authorization.ts:162`). The bound sits above the port, so the browser
store keeps it unchanged. The shared case "64 unsigned positions retain
history and the next gesture stops without a write" runs against the
browser store.

## Tests

The E4 cases in `packages/client/test/authorization.test.ts` run once
for each store, through `describe.each`: the memory store, and the
browser store over the IndexedDB stand-in. The stand-in moved to
`packages/client/test/support/browser-idb.ts`. It now models a database
version and an aborted upgrade. A stand-in proves no native atomicity or
durability.

New cases:

- `authorization.test.ts`: "browser store (IndexedDB stand-in): a reload
  between the authorization write and the custody write keeps the mark,
  and the retry stops authorization-used".
- `browser-custody.test.ts`: "a version 2 database upgrades by adding the
  authorization store and keeps every custody row".
- `browser-custody.test.ts`: "an earlier database without the version 2
  layout does not upgrade and signs nothing".
- `browser-custody.test.ts`: "archiving a terminal record leaves the
  authorization history of its key".
- `browser-custody.test.ts`: "a newer database version opened elsewhere
  retires the store, tells each observer once and names the version
  change". The double now keeps its open connections and sends
  `versionchange` to each one before an upgrade.
- `browser-custody.test.ts`: the existing close case also checks that
  `retired()` answers `"closed"`.

The real-browser witness `apps/room/page/test/custody-store-witness.ts`
now expects version 3 with five stores. Its versionchange cases open
version 4, and one also checks that `retired()` answers
`"version-change"`.

## Control

Delete `await transaction.commit();` in `ScopeClient.#signRetained`
(`scope-client.ts:1039`). The signer then runs with no permission mark
on disk. The reload case fails at its permission assertion, and the
retry signs a second time. Other E4 cases that read permissions also
fail. Restore the line after the run.

## Evidence

Files are in `artroom-evidence/2026-11-18-e4b-red/` and `artroom-evidence/2026-11-18-e4b-witness/`. Each test run is `npx vitest run test/authorization.test.ts test/browser-custody.test.ts` in `packages/client`.

| Run | Result | File | SHA-256 |
|---|---|---|---|
| Base browser store (2631ad70), E4-B tests | 13 of 40 fail | `store-red.txt` | `aa4efce239a887c9f019b11fef8159ddedca6640ae98b5ed7fdf7775fe718ab6` |
| E4-B browser store | 40 pass | `store-green.txt` | `ea9aff6e0c23fdb93c4f2f05cd204883497e0a3749ae48ce84b2a6125b420fe2` |
| Control: `scope-client.ts:1039` `await transaction.commit();` removed, `authorization.test.ts` only | 7 of 15 fail, the reload test among them | `control-order.txt` | `9fb5b494b12bdbab713e790b4292d30117b09615127598d0e18d304b91d40843` |
| Real-browser custody witness, `apps/room/page/test/custody-witness.mjs` local mode, Chromium 1243 | 31 of 31 storage cases pass; the join settles one envelope | `witness.json` | `5cec46b2ab14b6e611cddcf0b23a10c2eb8f60f483e0af41a615147b78d3f3c5` |
| Real-browser custody witness again, with the released version 2 upgrade case (`releasedUpgrade`): 2 records, 1 archive row, 6 outcome rows and 1 length row open as version 3 | 33 of 33 storage cases pass | `witness-2.json` | `f4b52dc6164373332913da60cf0e67854bfaf65fc7140ac4d825339012ec804f` |

A first run of the new case failed on its own fixture: one attempt per
record leaves every outcome inline, so the copied database had no outcome or
length rows. The live record now retries 70 times and spills them.

The gate runs on the committed head; its START and END acts name `artroom-evidence/2026-11-18-e4b-gate/`.
