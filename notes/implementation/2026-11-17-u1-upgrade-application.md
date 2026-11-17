# U1: the upgrade-application act

U1 (`ea7faed9`) builds step 1 of
[the application upgrade note](../2026-11-17-application-upgrade.md) under the
planner's ruling of 2026-11-17 (D1 to D5, F5). It adds a creation family,
`upgrade`, whose Rules 16 has one new act, `upgrade-application`. U1 deploys
nothing, and no deployment happens before U2.

## The family

`packages/platform/src/upgrade-cohort.ts` names the six pins as
`UPGRADE_COHORT`:

| Scope | Pin | Declaration digest |
|---|---|---|
| Register | `platform:register@29` | `sha256:cc5fadbde47db6dc9a833af1a15536d22ecbf33c69faeaf0aa3acc8aa349ce12`, the bytes of Register 28 |
| Directory | `platform:directory@28` | `sha256:3bcc3fef39c145c2de415debf0d45b4d9873df689aae898209835487f1044a23`, the bytes of Directory 27 |
| Membership | `platform:membership@14` | unchanged |
| Rules | `platform:rules@16` | `sha256:8bc4fafd5dd734ef76db8416f2a40fb4eeb87433deea2631670872aa10817185` |
| Destination | `platform:destination@21` | unchanged |
| Inbox | `platform:inbox@1` | unchanged |

Register 29 and Directory 28 run the data and rules of Register 28 and
Directory 27. Only their relations differ. Register 29 creates Directory 28
(`DIRECTORY_OF`), and its claim proof names Directory 28
(`registerRulesOf` in `base-register.ts`). Directory 28 creates Rules 16
(`SIBLINGS_OF`). `NEWEST`, `deploymentCreationDefaults()`, the CLI's
`--cohort` list and every Worker configuration stay on the `base` family.

## Rules 16

`packages/platform/src/upgrade-rules.ts` builds Rules 16 on Rules 15. The
installation item changes in three ways:

- A new final state, `replaced`.
- A new fixed reference, `replaces`, to another installation item.
- `uri`, `release` and `presentation` are no longer fixed slots, so the
  fetch outcome of an in-place upgrade can write them. No other rule writes
  them after the opening entry.

The item keeps 12 values; the derive bound is 12.

`upgrade-application` is a transition on an installation item N. It needs
the grant `application.install`. It takes the fields of `install-application`,
with `roles` and `values` optional. Its guards are, in order: N is `active`;
`device-owner-standing`, as for an install; and `application-upgrade-proof`.
The proof guard reads the signed v2 proof of the named release and refuses:

- `application-publisher-changed` when the release's publisher differs from
  N's, in both forms (D2);
- `application-release-unchanged` when the release equals N's;
- `application-upgrade-pending` while a pending successor of N exists;
- `invalid-application-package` when the in-place form carries `roles`,
  `values` or `owner`, or when the replace form fails the install proof of
  Rules 15.

The act chooses its form from the semantic identifier. The semantic
identifier names the root definition, so an equal identifier keeps it.

**In place** (equal semantic identifier). The act opens one
`fetch-application` operation and changes nothing else. The host's confirmed
answer must carry the act's `uri` and `release`, N's semantic identifier and
N's publisher. It then sets N's `uri`, `release` and `presentation`, and no
other slot (D1). The signed manifest names the presentation, so the release
digest fixes it. A refused answer changes nothing (F5).

**Replace** (any other semantic identifier). The act opens a pending
successor installation at its own position, with `replaces` = N, and opens
the same fetch operation as an install. The successor then runs the Rules 15
pipeline: fetch, admission, grants and creation. The entry that makes the
successor `active` also moves N to `replaced` (D3). Until then N stays
active. A refused successor leaves N active.

`install-application` keeps its rules. Red (d) covers `upgrade-application`
only (D4).

## Host

`applicationOperationRequest` in `packages/scope/src/applications/outside.ts`
prepares a fetch for an `upgrade-application` act as for an install. The
host's trust check runs before it opens any source, so a release outside
`APPLICATION_TRUST` refuses `untrusted-release` with no network read.
Rules 16 keeps `hostPreparationKinds: ["fetch-application"]`.

## What else moved

Each place that names Register 28, Directory 27 or Rules 15 for an
application room now names the new pin beside it:

- `native-catalog.ts`: entries for Register 29, Directory 28 and Rules 16.
- `version-questions.ts` and `contract/src/catalog-vocabulary.ts`: each new
  pin answers exactly the questions of the pin it follows (Register 29 as
  Register 28, Directory 28 as Directory 27, Rules 16 as Rules 15). The constant
  `UPGRADE_FAMILY_OF` in `version-questions.test.ts` states the choice. So
  Register 29 also answers the celld questions of Register 28, and
  `apps/room/celld/mac/test/prepare-project.test.mjs` now uses Register 30
  as its unknown pin.
- `version-relations.ts`: invitation and evidence directories of
  Membership 14, the scope-index cohorts, the archive membership copy, the
  archive target, creation lineage, application admission and MCP room
  cohorts, and the foreign archive anchor of Register 29.
- `application-install-reader.ts`, `application-projection-reader.ts`,
  `application-archive-reader.ts`, `archive-binding-wire.ts`,
  `device-application-rules.ts` and `archive-replay-code.ts`: Rules 16 and
  Directory 28 beside Rules 15 and Directory 27.
- `publishing-provenance.ts`: `baseApplicationPublicationOrigin`, which
  Destination 21 runs, also proves a creation of Directory 28 under Rules 16.
- `packages/git/src/archive-policy.ts`: data rows for Directory 28 and
  Rules 16, and value places for Rules 16, including
  `acts.upgrade-application.fields.release.value` and
  `acts.upgrade-application.fields.semantic.value`.
