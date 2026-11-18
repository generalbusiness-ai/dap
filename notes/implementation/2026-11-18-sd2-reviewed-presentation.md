# SD-2: the screen row names its reviewed presentation

SD-2 (request `01af844c`, ruling `0cd8b052` on audit `8714850b`) makes the
screen rows say what they are. A row in `APPLICATION_SCREEN_HOSTS` and the
sandbox's `SCREEN_HOSTS` names one installation item and one presentation.
That presentation is the reviewed presentation: the presentation of the
release that an operator reviewed for the screen origin. The room serves
the item's current presentation for every screen request
(`packages/scope/src/applications/route.ts:79-80`), and the matcher compares
only the directory and item (`packages/client/src/application-gateway.ts:36`).
An in-place upgrade therefore moves the screen before a row changes.

After U4-B, the two `upgrade-witness` rows still named the presentations of
Counter 0.6.0 and Lending 0.4.0. The items now run Counter 0.7.0 and
Lending 0.6.0.

## The change

- `apps/room/wrangler.lending.jsonc` and `apps/sandbox/wrangler.rollout.jsonc`
  move the same two rows. Both files stay byte-equal in each row.
  - `https://counter-upgrade.inguz.space`, item 2: `905a3f7e` becomes
    `70c32e9e` (Counter 0.7.0).
  - `https://lending-shelf.inguz.space`, item 5: `188f7b84` becomes
    `6153d948` (Lending 0.6.0).
- `docs/security/settings.md` names each row's reviewed presentation and its
  release, and says that the room serves the item's current presentation.
- `docs/deploy.md` adds step 4 to the trusted-screens procedure: the head
  that adds a release's trust row moves the screen rows of the items
  scheduled for that release.
- `scripts/deploy-smoke.test.mjs` pins the two moved descriptors and adds
  one case. For each room file with screen rows, the case reads every
  committed release packet with the platform codec. It then requires each
  row's presentation to belong to a release in that file's
  `APPLICATION_TRUST`.

The matcher, the sandbox and the room code do not change. A screen load
makes the same Durable Object requests as before.

The other three rows already name presentations of trusted releases:
`lending.inguz.space` (Lending 0.3.0), `counter.inguz.space` (Counter 0.6.0)
and `grow.inguz.space` (Grow 2.0.0).

## Red

| Red | What was broken | First failure | File | SHA-256 |
| --- | --- | --- | --- | --- |
| A row names a trusted presentation | the Lending 0.6.0 trust row removed from `wrangler.lending.jsonc`, packet kept | the new case names `lending-shelf.inguz.space` and `6153d948`; the other 11 cases pass | `red.txt` | `890d4c8ef2fd1d4e9e3db7808095759b24d510d6dc64b86ddd1f468c17f9e14f` |

With the row restored, all 12 cases pass (`green.txt`,
`57753201696e61fcb4ab74d00ef49b3286765e1da73da6a9f6af41771fcd7f16`). The
output is in `artroom-evidence/2026-11-18-sd2-red/`.
