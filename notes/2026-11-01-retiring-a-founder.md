# How a register retires a founder

Status: design, no code is built.

Ana holds a founder key on the register of a team's Worker. The register runs under policy `keys`. Rita operates the Worker, and keeps the register's operator key on a drive in a locked drawer.

On Tuesday morning, someone steals Ana's laptop with the founder key on it. Ana calls Rita. Rita takes the drive from the drawer and runs one command from the config directory on it.

```
dap retire-founder key_anaLaptop...
```

The command prints these lines.

```
Retired: key_anaLaptop... on register sc_4kq2v7.... The register refuses every later found by this key.
Stopped: 1 claim with no repository.
Not stopped: claims that already hold a repository. Read them with: dap log register
```

Rita runs that command, because the operator key can read the register's log at any time. Rita finds four `found` entries by Ana's key. Ana knows three of the rooms. Nobody knows the fourth room, and it has a repository on the team's Git host. Rita deletes that repository at the host, so later pushes to it fail. The room's scopes stay on the Worker.

Ana makes a new key on a new laptop, and Rita runs `dap add-founder` with that key. Ana then follows [Respond to a stolen key](../docs/security/trust-boundaries.md#respond-to-a-stolen-key) in the three rooms that Ana knows. No Worker setting changes, and nobody deploys.

Today Rita has no such command. `founders` is `fixed: true`, `install` alone writes it, and no act changes it (`packages/platform/src/register.ts:96`, `:135`). This note designs the command. Under policy `open`, any key can sign `found`, so a retirement gives nothing there.

A theft can also show with no call. The register alerts nobody, because `found` has `attention: []` (`register.ts:167`). `dap scope-index census`, signed by the operator key, shows directories that nobody expects (`docs/cli.md:820-823`). The Git host shows repositories that nobody expects.

This note uses these terms:

- The **operator key** is the key that signed the register's `install`.
- A **founder** is a key that the policy `keys` lets sign `found`.
- A **claim** is the item that `found` opens.
- An **attempt** is one try of the operation `create-repository`. A claim has at most three.
- To **retire** a founder is to end that key's right to sign `found`, for good.

A file and line reference marks a fact that was read and not run. A short file name repeats a path given earlier, and a bare `:135` belongs to the file just before it. References hold at main `ad411431`. References to `platform:register@24` hold at the founder key refusal head `641c49b2`, and that head has not landed. No test and no Worker ran anything in this note.

## The operator key retires a founder, and a founder can retire only itself

This section says who signs a retirement, and what remains when a key is stolen or lost.

Two kinds of signer exist at a register, and no others:

- **The operator key.** The genesis entry holds its signed intent. The census already trusts this key as the deployment's operator (`packages/scope/src/scope-index-census.ts:73`).
- **The founders.** The rule `founding-policy` reads `register.policy` and `register.founders`, and nothing else (`packages/platform/src/register.ts:293-301`).

A register has no membership, parties or grants (`register.ts:83`, `:90`). A session of a room's membership can read the register's log, and it signs nothing (`packages/scope/src/signed-reads.ts:77-81`). A Worker setting gives a register's ID and no key (`packages/scope/src/register-setting.ts:12-20`).

### Keep the operator key offline and use it for this one job

Rita needs a key that a stolen laptop does not hold, so this note recommends five rules:

1. The operator key can retire any founder, and it can add a founder.
2. A founder can retire itself. A founder cannot retire another founder, and it cannot add one.
3. The operator key cannot be a founder. `install` and `add-founder` refuse that key.
4. A retired key never returns, because a stolen key stays stolen. `add-founder` refuses it.
5. The operator key has no rotation.

Rule 3 ends a shape that `dap install` makes today. The command writes `founders: [signer.key]`, so one key holds both jobs (`packages/cli/src/commands.ts:288`). A thief with that config directory then holds every authority at the register.

Rule 2 only shrinks the signer's own right, so a thief gains little from it. It also gives Ana a route when Rita's drive is lost.

### Founders must not retire each other, because the thief can sign first

The scope's journal puts two acts in one order. Suppose a register has two founders, and a thief holds one of the keys. If the thief's act lands first, the honest key is off the list, so the honest act gets `unauthorized`. The thief then holds the only founder key.

A rule that keeps the last founder makes this worse, because nobody can then remove the thief. So speed would decide the outcome, and the thief knows about the theft first.

### The operator key reads the register's log at any time

Rita's next step after a retirement is the log, so that read cannot depend on a new entry. A refused act writes no entry. Suppose the thief signs `dap retire-founder --self` first. The claims stop at that entry, and Rita's act then gets a refusal. Rita has no recent entry, so today's rule gives `forbidden` on the next step (`signed-reads.ts:369-373`). The same holds whenever more than 900 seconds pass after Rita's act.

So this note recommends a sixth rule. On the new pin, the operator key can read the register's summary, history and entries with no window. The census already trusts this key across the deployment (`scope-index-census.ts:73`). The key can also get the same read for 900 seconds when it signs `add-founder`, so the rule gives it no new knowledge.

The change sits in `checkedRead`, because a definition states no read rule. `checkedRead` already holds the root of entry 0 (`signed-reads.ts:368`). For a pin in an explicit set, a register whose root actor is the reader sets `scoped` and `whole` with no time check (`:369-370`). `#rooted` already finds that root for a key with no recent entry (`packages/scope/src/object.ts:917-927`).

The set holds the new pin alone. A register from today's `dap install` has one key in both jobs. A thief with that key would gain a read with no end.

The planner rules on this read, because it changes decisions `61cc5e50` and `ca8ad1cf` for one key at one kind of scope.

This note rejects two other answers. A dedicated act writes an entry for each look, and its window still closes. A log out of reach leaves Rita the census and the host's list, and neither shows what this key made.

### A retirement that finds the key already retired succeeds

Rita wants the register to refuse the key, and the register already does. So the command does not report a failure. The guard `current-founder` gives two names, so the command needs no read to tell them apart:

- `founder-retired` means that an earlier retirement holds the key. The command exits 0 and prints the lines below.
- `not-a-founder` means that the key was never on the list. The command prints `Refused: not-a-founder` and exits 1, because the command probably got the wrong key.

```
Already retired: key_anaLaptop.... The register already refuses every found by this key. Nothing changed.
Read who retired it, and what stopped, with: dap log register
```

If the log shows a self-retirement that Ana did not sign, then the thief acted first. The claims stopped at that entry in any case.

### What each loss leaves

| Stolen or lost | What the register does | What the operator does |
|---|---|---|
| One of several founder keys | Refuses that key after the retirement. Other founders go on. | Retires the key, and adds a new one if needed. |
| The only founder key | Refuses every `found` after the retirement, because the list is empty. Claims and rooms that exist go on. | Retires the key, then adds a new founder. |
| A founder key is stolen, and the operator key is lost | Accepts a retirement that the founder key signs itself. Accepts no new founder. | Signs the retirement from a copy of the founder key. Replaces the register when no founder remains. |
| A founder key is stolen with no copy left, and the operator key is lost | Keeps that key on the list. No act can end it. | Replaces the register. |
| The operator key is stolen | Accepts the thief's retirements and new founders, and lets the thief read the log. No act can end this. | Replaces the register. |

A new register has a high cost. The section on a hosted operator gives it.

### What this recommendation weighed, and its cost

This note rejects these other answers:

- **A separate retirement key, given at `install`.** It adds a slot and a third key. The operator key gives the same split once it is no longer a founder.
- **A quorum of founders.** An intent has one `actor`, so a quorum needs a new vote item. A founders list often holds one key.
- **A Worker setting that refuses a key.** A reader of the register cannot see why the key stopped, because a setting sits outside the journal.
- **A rotation of the operator key.** It repeats the race of `rotate-recovery`, where the first signer gives the next key ([that section](../docs/security/trust-boundaries.md#a-founder-key-that-is-also-the-recovery-key-has-no-end-at-membership)). The census also reads this key from the genesis entry, and `docs/cli.md:852` says that it does not support a later key.

The recommendation has four costs:

- `dap install` makes two keys, and the operator must keep the operator key away from every founder's machine.
- A stolen operator key means a new register, and that key reads the log until then.
- A register accepts 256 `add-founder` acts over its life. The 257th gets `type-full`, and the way out is a new register. One replacement a month lasts 21 years.
- A thief with the only founder key can close `found` by a self-retirement, until the operator adds a founder. The operator wanted that key gone in any case.

## A retirement stops every claim with no repository, and nothing past that

This section follows one `found` to a room, and it says what a retirement reaches at each step.

Rita does not choose claims. One act stops every claim of the key that has no repository yet. A signature does not show who held the key, so the act also stops Ana's honest claim. Ana signs again with the new key.

### One `found` goes through four steps

1. The key signs `found`. If `founding-policy` passes, the entry opens a `pending` claim, the operation `create-repository`, and attempt 1 (`register.ts:143-168`, `:324-330`).
2. The scope's driver writes a durable sent mark, then calls the Git host. It never sends that request again (`packages/scope/src/operations.ts:456-460`, `packages/scope/src/register-host.ts:59-62`).
3. An answer becomes an outcome entry (`packages/derive/src/ledger.ts:447-452`). A `refused` or `unknown` outcome opens the next attempt. The first `confirmed` outcome sets `claim.repository`, and the same entry holds the `create` request to the directory (`register.ts:383`, `:416`). A later `confirmed` outcome opens `delete-repository` (`register.ts:386`).
4. The directory's genesis takes the `create` and creates the room's other scopes. Its result moves the claim to `active` (`register.ts:448-462`).

### The act moves a claim to `stopped`, and three rules read that state

`retire-founder` moves each `pending` claim of the key with an empty `repository` to a new final state, `stopped`. `create-repository` already has three hooks, and each then reads the claim's state:

- **`beforeSend`** records a local `refused` before the sent mark. The destination already does this for a superseded file (`packages/platform/src/destination.ts:2874`).
- **`retries`** returns false, so no further attempt opens.
- **`holds`** returns false, so the ledger does not select a late `confirmed` outcome, and that outcome opens `delete-repository` (`ledger.ts:447`).

The journal puts each `found` before or after the retirement, so each claim is in exactly one row below. No row needs a new abort act.

| Where the claim is when the retirement lands | Can it go on? | What the retirement does | What stays afterward |
|---|---|---|---|
| The key signed `found`, and no entry holds it | No | `founding-policy` refuses `unauthorized`, and the scope writes no entry. | Nothing |
| `pending`, attempt open, not sent | No | Stops the claim. `beforeSend` closes the attempt. | The `found` entry and the stopped claim |
| `pending`, attempt sent, no answer yet | The request can arrive at the host | Stops the claim. A `refused` answer ends the operation. A late `confirmed` answer opens `delete-repository`. | A host repository if no answer ever comes, under the attempt's own name (`register.ts:233`) |
| `pending`, all three attempts used | No | Stops the claim, and so frees its place in `max`. | The same, for each `unknown` attempt |
| `delete-repository` or `revoke-credential` in progress | Yes | Nothing. This work removes what the key made. | A repository, if the cleanup fails |
| `pending`, `repository` set, `create` sent | Yes | Nothing. The entry that holds the request exists already. | A host repository and a directory |
| Directory made, result on its way | Yes | Nothing. The claim moves to `active`, and that move is true. | The same |
| `active` | Yes | Nothing. The register has no act or request that reaches a room. | The repository, the directory, membership, rules, the destination and the inbox |

On GitHub, `delete-repository` needs a token for that exact repository in `GITHUB_CLEANUP_TOKENS`. Without it, the deletion waits (`packages/scope/src/github-wiring.ts:106`). A repository of a thief has no such token, so the operator deletes it at the host. On Artifacts, the Worker's binding deletes it (`packages/scope/src/artifacts-host.ts:282-286`).

### A client that holds a stopped claim gets a final answer

Ana's client can hold an original claim that the retirement stopped. Today that client waits for a directory that never comes. `dap create` and `dap claim` run the same code. A rerun settles the saved `found`, then reads the directory up to 120 times (`packages/cli/src/claim.ts:228`, `:265`). It then prints `Gave up waiting for the directory`, and it tells Ana to run the command again (`claim.ts:252`, `packages/cli/src/command-support.ts:309`). The page's Check and Continue run the same code, and they report the claim as `pending` (`apps/room/page/src/claim.ts:254-257`, `:296`).

The client cannot find the state by a read. The summary omits final items (`packages/scope/src/reads.ts:235-236`), and a key with no recent entry gets `forbidden` anyway. So the settlement reply gains one optional member under the new pin: the state of the item that the act opened. The exact signed intent already authorizes that reply (`packages/scope/src/core.ts:795-811`), so nobody else learns the state.

When that state is `stopped`, each path stops at once and exits 1 with these lines:

```
Stopped: the retirement of key_anaLaptop... stopped this claim. No directory follows it.
This key cannot sign a new claim here. Ask the register's operator to add a new key, then claim from a new config directory.
```

- **`dap create` and `dap claim`.** A rerun prints the same lines and does not wait. The saved envelope stays. `--again` signs a new `found`, and the register refuses it `unauthorized`.
- **The page's Check and Continue.** Each shows the same lines. `ClaimStatus` gains the state `stopped` (`apps/room/page/src/claim.ts:47`), `pending` is false, and the page offers no Continue.

The stopped original fences nothing that matters. The page's message `A creation is already in progress` applies to one key (`apps/room/page/src/claim.ts:65`, `:271`). The retired key can sign no new claim, and Ana's new key has a new journal.

Start custody cannot hold such a claim on this cohort. It keeps one row for each origin, and it accepts only registers 7, 8 and 17 (`apps/room/page/src/start-custody.ts:28`, `:87`). A new Start also needs a public offer, and only policy `open` has one (`start-custody.ts:88`). If the planner offers this pin through Start, the row at `:87` then needs a way past a `stopped` original.

A claim with `repository` set does not reach this path, because it does not stop. Its client waits and gives up as it does today.

### A room that the thief made stays the thief's

The thief's `found` sets the room's founder key and its recovery key (`packages/platform/src/directory.ts:261-264`). No other key holds authority in that room unless the thief adds one. Its destination keeps the Worker's host authority, because `destinationBirth` asks only whether the room came from the configured register (`packages/scope/src/host-wiring.ts:22-37`). A deletion at the host ends the pushes and leaves the scopes. A search of `packages/scope/src` and `packages/cli/src` for a scope deletion found none.

### Some things cannot be undone

- A request that left for the Git host.
- A `create` request that an entry holds.
- A directory and the scopes that it creates.
- Anything that the key read or pushed before the retirement.
- The entries of the register's journal.

### `stopped` also frees places in `max`

Today a claim leaves `pending` only by a directory's result. A claim with three failed attempts stays `pending`, and `max: 64` counts it (`register.ts:101`, `packages/derive/src/handlers.ts:296-300`). So 64 such claims make every later `found` fail with `type-full` (`handlers.ts:409-410`). A `stopped` claim is final, so the retirement frees those places.

One kind of claim keeps its place. A claim with `repository` set leaves `pending` only by an `applied` result. A refused genesis writes its entry and sends a `refused` result (`packages/derive/src/genesis.ts:160-166`), and the register's clause for `refused` holds no effect (`register.ts:177`). So that claim stays `pending`, and its repository stays at the host. A retirement does not stop it, because `stop-claims` cannot tell it from a `create` on its way.

A refusal at the Worker's child admission takes another route (`packages/scope/src/scope-index.ts:128`). This note did not trace what the register gets from that route.

## A new register pin holds the change, and an installed register cannot take it

This section gives the definition, the pin, the commands, and what an installed register's operator gets.

### `founders` stays fixed, and two new item types hold the changes

`founders` stays fixed, because a retirement must not move the `register` item's revision. `found` names that item in `also`, so its `expected` needs the revision (`packages/derive/src/judge.ts:293-302`). A change to the item raises the revision (`packages/derive/src/fold.ts:172`). A founder with no entry at the register in the last 900 seconds gets `forbidden` on the summary. That founder cannot learn the new revision (`signed-reads.ts:369-373`).

With separate items, the `register` item stays at revision 1. `retire-founder` also needs no read before its signature, because it opens an item and names no other.

This section rejects two other shapes:

- **A mutable `founders`, with `also.register` dropped from `found`.** `founding-policy` reads the state anyway, so a new pin can give `found` no `expected`. A mark then selects the item for the policy effect (`judge.ts:289-295`, `register.ts:158`). The summary then shows the current list, and that is a real gain. Rule 4 still needs a record of retired keys, so the gain in code is small, and `found` then differs from every earlier register.
- **A final `retired-founder`, with an index on `key`.** It needs no count, and `lookup` finds final items (`packages/derive/src/state.ts:322-334`). The summary omits final items, so `currentFounders` cannot run on a client.

```ts
// Over separateRecoveryRegister, the data of platform:register@24.
items: {
  ...items,
  claim: { ...claim, states: { ...claim.states, stopped: { final: true } } },
  "retired-founder": { many: true, max: 288, initial: "recorded", states: { recorded: { final: false } }, parties: {}, refs: {},
    values: { key: { fixed: true, required: true, of: KEY } } },
  "added-founder": { many: true, max: 256, initial: "recorded", states: { recorded: { final: false } }, parties: {}, refs: {},
    values: { key: { fixed: true, required: true, of: KEY } } },
},
acts: {
  ...acts,
  install: { ...install, guards: [...install.guards, { code: "operator-not-founder", row: "FR1" }] },
  "retire-founder": { step: "open", on: "retired-founder", also: {}, grant: { code: "operator-or-self", row: "FR1" },
    fields: { key: { ...KEY, required: true } },
    guards: [{ code: "keys-policy", row: "FR1" }, { code: "current-founder", row: "FR1" }],
    effects: [{ value: { slot: "key", from: { field: "key" } } }, { code: "stop-claims", row: "FR1" }],
    sends: [], attention: [] },
  "add-founder": { step: "open", on: "added-founder", also: {}, grant: { code: "operator-key", row: "FR1" },
    fields: { key: { ...KEY, required: true } },
    guards: [{ code: "keys-policy", row: "FR1" }, { code: "new-founder", row: "FR1" }],
    effects: [{ value: { slot: "key", from: { field: "key" } } }],
    sends: [], attention: [] },
},
```

`added-founder` counts additions over the register's life, because its one state is not final. The list reads these items, so a final state does not fit them. A `max` of 32 lets routine laptop replacements end a register, so this note sets 256. A larger `max` is cheap, and the destination already declares 2048 (`packages/platform/src/destination-evidence-v17.ts:463`). The cost is that each summary holds every live item (`reads.ts:235-236`).

`max: 288` means that a retirement never gets `type-full`. `founders` holds at most 32 keys (`register.ts:69`), `added-founder` holds at most 256, and a retired key never returns. `new-founder` keeps the current list at 32 keys, the bound that `founders` already has.

| Rule | Place | What it does |
|---|---|---|
| `currentFounders(state)` | Exported helper | Gives `founders` plus each `added-founder` key, minus each `retired-founder` key. |
| `founding-policy`, changed | Grant of `found` | Passes under `open`, or when `currentFounders` holds the key. |
| `operator-or-self` | Grant of `retire-founder` | Passes for the actor of the `founding` intent in `given.own(0)`, or for a signer equal to the field `key`. Otherwise `unauthorized`. |
| `operator-key` | Grant of `add-founder` | Passes for that same actor alone. |
| `keys-policy` | Guard | Refuses `open-policy` under `open`. |
| `current-founder` | Guard | Refuses `founder-retired` when a `retired-founder` item holds the key. Refuses `not-a-founder` when the key was never on the list. |
| `new-founder` | Guard | Refuses `founder-retired`, `founder-present`, `operator-key`, or `founders-full` at 32 current keys. |
| `operator-not-founder` | Guard of `install` | Refuses `operator-key` when `founders` holds the signer, under every policy. |
| `stop-claims` | Effect of `retire-founder` | Moves the key's `pending` claims with an empty `repository` to `stopped`. Declares `most: 64`. |
| `create-repository`, changed | Outcome | Adds `beforeSend`, and adds the claim's state to `retries` and `holds`. `wellFormed` admits the local refusal's body. |

`dap install` writes `founders: [signer.key]` under every policy today (`commands.ts:288`). Under the new guard, the command writes no `founders` under `open`, and it writes the `--founder` keys under `keys`.

`operator-or-self` needs no new slot. It reads the genesis through `given.own(0)`, as `create-directory` reads the entry that opened its operation (`register.ts:417`). `RuleGiven` lists `own` (`packages/derive/src/marks.ts:277`), and `givenTo` falls back to an empty reader when the judge gives none (`marks.ts:482`). The build confirms that a grant's `given` holds it.

`wellFormed` requires `nameExists` and the attempt's own name on a `refused` body (`register.ts:371-373`). So the local refusal carries them, or the rule admits a new body. The build settles that. This note prefers a new body, because `nameExists` would state a fact about the host that nobody asked.

A rule can write an item that is not a subject of the act (`packages/derive/src/effects.ts:223-224`). `derivedEffects` allows 256 effects in one entry (`effects.ts:509-510`, `packages/contract/src/bounds.ts:112`). The 64 state effects come to about 3 KiB, as a sum of 64 effects of 50 bytes, against `entryBytes` of 256 KiB (`bounds.ts:109`). The build measures the whole entry.

### The pin comes after the founder key refusal head

This design needs request `309f3434` to land first. That head adds `platform:register@24`, its data `separateRecoveryRegister`, and the cohort `separate-recovery`.

The new pin is `platform:register@25`, if nothing else takes that number first. The new cohort is `founder-retirement`: register 25, directory 23, membership 10, rules 10, destination 13, and inbox 1. Only the register changes.

A register can share a directory version, as `platform:register@7` does (`register.ts:57`). The directory checks a claim by the name `platform:register` and no version (`directory.ts:116`). `CREATION_COHORTS` must gain the cohort (`packages/scope/src/creation-lineage.ts:21`). The CLI's cohort lists, the native catalog, the generated declarations and the seals also move. The planner decides whether this cohort becomes the default.

### Three new commands sign the acts

| Command | Who runs it | What it signs |
|---|---|---|
| `dap retire-founder <key>` | The operator, from the operator key's config directory | `retire-founder` |
| `dap retire-founder --self` | A founder, from its own config directory | `retire-founder`, with the founder's own key |
| `dap add-founder <key>` | The operator | `add-founder` |
| `dap install ... --founder <key>` | The operator | `install`, with that key in `founders` |

`dap act` reads the summary before it signs (`commands.ts:638`). The operator key can now do that, and a founder with no recent entry cannot. Each new command signs with `expected: {}` and reads nothing first, so `--self` works for that founder. Each command also prints the words that this note gives.

The build also needs these smaller changes:

- A command that makes a key and prints its ID. None exists ([the response steps](../docs/security/trust-boundaries.md#respond-to-a-stolen-key) state this gap).
- A way to write `register` into a founder's config directory. Only `install` writes it today (`commands.ts:278`, `:480`).
- A new selector in `dap create` that signs `expected: { register: 1 }` on the new pin. `retainedRegisterSelector` needs the operator's plan and policy `open`, so it does not fit a founder (`packages/cli/src/claim.ts:24-48`). Today a founder under `keys` reads the summary first, and gets `forbidden` with no recent entry (`:168`).
- The settlement reply's new member, and the `stopped` lines in the commands and the page. The section on a stopped claim gives them.

### An installed register keeps its pin, and the stolen key keeps `found`

A scope runs under its genesis pin for as long as it exists (`packages/platform/src/versions.ts:3-6`). The [definition succession note](2026-10-22-definition-succession.md) leaves platform scopes to a later design, in its section 13. So an installed register cannot take these acts.

The operator of an installed `keys` register has these moves:

- **On GitHub, remove `GITHUB_CREATION_TOKEN`.** Create attempts of every founder then wait, and rooms keep their pushes (`github-wiring.ts:106`). `found` still lands, and claims wait up to `max`. If the token returns, those attempts go out.
- **On Artifacts, no narrow setting exists.** The next section says what a change of `registerScope` does.
- **Install a new register on a separate Worker, on the new cohort.** Old rooms stay on the old Worker, and the stolen key stays on the old register's list.

This note recommends the last move, with the old Worker kept for its rooms. The planner decides whether an installed `keys` register justifies a refusal list at the Worker.

## A hosted operator needs only the act on a new register

This section answers whether a hosted operator needs a setting, a replacement or a page change.

A retirement needs no setting, no deployment and no new register. The act goes through the ordinary act route to the same register, and `REGISTER_SCOPE` still gives that register's ID.

The hosted work comes once, before the first theft:

1. Deploy the code that holds the new pin. Add the pin to `PLATFORM_CREATION_PINS` if it is not the default ([settings](../docs/deploy.md#settings-and-secrets)).
2. Follow [the order](../docs/deploy.md#the-order): plan, set the register's ID, and install.
3. Move the operator key offline.

A Worker with a register already cannot add this one beside it. `readRegisterScope` gives one register, and child creation walks each lineage to that register (`register-setting.ts:12-20`, `creation-lineage.ts:131`). So a new register needs a separate Worker or a planned cutover. [The Commons steps](../docs/deploy.md#provision-the-commons-worker) show the separate Worker.

### A cutover on one Worker strands the old rooms

The pin decides host authority for every room of the register. A change of `registerScope` has these results:

- The old register's attempts stay unsent (`host-wiring.ts:50`).
- Each destination of an old room loses host authority (`host-wiring.ts:27`, `:54-56`).
- Child creation in an old room gets `refused`, and so does a new lane (`creation-lineage.ts:131`).

So this design makes replacement the last step, and it adds `add-founder`. Without that act, the only founder's retirement would force this cutover.

### The page needs one change and no offer

`demoCreationOffer` serves a register under policy `open` alone, so no `keys` register has an offer (`packages/scope/src/demo-creation.ts:35-39`). On a Worker whose public offer serves `open`, a retirement gives nothing.

`allowedClaim` reads `founders` directly, so it must call `currentFounders` (`apps/room/page/src/claim.ts:222`). The register still judges each `found`, so the old reader is wrong and not unsafe.

`SESSION_SECRET` plays no part in a retirement. A new secret ends the sessions of every room, and that step belongs to the response in each room.

## The operator can state what the register refuses, and not what the key did

This section gives the words that the operator can truthfully use.

Rita can say these things:

- The register refuses every `found` by this key, from the retirement's entry onward.
- The journal shows the exact claims that this key opened, and the state of each.
- The stopped claims make no directory.
- This key can read the register's summary for at most 900 seconds after its last entry there.
- The key cannot come back on this register.

The register holds its own list, so the 300-second observation of a room's scope does not apply. A self-retirement by the thief adds one entry, and so one more 900 seconds.

Rita cannot say these things:

- That all repositories from this key are gone. An `unknown` attempt can leave one, and no listing settles it.
- That the thief's rooms are closed.
- That the key stopped elsewhere. Each room and each other register decides for itself.
- When the theft happened. The log shows one key, so it does not separate the thief's claims from Ana's.
- What the key read or pushed.
- That the key can no longer read the repository. It can hold a Git read token, and [that token outlasts the retirement](../docs/security/trust-boundaries.md#a-git-read-token-outlasts-the-bound).

These points stay open:

- **A room that a thief made.** Nobody outside the room can close it. That needs its own design, because no route deletes a scope.
- **A thief's room and the register's log.** A session of that room's membership reads the register's whole log, with no window (`signed-reads.ts:77-81`). That log shows later `found` entries and the retirement.
- **A stolen operator key.** The only way out is a new register, with the cost that the cutover section gives.
- **Installed registers.** The stolen key keeps `found` on them.
- **The number of repositories.** `max` counts live claims alone, so a key can make any number of `active` claims before its retirement. Only the host's own limits apply.
- **Founders on the page.** `allowedClaim` reads the summary, so a founder with no recent entry gets `forbidden` there.
- **Registers on `host: none`.** There `found` sends `create` in its own entry, so no claim can stop (`packages/platform/src/unpublished-register.ts:24`, `:64-70`). The cohort above does not cover them, and a Commons version needs its own row in the table.
- **What no run has covered.** Nothing here ran, and [the list on that page](../docs/security/trust-boundaries.md#what-no-run-has-covered) still applies. This note needs no deployment.
