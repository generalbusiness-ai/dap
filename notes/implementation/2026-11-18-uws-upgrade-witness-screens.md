# UW-S: screen hosts for upgrade-witness

UW-S (request `8c4108af`, plan `8c2aa7ac` step 4) gives the upgrade-cohort
room `upgrade-witness` two screen origins on dap-lending. U4-B and LS-7 read
these screens before and after the in-place upgrades. The room's Directory is
`sc_zyofzb2ffitaapn2qavxv2nbdtlxzcjohc2t3mtrgqhvh2nt4dtq`. The planner
supplied the installations:

- Counter 0.6.0 is install item 2, active, presentation `905a3f7e`.
- Lending 0.4.0 is install item 5, active, presentation `188f7b84`. Its
  Library `sc_qfyg5ivm…` holds the stepladder as thing item 2 (act
  `5ce2eaf9`).

The head is one commit on U4-T (`73402433`), which is one commit on head
Q. A deployment from main therefore keeps both registers (approval
`691bae0b`). U4-T changes the `APPLICATION_TRUST` line, and this head changes
the line before it in the same file, so the two heads cannot merge side by
side. U4-T lands first, and this head lands after it.

## The change

`APPLICATION_SCREEN_HOSTS` in `apps/room/wrangler.lending.jsonc` and
`SCREEN_HOSTS` in `apps/sandbox/wrangler.rollout.jsonc` change the same two
rows:

- `https://lending-shelf.inguz.space` moves from `lending-shelf` item 2 to
  `upgrade-witness` item 5. The presentation stays `188f7b84`, because both
  installations run Lending 0.4.0.
- `https://counter-upgrade.inguz.space` is a new row for `upgrade-witness`
  item 2, presentation `905a3f7e`. `https://counter.inguz.space` stays on
  `counter-witness` item 20.

The sandbox route `*.inguz.space/*` already covers the new origin, so no
route or binding changes. `docs/security/settings.md` names both rows.

## The old lending-shelf address

After the deployment, a request for the old screen address on
`lending-shelf.inguz.space` (path `/applications/sc_a7fawlxb…/2/…`) answers
404 from the sandbox. `applicationScreenHostMatches`
(`packages/client/src/application-gateway.ts:36`) compares the path's
directory and item with the row, and the path is not a gateway route either
(`apps/sandbox/worker.ts:46-48`). The sandbox refuses before it calls
dap-lending. The `lending-shelf` room and its installation do not change,
and its journal stays readable. No screen origin names it any more.

## Browser storage on the moved origin

A browser keeps one IndexedDB per origin, so `lending-shelf.inguz.space`
keeps the storage it held for the `lending-shelf` room. The installed
Lending screen prefixes every private slot with the installation's scope
reference: `lendingStorage(canonicalize(screen.scope))` in
`examples/lending/browser/main.ts:24`, and the `installed:<scope>:` prefix in
`examples/lending/browser/storage.ts:18`. The custody records separate each
identity's requests by scope and key. The `upgrade-witness` Library
(`sc_qfyg5ivm…`) differs from the `lending-shelf` Library (`sc_p7dbdhnq…`),
so the moved origin starts with no device key, seat or join for the new
room. The old room's slots stay in the browser under their own prefix, and
no screen reads them.

The browser profile from LS-7 run 1 holds the orphan key of `@shelf-witness`
in the old room's slots. A witness in `upgrade-witness` uses a new profile,
so that a run begins with empty storage and no earlier slot can mislead it.

A new hostname would avoid even the unread slots. The planner chose the move
in `8c4108af`, so the screen at `lending-shelf.inguz.space` continues as the
shelf of the room where Lending upgrades.

## The Lending upgrade needs a later row change

The deployed sandbox and room accept a screen path at any presentation of
the row's item, and the room serves the item's current presentation (U3).
So the Counter screen follows the upgrade from 0.6.0 to 0.7.0 with no row
change. Counter 0.7.0 carries U3's client.

Lending 0.5.0 was signed at `830d134a`, before U3. Its bundled client
refuses a host whose presentation differs from the installation's own
(`packages/client/src/application-gateway.ts:83` at `830d134a`). After the
in-place upgrade of item 5 to Lending 0.5.0, a row that names `188f7b84`
makes the 0.5.0 page refuse the host. The witness after that upgrade needs
one more head that moves the row's presentation to 0.5.0's, or a Lending
release signed after U3.

## Tests

`scripts/deploy-smoke.test.mjs`:

- The tracked sandbox origins list ends with `counter-upgrade.inguz.space`.
- The `lending-shelf.inguz.space` case names `upgrade-witness` item 5.
- A new case pins the `counter-upgrade.inguz.space` descriptor.
- The existing bidirectional case requires each room row to have exactly one
  sandbox row, and the reverse.

## Red

| Red | What was broken | First failure | File | SHA-256 |
| --- | --- | --- | --- | --- |
| The counter-upgrade row exists on both sides | the row removed from the sandbox file only | the origins list case and the bidirectional case; 9 other cases pass | `red.txt` | `8f867622960ac56940690da0481e8398a4487fcb0e42d9956061c404588de9dc` |

The output is in `artroom-evidence/2026-11-18-uws-red/`.
