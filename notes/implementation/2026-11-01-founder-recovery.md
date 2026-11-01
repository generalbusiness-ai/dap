# Refuse a founder key that is also the recovery key

Status: source implementation. No Worker runs this code yet. The planner decides when a deployment creates rooms on the new cohort.

Request `309f3434eb9cff1618d23546a2b00cea6c36ef2e` and promise `81ab0ddba4ec5a02a1afb84119b10319c31ae71b` own this head. Planner decision `40ea8fdf` routes this repair.

## What changed

A key that is both a room's founder key and its recovery key keeps signing as recovery after `revoke-key`. The `recovery-key` rule passes that key without reading its state. The new `separate-recovery` cohort refuses the shape by the name `recovery-key`, in the same way that `join` and `enrol` refuse a recovery key.

- **`found`.** `platform:register@24` adds the guard `founder-not-recovery` (row SR1). A written guard cannot read the signing key as a value (P14), so the check is a marked rule.
- **`first-key`.** `platform:membership@10` adds a written `differs` guard over `foundingKey` and `recoveryKey`. The recovery key can rotate to the founding key between `seat` and `first-key`, because no key item holds the founding key yet. A test reaches this route on real scopes.
- **`platform:directory@23`.** The new directory exists because a directory names the membership that it creates.
- **The cohort.** `SEPARATE_RECOVERY_COHORT` is register 24, directory 23, membership 10, rules 10, destination 13 and inbox 1. The CLI selects it with `--cohort separate-recovery`.
- **Recognition.** The lists that name membership pins, cohorts and directories gain the new pins. `publishing-provenance.ts` admits the new family for destination 13. `applicationRoom` returns the room's membership pin, because rules 10 now serves two memberships.

Hosted code changes. `apps/room/page/assets.ts` is the rebuilt bundle. `pin-native-declarations.mjs` added six lines to `native-declarations.generated.ts` for the three pins and changed no existing line.

New digests:

| Pin | Digest |
|---|---|
| `platform:register@24` | `sha256:0b79285e12fceb6e0fec79d486baebe66ae5bd6ba32c3905f05933fa95cc3e24` |
| `platform:directory@23` | `sha256:ff29fa93bc26eb3bd266fb3c8508127a3966de346b28ec462133eed86ff0414b` |
| `platform:membership@10` | `sha256:7af9b55baaacc6164ffb294dc8e8227025b3f2a33844d2a77c16f831d14c1d00` |

## Decisions

- **An explicit cohort, with defaults unchanged.** Unqualified installs stay on register 18, and the newest cohort does not change. Moving the default is the planner's rollout decision. It also needs `NEWEST`, the `newest` list in `creation-versions.ts` and `scope-index-manifest.ts`, the generated `docs/mcp*`, and the tests that name the pins.
- **`seat` needs no check.** It enrols no key, and an observation of the founding key answers `unknown`. Leaving `seat` open lets a room in that state enrol a separate key.
- **`install` needs no check.** The register has no recovery slot.
- **Directory and membership `establish` need no check.** Only register `found` reaches them.
- **`rotate-recovery` keeps its guard.** Rotation to an enrolled key is refused `key-in-use`. Rotation to the founding key before `first-key` is accepted, and `first-key` then refuses, so the key holds recovery alone. Later `join` and `enrol` by that key are refused `recovery-key`.
- **No repair of existing rooms, and no fallback.** A room in the shape ends it only by rotating its recovery key.
- **No Durable Object migration.** The cohort adds no class.

## Evidence

Checkpoint: head `57fd6ff044bf888e27b5b236aa4a5854514a6a79`, tree `0b50a82ef0433917e9c5b9c6cba22bb32f7e5f00`. The head that adds this note changes nothing else. The red run is at main `8ae17cb2`, tree `80bb2c34`, with one untracked test file. Each row is an observed run, one file at a time. The directory is `~/play/artroom-evidence/2026-11-01-founder-recovery/`.

| Check | Command | Exit | Output digest (sha256) |
|---|---|---|---|
| Red run: `found`, `first-key` after rotation, and a revoked key's `invite-member` are each accepted | `npx vitest run --project scope packages/scope/test/founder-recovery-red.test.ts` | 1 | `2a9ae523d385bff5c70db890cfc1509d63224c3b08f2da4353e8be3008dfc4a1` |
| The four scope tests | `npx vitest run --project scope packages/scope/test/founder-recovery.test.ts` | 0 | `7af5b387bf1e9edd16f6e7b30b67bb551adea773f8ff20721a1da9e0fed50a81` |
| Creation policy with and without the new pins | `npx vitest run --project scope packages/scope/test/creation-versions.test.ts` | 0 | `2f774919306ba7e8b77c02146ac0d1574555e98ecec9e33cdbd45b9252e645fd` |
| Control of `found` | `node scripts/control.mjs` on `founder-not-recovery` | 0 | `10b6d52025bc791116b1325ce32965e0c77de9bebff44afefbeec37d66359036` |
| Control of `first-key` | `node scripts/control.mjs` on the `differs` guard | 0 | `3ae82e544aa9a1c84be1b9f2197e40ba6a1dcbaa17a19fb6555873a29d395549` |
| The page makes separate keys | `npx vitest run --project scope apps/room/page/test/claim.scope.test.ts` | 0 | `78e9cd7c3eedde3a7a43e779c0846c9fadeaa82e857c8b66d7c6d0ce8e0404a4` |
| The CLI makes separate keys | `npx vitest run --project scope packages/cli/test/claim.scope.test.ts` | 0 | `243b67fc21ca3cd4cd8834f008b840bb8c1a9ef1d942fe3a9dfed15fe6217fd8` |
| The demo host script makes separate keys | `npx tsx@4.21.0 --test scripts/demo-git-host.test.mjs`, from a scratch directory | 0 | `c6bc670cc9a4057121eec798cdf0f2e6c93372b15df274778f358902eadac209` |
| Generated declarations | `node packages/platform/scripts/pin-native-declarations.mjs --check` | 0 | `9e92e75dc31e348ede4c75689639b53026db1415576c707424864278d19f1302` |
| Seals | `node --test scripts/security-entry-points.test.mjs` | 0 | `9378567dff5ebfa9080a031476145cadd8c514cfa0623e543ffac22446136600` |
| Settings inventory | `node --test scripts/security-settings.test.mjs` | 0 | `3b3b7dbb4bc76c55149517b00bac9f7cdaeb582a04c62b45dd65944383ad1581` |

The seals moved for 18 owners. `focused/seal-moves.txt` lists each one, and each value came from the owner's failure output.

## Open limits

Request `309f3434eb9cff1618d23546a2b00cea6c36ef2e` owns each limit until the planner assigns it.

- Registers already installed, and every other family, still accept the shape. A new room refuses it only under a register on this cohort.
- One Worker admits child creation from one register, so a deployment moves its root or runs a separate Worker. `docs/deploy.md` lists the steps, and no deployment has run them.
- `CHECKER_KEY_MEMBERSHIP` holds only membership 8, so the cohort offers no checker-key invitation.
- `archive-target`, `archive-host-item` and `ARCHIVE_NATIVE_DATA` omit the cohort, so it offers no journal archive export.
- The page's creation offer covers registers 7, 8 and 17. `apps/views` omits directory 23.
- The route's use of `membershipDefinition` was read. Only the reader has a test.
- No test replays a journal on the new pins from its bytes.