- `native-declarations.generated.ts`: three pins and the Rules 16 text.

## Pinned values that moved

| Owner | Old | New |
|---|---|---|
| Seal of `packages/contract/src/catalog-vocabulary.ts` | `458e087b56935e8c198016c476d11aff10ca24e9ab131d90d31fe282a6b731f1` | `1f58a135e016811c53f92b2d78c35a449d80b54e75059ea1b6f9e43a31be421d` |
| Seal of `packages/platform/src/version-questions.ts` | `1db22b0f15e32ac2f221530a7070f2c3ecf2a2db35503afe7ccfd81134b6e178` | `715333df2a0bfeb66a1c9dc82814bfe24d03f3e95da21121d77e7901debfa3a9` |
| Seal of `packages/platform/src/version-relations.ts` | `1eb52555e06569c8f76d9de97a03717828996f2de7500c6c17e66413eef25f0a` | `ab7da54366ee08e529bf48aad7a41ecf784759e74d7cf639149b1b07152e8e64` |
| Seal of `packages/platform/src/application-archive-reader.ts` | `e261d7d0e052702daf16b07eba0a7457df30f7a9591ba1a13524456c27a4ee2e` | `19bb24e8367f70384d9843c63dc158e7bf2ad09ae34fa5e3b753b9aec69d5d73` |
| Open Lending 0.6.0 presentation | `sha256:db139b7398bda6dc5562e4904023e8c067a348c59807d8ad816180dc8cad6180` | `sha256:9f7d92b3f2cf9ff8caa192a37a7d0d7fa890b8fff8cdeac2b2677f4a5a7b17be` |
| Open Counter 0.7.0 presentation | `sha256:9d6995c8523ea6e59cbd3dfb4694501fdfe7420ee8e0d59f5e839f9a6529a300` | `sha256:566fb699c28b89e97998fcf9191af6b126bbb2c73024f6e8225df6ebc2c1c420` |
| Page module `apps/room/page/assets.ts` | 2485796 bytes | 2499652 bytes |

Each seal is the value that `scripts/security-entry-points.test.mjs` prints
for the reviewed source. The open screens bundle the platform catalogue, so
their presentations move. No signed release changes. The approved upgrade
note names `9d6995c8` as Counter 0.7.0's presentation; U4 uses the value in
`apps/counter/release-identifiers.json`.

## Reds

Each red names its invariant. `scripts/control.mjs` broke one line and ran
the one test file: the test passed before the change and failed by an
assertion with it. The control outputs are in the builder's scratch evidence
directory, with these SHA-256 values.

| Red | Test | Line broken | Failing assertion with the change | Output SHA-256 |
|---|---|---|---|---|
| (a) a changed semantic identifier never upgrades in place | `red (a): …` in `packages/platform/test/upgrade-application.test.ts` | `inPlace` compares the semantic identifier, changed to always true | `expected { result: 'write', … } to match object { result: 'refused', … }` | `391a9d18629e115017c75193e81ad1827287e52e4880e75875eb23d98094bbce` |
| (b) a changed publisher refuses, in both forms | `red (b): …`, same file | the publisher comparison in `application-upgrade-proof`, changed to never refuse | `expected { result: 'write', … } to match object { result: 'refused', … }` | `1e70456fbea489d9cc953db2a58db0092a128aa56b4a9f228c8943424b08a42e` |
| (c) a release outside `APPLICATION_TRUST` refuses, and the item stays unchanged | `red (c): …` in `packages/scope/test/upgrade-application-host.test.ts` | the trust check before any source opens, in `resolve.ts`, disabled | `expected [ { …(6) } ] to deeply equal []` (the host opened the source) | `08fd3b19824bfd2a6250876d62fd0adeca62e861ec938e0b18bdc4ddeb986286` |
| (c) the host prepares an upgrade's fetch | same test | `outside.ts` accepts `install-application` only | `expected null to match object { result: 'refused', … }` | `8cbdc256785ba0bd7b435ca5b6d39bc163e5c3d11259a6317483ca10c6834d75` |
| (d) at every entry at most one of N and its successor is active, and exactly one | `red (d): …` in `packages/platform/test/upgrade-application.test.ts` | the `replaced` effect in `application-keep-creation` removed | `expected [ 'active', 'active' ] to deeply equal [ 'replaced', 'active' ]` | `4dd175f16b026970c48d42dedeff842ead62716be9e0a575482437dbed4d135b` |

Red (c) runs the real outside port, `applicationOutside`, with a trust list
that names Counter 1 only, against the real Native judges of Rules 16. The
host refuses Counter 2 with `untrusted-release` before it opens a source,
and the refused outcome leaves every slot of N as it was. In the same test,
a trust list that also names Counter 2 confirms it, and N moves in place.

The same platform file also shows that an in-place upgrade changes only
`uri`, `release` and `presentation`, and only at the confirmed answer; that a
refused successor leaves N active; and that a second upgrade of N refuses
`application-upgrade-pending` while a successor is pending.

## Request rate

U1 adds no alarm and no timed transition. These counts come from the code;
no run measured them.

- In place: one Rules act entry, one host fetch operation, and one outcome
  entry. The host reads the release from its Git source once and stores it.
  Nothing else wakes.
- Replace: the act entry, then the install pipeline of Rules 15 on the
  successor, the same cost as `install-application`: fetch and admission
  outcomes at Rules, the definition stage, context, grants and creation
  deliveries between Rules, Directory and Membership, and the new
  application scope's genesis. N's end adds one effect to the creation
  result entry and no request.

The old scope's archive after an upgrade is U2's work.
