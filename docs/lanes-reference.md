# Lane reference

This file is generated. Do not edit it. `apps/room/lanes/scripts/reference.mjs` writes it from the lane
definitions in `apps/room/lanes/src`. [lanes.md](lanes.md) says how to read a row.

The stamp: the definitions this file was generated from, by their pinned digests.

| Definition | Digest | Canonical bytes |
|---|---|---|
| `issue` | `sha256:325cb4f33da9deb1a31d85ba0f1456068d4d9d08009978b779aed70cb08e00ad` | 46160 |
| `change` | `sha256:bdeba17b698c5c56b8ab9255ce190d69df146e7b2784d2a636de832c86c2ba60` | 59635 |
| `issue-evidence4` | `sha256:25a65ff7053c923ec7928c17a5e88a1772d9d476483bd28ee246547ca184be25` | 69834 |
| `change-evidence4` | `sha256:ea0a57d0341b3f5077fe0226a95486f51e128ccf0a4984bf93a8b1ffeb83b247` | 76763 |
| `issue-questions` | `sha256:88e763abc263caf65397ba2d87ba629d90d3f09e472ce646ea744034e6909174` | 52161 |
| `issue-questions-brief` | `sha256:04b9f731d50cf2f838525990ab0543d8bc75dfdbf1090a8b971a74c7ca30e2a3` | 52508 |
| `change-finding` | `sha256:16b1ff90f0a7b04ad1b6d3bc0d3052f6d0638d0c52f36571772a7e0a20f8e3ab` | 48618 |

The original issue and change rows were written from Lane forms and browser flow, revision 14, at `4b3bf5da`. Successor profiles have separate pins.

The opt-in `issue-questions` profile binds approval requests and verdicts to the current question text. Its `issue.approve` and `issue.decide` grants belong on person roles only; activation does not change Membership action lists.

The opt-in `issue-questions-brief` profile also records one fixed Brief digest on each ask. Revision may compare that digest but cannot change it. Approvals still name the question text; they approve neither the Brief nor conditions.

The opt-in `change-finding` profile adds the item `finding` to the workspace Change rows, with four acts and one guard of `merge`. A source is a row of the rules' `checks`: the row's `name` is the source's name, and its `checker` is the one member who files for that source. A row with `required: true` is a required source, so `merge` also needs a passed job from it. `merge` refuses `finding-open` while a required source has an open finding on any version of the change. A finding adds no `review`, so it counts as no approval. The source may resolve its own finding. A holder of `change.dismiss` may resolve any finding or mark it irrelevant, except on a change that this holder authored.

How to read the tables:

- A final state is in bold. `?` marks a field or a member that is optional.
- A slot's flags are in brackets: `fixed`, `required`, `list` and `author`. A slot with none has none.
- "Guards, effects, sends, attention" gives the number of forms of each kind that the row writes. The forms
  themselves are in `apps/room/lanes/src`.
- "Settles" is the pending state that the row's entry ends, where the row declares one.
- "Needs" names the capability versions whose code the row needs. The validator reads such a row and derives
  nothing of it. The derive package holds that code as pure functions, and the production ports hold it. A runtime that lacks it does not found
  or create a scope under either definition: `unsupported-definition`.

## `issue`

Name `issue`. Genesis act `file`. Capabilities listed: `hold@1`, `git-read@1`. Rule expressions: 0.

### Item types of `issue`: 12

| Type | How many | States | Slots | Needs |
|---|---|---|---|---|
| `ask` | many, at most 64 live | `answered`, `asked` (initial), **`settled`**, **`withdrawn`** | `addressee`: member (fixed, required); `asker`: member (fixed, required); `answer`: text, at most 4096 bytes; `question`: text, at most 4096 bytes (fixed, required) |  |
| `block` | many, at most 32 live | `blocked` (initial), **`released`** | `commitment`: item of type `commitment` (fixed, required); `on`: fact of kind `ask` under `issue` (fixed, required); `releasedBy`: fact of kind `answer` under `issue`; `reason`: text, at most 4096 bytes |  |
| `comment` | many, at most 5000 live | `collapsed`, **`redacted`**, `visible` (initial) | `author`: member (fixed, required); `mentioned`: member (fixed, list of at most 16); `replyTo`: item of type `comment`; `body`: text, at most 65536 bytes, detached; `collapseReason`: text, at most 1024 bytes |  |
| `commitment` | many, at most 64 live | `accepted`, **`cancelled`**, **`declined`**, **`fulfilled`**, `offered` (initial), `proposed`, **`withdrawn`** | `offeree`: member (fixed); `performer`: member (author); `requester`: member (fixed, required); `successor`: member; `conditionsAt`: fact of kind `file`, `revise` under `issue` (fixed, required); `termsAt`: fact of kind `file`, `revise`, `propose-terms` under `issue` (fixed, required); `conditions`: list of at most 16, each a text, at most 4096 bytes (fixed, required) |  |
| `concern` | many, at most 100 live | **`conflict`**, `created`, `creating` (initial), `delivered`, **`dropped`**, **`refused`** | `child`: scope of kind `lane`; `plan`: item of type `plan` (fixed, required); `result`: fact of kind `offer`, `propose-terms` under `issue`; `interface`: text, at most 4096 bytes (fixed); `purpose`: text, at most 4096 bytes (fixed, required); `role`: enum: `required`, `optional` (fixed, required) |  |
| `decision` | many, at most 32 live | **`recorded`** (initial) | `decider`: member (fixed, required); `acceptance`: fact of kind `accept-report` under `issue` (fixed); `concern`: item of type `concern` (fixed, required); `replacedBy`: item of type `concern` (fixed); `terms`: fact of kind `file`, `revise`, `propose-terms` under `issue` (fixed); `kind`: enum: `replaced`, `excluded`, `accepted-as-delivered` (fixed, required); `reason`: text, at most 4096 bytes (fixed, required) |  |
| `export` | many, at most 16 live | `authorized` (initial), **`done`**, **`refused`** | `authorizer`: member (fixed, required); `from`: member (fixed, required); `to`: member (fixed, required); `hold`: item of type `hold` (fixed, required) |  |
| `hold` | many, at most 16 live | **`ended`**, `held` (initial) | `holder`: member (required); `under`: item of type `commitment` (fixed, required); `ends`: time (required); `epoch`: int, 1 to 1000000 (required); `extent`: text, at most 1024 bytes |  |
| `input` | many, at most 32 live | **`replaced`**, `selected` (initial) | `authors`: member (fixed, list of at most 64); `selector`: member (fixed, required); `accepted`: fact of kind `accept-report` under `issue` (fixed, required); `for`: item of type `commitment` (fixed, required); `report`: fact of kind `report` under `issue` (fixed, required) |  |
| `intent` | one | `closed`, `open` (initial) | `assignees`: member (list of at most 10); `requester`: member (fixed, required); `closedBy`: fact of kind `close-own`, `close-any`, `closes` under `issue`; `conditionsAt`: fact of kind `file`, `revise` under `issue` (required); `currentPlan`: item of type `plan`; `judgedAt`: fact of kind `file`, `revise` under `issue`; `parent`: scope of kind `lane` (fixed); `body`: text, at most 65536 bytes, detached; `closeReason`: enum: `completed`, `not-planned`; `conditions`: list of at most 16, each a text, at most 4096 bytes (required); `judgeEvidence`: list of at most 32, each a digest; `judgeNote`: text, at most 4096 bytes; `labels`: list of at most 20, each a text, at most 64 bytes; `number`: int, 1 to 1000000000; `parentItem`: int, 0 to 1000000000 (fixed); `satisfied`: bool; `title`: text, at most 256 bytes (required) |  |
| `plan` | many, at most 16 live | `open` (initial), `sealed`, **`superseded`** | `planner`: member (fixed, required); `conditionsAt`: fact of kind `file`, `revise` under `issue` (fixed, required) |  |
| `report` | many, at most 64 live | **`accepted`**, **`refused`**, `reported` (initial) | `authors`: member (fixed, list of at most 64); `reporter`: member (fixed, required); `acceptedAt`: fact of kind `accept-report` under `issue`; `conditionsAt`: fact of kind `file`, `revise` under `issue` (fixed, required); `termsAt`: fact of kind `file`, `revise`, `propose-terms` under `issue` (fixed, required); `under`: item of type `commitment` (fixed, required); `claims`: list of at most 32, each a text, at most 1024 bytes (fixed); `commit`: commit (fixed, required); `evidence`: list of at most 32, each a digest (fixed); `reason`: text, at most 4096 bytes; `summary`: text, at most 65536 bytes, detached; `tree`: tree (fixed, required) |  |

### Acts of `issue`: 50

| Kind | Step | Grant | Other items | Fields | Settles | Guards, effects, sends, attention | Needs |
|---|---|---|---|---|---|---|---|
| `accept` | transition on `commitment` | `issue.promise` | None | `terms`: fact of kind `file`, `revise`, `propose-terms` under `issue` |  | 3, 2, 0, 1 |  |
| `accept-handover` | transition on `commitment` | `issue.promise` | None | `terms`: fact of kind `file`, `revise`, `propose-terms` under `issue` |  | 4, 2, 0, 2 |  |
| `accept-report` | transition on `report` | `issue.request` | `commitment`: `commitment` by the field `commitment` | `commitment`: item of type `commitment`; `terms`: fact of kind `file`, `revise`, `propose-terms` under `issue` |  | 6, 2, 0, 0 |  |
| `add-concern` | open on `concern` | `issue.plan` | `plan`: `plan` by the field `plan` | `body?`: text, at most 65536 bytes, detached; `conditions`: list of at most 16, each a text, at most 4096 bytes; `interface?`: text, at most 4096 bytes; `plan`: item of type `plan`; `purpose`: text, at most 4096 bytes; `role`: enum: `required`, `optional`; `title`: text, at most 256 bytes |  | 3, 4, 1, 0 |  |
| `agree` | transition on `commitment` | `issue.request` | None | `terms`: fact of kind `file`, `revise`, `propose-terms` under `issue` |  | 3, 1, 0, 0 |  |
| `answer` | transition on `ask` | `issue.comment` | None | `answer`: text, at most 4096 bytes |  | 2, 2, 0, 1 |  |
| `ask` | open on `ask` | `issue.comment` | None | `addressee`: member; `question`: text, at most 4096 bytes |  | 0, 3, 0, 1 |  |
| `assign` | transition on `intent` | `issue.triage` | None | `assignees`: list of at most 10, each a member |  | 0, 1, 1, 1 |  |
| `authorize-export` | open on `export` | `work.export` | `hold`: `hold` by the field `hold` | `hold`: item of type `hold`; `to`: member |  | 1, 4, 0, 0 |  |
| `block` | open on `block` | `issue.work` | `commitment`: `commitment` by the field `commitment` | `commitment`: item of type `commitment`; `on`: fact of kind `ask` under `issue`; `reason?`: text, at most 4096 bytes |  | 3, 3, 0, 0 |  |
| `cancel` | transition on `commitment` | `issue.request` | None | None |  | 2, 1, 0, 1 |  |
| `close-any` | transition on `intent` | `issue.triage` | None | `reason?`: enum: `completed`, `not-planned` |  | 1, 3, 1, 0 |  |
| `close-own` | transition on `intent` | `issue.close-own` | None | `reason?`: enum: `completed`, `not-planned` |  | 2, 3, 1, 0 |  |
| `collapse-comment` | transition on `comment` | `issue.triage` | None | `reason`: text, at most 1024 bytes |  | 1, 2, 0, 0 |  |
| `comment` | open on `comment` | `issue.comment` | None | `body`: text, at most 65536 bytes, detached; `mentions?`: list of at most 16, each a member; `replyTo?`: item of type `comment` |  | 0, 4, 0, 1 |  |
| `decline` | transition on `commitment` | `issue.promise` | None | None |  | 2, 1, 0, 0 |  |
| `decline-handover` | transition on `commitment` | `issue.promise` | None | None |  | 2, 1, 0, 0 |  |
| `drop-concern` | transition on `concern` | `issue.plan` | None | None |  | 1, 1, 1, 0 |  |
| `edit-any` | transition on `intent` | `issue.edit-any` | None | `body?`: text, at most 65536 bytes, detached; `title?`: text, at most 256 bytes |  | 0, 2, 1, 0 |  |
| `edit-comment-any` | transition on `comment` | `issue.edit-any` | None | `body`: text, at most 65536 bytes, detached |  | 1, 1, 0, 0 |  |
| `edit-comment-own` | transition on `comment` | `issue.comment` | None | `body`: text, at most 65536 bytes, detached |  | 2, 1, 0, 0 |  |
| `edit-own` | transition on `intent` | `issue.edit-own` | None | `body?`: text, at most 65536 bytes, detached; `title?`: text, at most 256 bytes |  | 1, 2, 1, 0 |  |
| `expand-comment` | transition on `comment` | `issue.triage` | None | None |  | 1, 2, 0, 0 |  |
| `file` (genesis) | open on `intent` | `issue.open` | None | `body?`: text, at most 65536 bytes, detached; `conditions`: list of at most 16, each a text, at most 4096 bytes; `number?`: int, 1 to 1000000000; `opener`: member; `origin?`: fact of kind `add-concern` under `issue`; `title`: text, at most 256 bytes |  | 0, 8, 1, 0 |  |
| `fulfil` | transition on `commitment` | `issue.request` | `goal`: `intent` the one item of its type; `report`: `report` by the field `report` | `report`: item of type `report` |  | 5, 1, 1, 0 |  |
| `judge` | transition on `intent` | `issue.judge` | None | `evidence?`: list of at most 32, each a digest; `note?`: text, at most 4096 bytes; `satisfied`: bool |  | 1, 4, 0, 0 |  |
| `label` | transition on `intent` | `issue.triage` | None | `labels`: list of at most 20, each a text, at most 64 bytes |  | 0, 1, 1, 0 |  |
| `offer` | open on `commitment` | `issue.request` | `goal`: `intent` the one item of its type | `offeree?`: member |  | 1, 5, 0, 1 |  |
| `offer-handover` | transition on `commitment` | `issue.promise` | None | `successor`: member |  | 2, 1, 0, 1 |  |
| `open-plan` | open on `plan` | `issue.plan` | `goal`: `intent` the one item of its type | None |  | 1, 2, 0, 0 |  |
| `propose-terms` | open on `commitment` | `issue.promise` | `goal`: `intent` the one item of its type | `conditions`: list of at most 16, each a text, at most 4096 bytes |  | 1, 7, 0, 0 |  |
| `redact-comment-any` | transition on `comment` | `issue.edit-any` | None | None |  | 1, 2, 0, 0 |  |
| `redact-comment-own` | transition on `comment` | `issue.comment` | None | None |  | 2, 2, 0, 0 |  |
| `refuse-report` | transition on `report` | `issue.request` | `commitment`: `commitment` by the field `commitment` | `commitment`: item of type `commitment`; `reason`: text, at most 4096 bytes |  | 3, 3, 0, 1 | `hold@1` |
| `release-block` | transition on `block` | `issue.work` | `commitment`: `commitment` by the field `commitment` | `answer`: fact of kind `answer` under `issue`; `commitment`: item of type `commitment` |  | 6, 2, 0, 0 |  |
| `release-hold` | transition on `hold` | `issue.work` | None | None |  | 2, 1, 0, 0 |  |
| `renew-hold` | transition on `hold` | `issue.work` | `commitment`: `commitment` through the slot `under` of `on` | None |  | 4, 2, 0, 0 |  |
| `reopen-any` | transition on `intent` | `issue.triage` | None | None |  | 1, 3, 1, 0 |  |
| `reopen-own` | transition on `intent` | `issue.close-own` | None | None |  | 2, 3, 1, 0 |  |
| `replace-input` | transition on `input` | `issue.work` | `commitment`: `commitment` by the field `commitment` | `commitment`: item of type `commitment` |  | 3, 1, 0, 0 |  |
| `report` | open on `report` | `issue.work` | `commitment`: `commitment` by the field `commitment` | `claims?`: list of at most 32, each a text, at most 1024 bytes; `commit`: commit; `commitment`: item of type `commitment`; `evidence?`: list of at most 32, each a digest; `summary?`: text, at most 65536 bytes, detached; `terms`: fact of kind `file`, `revise`, `propose-terms` under `issue`; `tree`: tree |  | 5, 11, 0, 1 | `git-read@1`, `hold@1` |
| `resolve-concern` | open on `decision` | `issue.plan` | `concern`: `concern` by the field `concern`; `goal`: `intent` the one item of its type; `plan`: `plan` through the slot `plan` of `also.concern`; `replacement`: `concern` by the field `replacedBy` | `acceptance?`: fact of kind `accept-report` under `issue`; `concern`: item of type `concern`; `kind`: enum: `replaced`, `excluded`, `accepted-as-delivered`; `reason`: text, at most 4096 bytes; `replacedBy?`: item of type `concern`; `terms?`: fact of kind `file`, `revise`, `propose-terms` under `issue` |  | 3, 7, 0, 0 |  |
| `revise` | transition on `intent` | `issue.revise` | None | `conditions`: list of at most 16, each a text, at most 4096 bytes |  | 2, 2, 0, 0 |  |
| `seal-plan` | transition on `plan` | `issue.plan` | `current`: `plan` through the slot `currentPlan` of `also.goal`; `goal`: `intent` the one item of its type | `goalAt`: fact of kind `file`, `revise` under `issue`; `optional`: list of at most 32, each a record of `child?` (scope of kind `lane`), `item` (item of type `concern`); `required`: list of at most 32, each a record of `child?` (scope of kind `lane`), `item` (item of type `concern`) |  | 8, 3, 0, 0 |  |
| `settle-ask` | transition on `ask` | `issue.comment` | None | None |  | 2, 1, 0, 0 |  |
| `take-hold` | open on `hold` | `issue.work` | `commitment`: `commitment` by the field `commitment` | `commitment`: item of type `commitment`; `extent?`: text, at most 1024 bytes |  | 3, 4, 0, 0 |  |
| `use-input` | open on `input` | `issue.work` | `commitment`: `commitment` by the field `commitment` | `accepted`: fact of kind `accept-report` under `issue`; `commitment`: item of type `commitment`; `report`: fact of kind `report` under `issue` |  | 6, 5, 0, 0 |  |
| `withdraw` | transition on `commitment` | `issue.promise` | None | None |  | 2, 1, 0, 1 |  |
| `withdraw-ask` | transition on `ask` | `issue.comment` | None | None |  | 2, 1, 0, 0 |  |
| `withdraw-plan` | transition on `plan` | `issue.plan` | `goal`: `intent` the one item of its type | None |  | 2, 2, 0, 0 |  |

### Handlers of `issue`: 7

| Name | Class and message | From | Opens | Copies | Other items | Fields | Settles | Guards, effects, sends, attention | Needs |
|---|---|---|---|---|---|---|---|---|---|
| `closes` | relate `closes` | `lane` under `change` | Nothing | 32 | `goal`: `intent` the one item of its type | `commit?`: commit; `plan?`: fact of kind `seal-plan` under `issue` | a copy in `set` | 0, 3, 0, 0 |  |
| `export-license` | tell `export-license` | `task` under `platform:task` | Nothing |  | `export`: `export` by the field `export`; `target`: `hold` by the field `hold` | `checkpoint`: digest; `export`: fact of kind `authorize-export` under `issue`; `hold`: item of type `hold`; `instance`: text, at most 128 bytes; `k`: int, 1 to 3 |  | 5, 1, 0, 0 | `hold@1` |
| `export-settled` | tell `export-settled` | `task` under `platform:task` | Nothing |  | `export`: `export` by the field `export` | `export`: fact of kind `authorize-export` under `issue`; `final`: enum: `confirmed`, `withheld` | `also.export` in `authorized` | 2, 3, 0, 0 | `hold@1` |
| `parent-dropped` | tell `parent-dropped` | `lane` under `issue` | Nothing |  | `goal`: `intent` the one item of its type | None |  | 1, 0, 0, 0 |  |
| `pin-confirm` | tell `pin-confirm` | `lane` under `change` | Nothing |  | None | `commit`: commit |  | 3, 1, 0, 0 | `hold@1` |
| `result` | relate `result` | `lane` under `issue` | Nothing | 100 | `concern`: `concern` by the field `parentItem`; `goal`: `intent` the one item of its type | `acceptance`: fact of kind `accept-report` under `issue`; `commitment`: fact of kind `offer`, `propose-terms` under `issue`; `conditions`: fact of kind `file`, `revise` under `issue`; `parentItem`: item of type `concern`; `report`: fact of kind `report` under `issue`; `terms`: fact of kind `file`, `revise`, `propose-terms` under `issue` | `also.concern` in `created` | 2, 2, 0, 1 |  |
| `unpin` | tell `unpin` | `lane` under `change` | Nothing |  | None | `because`: enum: `superseded`, `published`; `commit`: commit; `manifest`: fact of kind `propose-manifest` under `change`; `merge?`: fact of kind `merge` under `change` |  | 5, 1, 0, 0 | `hold@1` |

### Timed rules of `issue`: 1

| Name | On | In states | Deadline slot | Effects, attention |
|---|---|---|---|---|
| `hold-end` | `hold` | `held` | `ends` | 1, 0 |

## `change`

Name `change`. Genesis act `open`. Capabilities listed: `hold@1`, `git-read@1`. Rule expressions: 0.

### Item types of `change`: 14

| Type | How many | States | Slots | Needs |
|---|---|---|---|---|
| `comment` | many, at most 5000 live | `collapsed`, **`redacted`**, `visible` (initial) | `author`: member (fixed, required); `mentioned`: member (fixed, list of at most 16); `replyTo`: item of type `comment`; `thread`: item of type `thread` (fixed); `body`: text, at most 65536 bytes, detached; `collapseReason`: text, at most 1024 bytes |  |
| `commitment` | many, at most 16 live | `accepted`, **`cancelled`**, **`declined`**, `offered` (initial), **`withdrawn`** | `offeree`: member (fixed); `performer`: member (author); `requester`: member (fixed, required); `successor`: member; `termsAt`: fact of kind `offer` under `change` (fixed, required); `terms`: text, at most 4096 bytes (fixed, required) |  |
| `export` | many, at most 16 live | `authorized` (initial), **`done`**, **`refused`** | `authorizer`: member (fixed, required); `from`: member (fixed, required); `to`: member (fixed, required); `hold`: item of type `hold` (fixed, required) |  |
| `hold` | many, at most 16 live | **`ended`**, `held` (initial) | `holder`: member (required); `under`: item of type `commitment` (fixed, required); `ends`: time (required); `epoch`: int, 1 to 1000000 (required); `extent`: text, at most 1024 bytes |  |
| `job` | many, at most 64 live | `errored`, `failed`, `passed`, `requested` (initial), **`superseded`**, `timed-out` | `asker`: member (fixed, required); `informed`: member (fixed, list of at most 2); `decidedBy`: fact of kind `check`, `check-error`, `timed:job-deadline` under `change`; `manifest`: item of type `manifest` (fixed, required); `configuration`: digest (fixed, required); `deadline`: time (fixed, required); `name`: text, at most 128 bytes (fixed, required); `tree`: tree (fixed, required) |  |
| `link` | many, at most 32 live | `removed`, `set` (initial) | `linker`: member (fixed, required); `issue`: scope of kind `lane` (fixed, required); `how`: enum: `keyword`, `manual` (fixed, required) |  |
| `manifest` | many, at most 64 live | `current` (initial), **`superseded`** | `authors`: member (fixed, required, list of at most 64); `integrator`: member (fixed, required); `goal`: fact of kind `file`, `revise` under `issue` (fixed); `pin`: fact of kind `hold@1:check` under `issue` (fixed); `plan`: fact of kind `seal-plan` under `issue` (fixed); `staging`: scope of kind `lane` (fixed); `under`: item of type `commitment` (fixed); `base`: commit (fixed, required); `complete`: bool (fixed, required); `decisions`: list of at most 32, each a fact of kind `resolve-concern` under `issue` (fixed); `digest`: digest (fixed); `integration`: commit (fixed); `path`: text, at most 1024 bytes (fixed); `selected`: list of at most 32, each a record of `accepted` (fact of kind `accept-report` under `issue`), `report` (fact of kind `report` under `issue`) (fixed); `size`: int, 0 to 65536 (fixed); `tree`: tree (fixed) | `hold@1` |
| `merge` | many, at most 16 live | **`aborted`**, `committed`, `intended` (initial), **`published`**, **`refused`**, `unknown` | `merger`: member (fixed, required); `manifest`: item of type `manifest` (fixed, required); `commit`: commit; `reason`: text, at most 1024 bytes; `withdrawal`: enum: `asked` |  |
| `proposal` | one | `closed`, `draft` (initial), **`merged`**, `open` | `assignees`: member (list of at most 10); `author`: member (fixed, required); `destination`: scope of kind `destination` (fixed, required); `rulesScope`: scope of kind `rules` (fixed, required); `body`: text, at most 65536 bytes, detached; `labels`: list of at most 20, each a text, at most 64 bytes; `number`: int, 1 to 1000000000; `title`: text, at most 256 bytes (required) |  |
| `result` | many, at most 512 live | **`recorded`** (initial) | `checker`: member (fixed, required); `job`: item of type `job` (fixed, required); `details`: digest (fixed); `outcome`: enum: `passed`, `failed`, `error` (fixed, required); `reason`: text, at most 4096 bytes (fixed); `tree`: tree (fixed, required) |  |
| `review` | many, at most 256 live | **`dismissed`**, `submitted` (initial), **`superseded`**, **`withdrawn`** | `reviewer`: member (fixed, required); `manifest`: item of type `manifest` (fixed, required); `body`: text, at most 65536 bytes, detached; `dismissal`: text, at most 4096 bytes; `extent`: text, at most 64 bytes (fixed); `verdict`: enum: `approve`, `request-changes` (fixed, required) |  |
| `review-request` | many, at most 64 live | **`met`**, `open` (initial), **`withdrawn`** | `requested`: member (fixed, required); `requester`: member (fixed, required) |  |
| `rules` | one | `current` (initial) | `source`: fact of kind `publish`, `rules-wanted` under `platform:rules`; `approvals`: int, 0 to 64 (required); `checks`: list of at most 32, each a record of `checker` (member), `configuration` (digest), `name` (text, at most 128 bytes), `required` (bool); `extents`: list of at most 8, each a record of `approvals` (int, 0 to 64), `approver` (text, at most 64 bytes), `checks` (list of at most 32, each a text, at most 128 bytes), `class` (enum: `content`, `deployment`, `authority`), `name` (text, at most 64 bytes); `ownerMayReview`: bool (required); `revision`: int, 0 to 1000000000 (required) |  |
| `thread` | many, at most 1000 live | `open` (initial), `resolved` | `opener`: member (fixed, required); `manifest`: item of type `manifest` (fixed, required); `line`: int, 1 to 1000000000 (fixed); `path`: text, at most 4096 bytes (fixed, required); `side`: enum: `base`, `change` (fixed) |  |

### Acts of `change`: 54

| Kind | Step | Grant | Other items | Fields | Settles | Guards, effects, sends, attention | Needs |
|---|---|---|---|---|---|---|---|
| `accept` | transition on `commitment` | `change.promise` | None | `terms`: fact of kind `offer` under `change` |  | 3, 2, 0, 1 |  |
| `accept-handover` | transition on `commitment` | `change.promise` | None | `terms`: fact of kind `offer` under `change` |  | 4, 2, 0, 2 |  |
| `ask-rules` | transition on `proposal` | `change.propose` | None | None |  | 0, 0, 1, 0 |  |
| `authorize-export` | open on `export` | `work.export` | `hold`: `hold` by the field `hold` | `hold`: item of type `hold`; `to`: member |  | 1, 4, 0, 0 |  |
| `cancel` | transition on `commitment` | `change.request` | None | None |  | 2, 1, 0, 1 |  |
| `cancel-merge` | transition on `merge` | `change.merge` | `proposal`: `proposal` the one item of its type | None |  | 2, 1, 1, 0 |  |
| `check` | open on `result` | `change.check` | `job`: `job` by the field `job`; `proposal`: `proposal` the one item of its type; `rules`: `rules` the one item of its type | `configuration`: digest; `details?`: digest; `job`: item of type `job`; `outcome`: enum: `passed`, `failed`; `tree`: tree | `also.job` in `requested`, `timed-out` | 4, 8, 0, 1 |  |
| `check-error` | open on `result` | `change.check` | `job`: `job` by the field `job`; `rules`: `rules` the one item of its type | `configuration`: digest; `details?`: digest; `job`: item of type `job`; `reason`: text, at most 4096 bytes; `tree`: tree | `also.job` in `requested`, `timed-out` | 4, 8, 0, 1 |  |
| `close-any` | transition on `proposal` | `change.edit-any` | None | None |  | 2, 1, 1, 0 |  |
| `close-own` | transition on `proposal` | `change.edit-own` | None | None |  | 3, 1, 1, 0 |  |
| `collapse-comment` | transition on `comment` | `change.triage` | None | `reason`: text, at most 1024 bytes |  | 1, 2, 0, 0 |  |
| `comment` | open on `comment` | `change.comment` | None | `body`: text, at most 65536 bytes, detached; `mentions?`: list of at most 16, each a member; `replyTo?`: item of type `comment`; `thread?`: item of type `thread` |  | 0, 5, 0, 1 |  |
| `decline` | transition on `commitment` | `change.promise` | None | None |  | 2, 1, 0, 0 |  |
| `decline-handover` | transition on `commitment` | `change.promise` | None | None |  | 2, 1, 0, 0 |  |
| `dismiss-review` | transition on `review` | `change.dismiss` | None | `reason`: text, at most 4096 bytes |  | 2, 2, 0, 0 |  |
| `edit-any` | transition on `proposal` | `change.edit-any` | None | `body?`: text, at most 65536 bytes, detached; `labels?`: list of at most 20, each a text, at most 64 bytes; `title?`: text, at most 256 bytes |  | 1, 3, 1, 0 |  |
| `edit-comment-any` | transition on `comment` | `change.edit-any` | None | `body`: text, at most 65536 bytes, detached |  | 1, 1, 0, 0 |  |
| `edit-comment-own` | transition on `comment` | `change.comment` | None | `body`: text, at most 65536 bytes, detached |  | 2, 1, 0, 0 |  |
| `edit-own` | transition on `proposal` | `change.edit-own` | None | `body?`: text, at most 65536 bytes, detached; `labels?`: list of at most 20, each a text, at most 64 bytes; `title?`: text, at most 256 bytes |  | 2, 3, 1, 0 |  |
| `expand-comment` | transition on `comment` | `change.triage` | None | None |  | 1, 2, 0, 0 |  |
| `link-any` | open on `link` | `change.edit-any` | `proposal`: `proposal` the one item of its type | `how`: enum: `keyword`, `manual`; `issue`: scope of kind `lane` |  | 3, 3, 1, 0 |  |
| `link-own` | open on `link` | `change.edit-own` | `proposal`: `proposal` the one item of its type | `how`: enum: `keyword`, `manual`; `issue`: scope of kind `lane` |  | 4, 3, 1, 0 |  |
| `merge` | open on `merge` | `change.merge` | `manifest`: `manifest` by the field `manifest`; `proposal`: `proposal` the one item of its type; `rules`: `rules` the one item of its type | `manifest`: item of type `manifest`; `reports`: list of at most 32, each a fact of kind `report` under `issue` |  | 10, 2, 1, 0 |  |
| `offer` | open on `commitment` | `change.request` | `proposal`: `proposal` the one item of its type | `offeree?`: member; `terms`: text, at most 4096 bytes |  | 1, 4, 0, 1 |  |
| `offer-handover` | transition on `commitment` | `change.promise` | None | `successor`: member |  | 2, 1, 0, 1 |  |
| `open` (genesis) | open on `proposal` | `change.open` | None | `body?`: text, at most 65536 bytes, detached; `destination`: scope of kind `destination`; `draft`: bool; `number?`: int, 1 to 1000000000; `opener`: member; `rules`: scope of kind `rules`; `title`: text, at most 256 bytes |  | 0, 7, 1, 0 |  |
| `open-thread` | open on `thread` | `change.comment` | `manifest`: `manifest` by the field `manifest` | `line?`: int, 1 to 1000000000; `manifest`: item of type `manifest`; `path`: text, at most 4096 bytes; `side?`: enum: `base`, `change` |  | 0, 5, 0, 0 |  |
| `propose-file` | open on `manifest` | `change.propose` | `proposal`: `proposal` the one item of its type | `base`: commit; `content`: text, at most 65536 bytes; `digest`: digest; `path`: text, at most 1024 bytes; `size`: int, 0 to 65536 |  | 4, 7, 0, 0 |  |
| `propose-manifest` | open on `manifest` | `change.propose` | `commitment`: `commitment` through the slot `under` of `also.hold`; `hold`: `hold` by the field `hold`; `previous`: `manifest` by the field `previous`; `proposal`: `proposal` the one item of its type | `base`: commit; `complete`: bool; `decisions`: list of at most 32, each a fact of kind `resolve-concern` under `issue`; `foreignHold?`: int, 0 to 1000000000; `goal?`: fact of kind `file`, `revise` under `issue`; `hold?`: item of type `hold`; `instance`: text, at most 128 bytes; `integration`: commit; `lane?`: scope of kind `lane`; `plan?`: fact of kind `seal-plan` under `issue`; `previous?`: item of type `manifest`; `selected`: list of at most 32, each a record of `accepted` (fact of kind `accept-report` under `issue`), `report` (fact of kind `report` under `issue`); `tree`: tree. Presented: `pin?`: fact of kind `hold@1:check` under `issue` |  | 24, 16, 2, 0 | `git-read@1`, `hold@1` |
| `ready-any` | transition on `proposal` | `change.edit-any` | None | None |  | 1, 1, 1, 0 |  |
| `ready-own` | transition on `proposal` | `change.edit-own` | None | None |  | 2, 1, 1, 0 |  |
| `redact-comment-any` | transition on `comment` | `change.edit-any` | None | None |  | 1, 2, 0, 0 |  |
| `redact-comment-own` | transition on `comment` | `change.comment` | None | None |  | 2, 2, 0, 0 |  |
| `release-hold` | transition on `hold` | `change.work` | None | None |  | 2, 1, 0, 0 |  |
| `renew-hold` | transition on `hold` | `change.work` | `commitment`: `commitment` through the slot `under` of `on` | None |  | 4, 2, 0, 0 |  |
| `reopen-any` | transition on `proposal` | `change.edit-any` | None | None |  | 1, 1, 1, 0 |  |
| `reopen-own` | transition on `proposal` | `change.edit-own` | None | None |  | 2, 1, 1, 0 |  |
| `reopen-thread-any` | transition on `thread` | `change.edit-any` | `proposal`: `proposal` the one item of its type | None |  | 1, 1, 0, 0 |  |
| `reopen-thread-own` | transition on `thread` | `change.edit-own` | `proposal`: `proposal` the one item of its type | None |  | 2, 1, 0, 0 |  |
| `request-check` | open on `job` | `change.propose` | `earlier`: `job` by the field `earlier`; `manifest`: `manifest` by the field `manifest`; `proposal`: `proposal` the one item of its type; `rules`: `rules` the one item of its type | `configuration`: digest; `earlier?`: item of type `job`; `manifest`: item of type `manifest`; `name`: text, at most 128 bytes |  | 7, 8, 0, 0 |  |
| `request-review-any` | open on `review-request` | `change.edit-any` | `proposal`: `proposal` the one item of its type | `requested`: member |  | 1, 2, 0, 1 |  |
| `request-review-own` | open on `review-request` | `change.edit-own` | `proposal`: `proposal` the one item of its type | `requested`: member |  | 2, 2, 0, 1 |  |
| `resolve-thread-any` | transition on `thread` | `change.edit-any` | `proposal`: `proposal` the one item of its type | None |  | 1, 1, 0, 0 |  |
| `resolve-thread-own` | transition on `thread` | `change.edit-own` | `proposal`: `proposal` the one item of its type | None |  | 2, 1, 0, 0 |  |
| `review-verdict` | open on `review` | `change.review` | `earlier`: `review` by the field `earlier`; `manifest`: `manifest` by the field `manifest`; `proposal`: `proposal` the one item of its type; `request`: `review-request` by the field `request` | `body?`: text, at most 65536 bytes, detached; `earlier?`: item of type `review`; `extent?`: text, at most 64 bytes; `manifest`: item of type `manifest`; `request?`: item of type `review-request`; `verdict`: enum: `approve`, `request-changes` |  | 9, 7, 0, 1 |  |
| `take-hold` | open on `hold` | `change.work` | `commitment`: `commitment` by the field `commitment`; `proposal`: `proposal` the one item of its type | `commitment`: item of type `commitment`; `extent?`: text, at most 1024 bytes |  | 4, 4, 0, 0 |  |
| `to-draft-any` | transition on `proposal` | `change.edit-any` | None | None |  | 2, 1, 1, 0 |  |
| `to-draft-own` | transition on `proposal` | `change.edit-own` | None | None |  | 3, 1, 1, 0 |  |
| `unlink-any` | transition on `link` | `change.edit-any` | `proposal`: `proposal` the one item of its type | None |  | 3, 1, 1, 0 |  |
| `unlink-own` | transition on `link` | `change.edit-own` | `proposal`: `proposal` the one item of its type | None |  | 4, 1, 1, 0 |  |
| `withdraw` | transition on `commitment` | `change.promise` | None | None |  | 2, 1, 0, 1 |  |
| `withdraw-review` | transition on `review` | `change.review` | None | None |  | 3, 1, 0, 0 |  |
| `withdraw-review-request-any` | transition on `review-request` | `change.edit-any` | `proposal`: `proposal` the one item of its type | None |  | 1, 1, 0, 0 |  |
| `withdraw-review-request-own` | transition on `review-request` | `change.edit-own` | `proposal`: `proposal` the one item of its type | None |  | 2, 1, 0, 0 |  |

### Handlers of `change`: 4

| Name | Class and message | From | Opens | Copies | Other items | Fields | Settles | Guards, effects, sends, attention | Needs |
|---|---|---|---|---|---|---|---|---|---|
| `export-license` | tell `export-license` | `task` under `platform:task` | Nothing |  | `export`: `export` by the field `export`; `target`: `hold` by the field `hold` | `checkpoint`: digest; `export`: fact of kind `authorize-export` under `change`; `hold`: item of type `hold`; `instance`: text, at most 128 bytes; `k`: int, 1 to 3 |  | 5, 1, 0, 0 | `hold@1` |
| `export-settled` | tell `export-settled` | `task` under `platform:task` | Nothing |  | `export`: `export` by the field `export` | `export`: fact of kind `authorize-export` under `change`; `final`: enum: `confirmed`, `withheld` | `also.export` in `authorized` | 2, 3, 0, 0 | `hold@1` |
| `publication` | relate `publication` | `destination` under `platform:destination` | Nothing | 16 | `manifest`: `manifest` through the slot `manifest` of `also.merge`; `merge`: `merge` by the field `operation`; `proposal`: `proposal` the one item of its type | `commit?`: commit; `operation`: fact of kind `merge` under `change`; `outcome`: enum: `committed`, `unknown`, `published`, `refused`, `aborted`; `reason?`: text, at most 1024 bytes; `rules?`: int, 0 to 1000000000 | `also.merge` in `intended`, `committed`, `unknown` | 2, 9, 3, 0 | `hold@1` |
| `rules` | relate `rules` | `rules` under `platform:rules` | `rules` | 1 | `proposal`: `proposal` the one item of its type | `approvals`: int, 0 to 64; `checks?`: list of at most 32, each a record of `checker` (member), `configuration` (digest), `name` (text, at most 128 bytes), `required` (bool); `extents?`: list of at most 8, each a record of `approvals` (int, 0 to 64), `approver` (text, at most 64 bytes), `checks` (list of at most 32, each a text, at most 128 bytes), `class` (enum: `content`, `deployment`, `authority`), `name` (text, at most 64 bytes); `labels?`: list of at most 32, each a text, at most 64 bytes; `ownerMayReview`: bool; `singleControllerException?`: bool |  | 1, 6, 0, 0 |  |

### Timed rules of `change`: 2

| Name | On | In states | Deadline slot | Effects, attention |
|---|---|---|---|---|
| `hold-end` | `hold` | `held` | `ends` | 1, 0 |
| `job-deadline` | `job` | `requested` | `deadline` | 2, 1 |

## `issue-evidence4`

Name `issue`. Genesis act `file`. Capabilities listed: `hold@1`, `git-read@1`. Rule expressions: 0.

### Item types of `issue-evidence4`: 15

| Type | How many | States | Slots | Needs |
|---|---|---|---|---|
| `ask` | many, at most 64 live | `answered`, `asked` (initial), **`settled`**, **`withdrawn`** | `addressee`: member (fixed, required); `asker`: member (fixed, required); `answer`: text, at most 4096 bytes; `question`: text, at most 4096 bytes (fixed, required) |  |
| `block` | many, at most 32 live | `blocked` (initial), **`released`** | `commitment`: item of type `commitment` (fixed, required); `on`: fact of kind `ask` under `issue` (fixed, required); `releasedBy`: fact of kind `answer` under `issue`; `reason`: text, at most 4096 bytes |  |
| `comment` | many, at most 5000 live | `collapsed`, **`redacted`**, `visible` (initial) | `author`: member (fixed, required); `mentioned`: member (fixed, list of at most 16); `replyTo`: item of type `comment`; `body`: text, at most 65536 bytes, detached; `collapseReason`: text, at most 1024 bytes |  |
| `commitment` | many, at most 64 live | `accepted`, **`cancelled`**, **`declined`**, **`fulfilled`**, `offered` (initial), `proposed`, **`withdrawn`** | `offeree`: member (fixed); `performer`: member (author); `requester`: member (fixed, required); `successor`: member; `conditionsAt`: fact of kind `file`, `revise` under `issue` (fixed, required); `termsAt`: fact of kind `file`, `revise`, `propose-terms` under `issue` (fixed, required); `conditions`: list of at most 16, each a text, at most 4096 bytes (fixed, required) |  |
| `concern` | many, at most 100 live | **`conflict`**, `created`, `creating` (initial), `delivered`, **`dropped`**, **`refused`** | `child`: scope of kind `lane`; `plan`: item of type `plan` (fixed, required); `result`: fact of kind `offer`, `propose-terms` under `issue`; `interface`: text, at most 4096 bytes (fixed); `purpose`: text, at most 4096 bytes (fixed, required); `role`: enum: `required`, `optional` (fixed, required) |  |
| `decision` | many, at most 32 live | **`recorded`** (initial) | `decider`: member (fixed, required); `acceptance`: fact of kind `accept-report` under `issue` (fixed); `concern`: item of type `concern` (fixed, required); `replacedBy`: item of type `concern` (fixed); `terms`: fact of kind `file`, `revise`, `propose-terms` under `issue` (fixed); `kind`: enum: `replaced`, `excluded`, `accepted-as-delivered` (fixed, required); `reason`: text, at most 4096 bytes (fixed, required) |  |
| `export` | many, at most 16 live | `authorized` (initial), **`done`**, **`refused`** | `authorizer`: member (fixed, required); `from`: member (fixed, required); `to`: member (fixed, required); `hold`: item of type `hold` (fixed, required) |  |
| `hold` | many, at most 16 live | **`ended`**, `held` (initial) | `holder`: member (required); `under`: item of type `commitment` (fixed, required); `ends`: time (required); `epoch`: int, 1 to 1000000 (required); `extent`: text, at most 1024 bytes |  |
| `input` | many, at most 32 live | **`replaced`**, `selected` (initial) | `authors`: member (fixed, list of at most 64); `selector`: member (fixed, required); `accepted`: fact of kind `accept-report` under `issue` (fixed, required); `for`: item of type `commitment` (fixed, required); `report`: fact of kind `report` under `issue` (fixed, required) |  |
| `intent` | one | `closed`, `open` (initial) | `assignees`: member (list of at most 10); `requester`: member (fixed); `triagers`: member (fixed, list of at most 32); `closedBy`: fact of kind `close-own`, `close-any`, `closes` under `issue`; `conditionsAt`: fact of kind `file`, `revise` under `issue` (required); `currentPlan`: item of type `plan`; `judgedAt`: fact of kind `file`, `revise` under `issue`; `parent`: scope of kind `lane` (fixed); `failure`: fact of kind `check-fence`, `work-check-fence`, `reserve`, `platform:destination@17:evidence-admit`, `platform:destination@17:evidence-result`, `platform:destination@17:evidence-progress`, `platform:destination@17:judge`, `platform:destination@17:check-judge`, `platform:destination@17:receipt`, `platform:destination@17:read`, `platform:destination@17:evidence-notice`, `platform:destination@17:evidence-audit`, `platform:destination@17:published-checks` under `platform:destination` (fixed); `failedJob`: fact of kind `request-check`, `admit-published-check`, `admit-audit-check` under `change` (fixed); `failedResult`: fact of kind `check`, `check-error` under `change` (fixed); `body`: text, at most 65536 bytes, detached; `closeReason`: enum: `completed`, `not-planned`; `conditions`: list of at most 16, each a text, at most 4096 bytes (required); `judgeEvidence`: list of at most 32, each a digest; `judgeNote`: text, at most 4096 bytes; `labels`: list of at most 20, each a text, at most 64 bytes; `number`: int, 1 to 1000000000; `parentItem`: int, 0 to 1000000000 (fixed); `satisfied`: bool; `title`: text, at most 256 bytes (required); `kind`: enum: `ordinary`, `published-failure` (fixed, required); `publishedCommit`: commit (fixed) |  |
| `plan` | many, at most 16 live | `open` (initial), `sealed`, **`superseded`** | `planner`: member (fixed, required); `conditionsAt`: fact of kind `file`, `revise` under `issue` (fixed, required) |  |
| `report` | many, at most 64 live | **`accepted`**, **`refused`**, `reported` (initial) | `authors`: member (fixed, list of at most 64); `reporter`: member (fixed, required); `acceptedAt`: fact of kind `accept-report` under `issue`; `conditionsAt`: fact of kind `file`, `revise` under `issue` (fixed, required); `termsAt`: fact of kind `file`, `revise`, `propose-terms` under `issue` (fixed, required); `under`: item of type `commitment` (fixed, required); `claims`: list of at most 32, each a text, at most 1024 bytes (fixed); `commit`: commit (fixed, required); `evidence`: list of at most 32, each a digest (fixed); `reason`: text, at most 4096 bytes; `summary`: text, at most 65536 bytes, detached; `tree`: tree (fixed, required) |  |
| `work-source` | many, at most 64 live | `staged` (initial), **`released`** | `performer`: member (fixed, required); `commitment`: item of type `commitment` (fixed, required); `termsAt`: fact of kind `file`, `revise`, `propose-terms` under `issue` (fixed, required); `destination`: scope of kind `destination` (fixed, required); `commit`: commit (fixed, required); `releaseReason`: text, at most 4096 bytes |  |
| `job` | many, at most 64 live | `queued` (initial), `requested`, `passed`, `failed`, `errored`, `timed-out`, **`superseded`**, **`fence-refused`**, **`reused`** | `asker`: member (fixed); `checker`: member (fixed, required); `countedJob`: fact of kind `request-work-check` under `issue`; `countedResult`: fact of kind `check`, `check-error` under `issue`; `destination`: scope of kind `destination` (fixed, required); `admission`: fact of kind `check-fence`, `work-check-fence`, `reserve`, `platform:destination@17:evidence-admit`, `platform:destination@17:evidence-result`, `platform:destination@17:evidence-progress`, `platform:destination@17:judge`, `platform:destination@17:check-judge`, `platform:destination@17:receipt`, `platform:destination@17:read`, `platform:destination@17:evidence-notice`, `platform:destination@17:evidence-audit`, `platform:destination@17:published-checks` under `platform:destination`; `nativeDecision`: fact of kind `check-fence`, `work-check-fence`, `reserve`, `platform:destination@17:evidence-admit`, `platform:destination@17:evidence-result`, `platform:destination@17:evidence-progress`, `platform:destination@17:judge`, `platform:destination@17:check-judge`, `platform:destination@17:receipt`, `platform:destination@17:read`, `platform:destination@17:evidence-notice`, `platform:destination@17:evidence-audit`, `platform:destination@17:published-checks` under `platform:destination`; `decidedBy`: fact of kind `check`, `check-error`, `timed:job-deadline` under `issue`; `workSource`: item of type `work-source` (fixed, required); `name`: text, at most 128 bytes (fixed, required); `tree`: tree; `configuration`: digest (fixed, required); `deadline`: time (fixed, required); `binding`: text, at most 16384 bytes (fixed, required); `bindingDigest`: digest (fixed, required); `stage`: enum: `work`, `landing`, `published` (fixed, required); `commit`: commit (fixed, required); `base`: commit; `reason`: text, at most 128 bytes; `frozenGeneration`: text, at most 512 bytes; `observedGeneration`: text, at most 512 bytes |  |
| `result` | many, at most 512 live | **`recorded`** (initial) | `checker`: member (fixed, required); `job`: item of type `job` (fixed, required); `outcome`: enum: `passed`, `failed`, `error` (fixed, required); `reason`: text, at most 4096 bytes (fixed); `tree`: tree (fixed, required); `details`: digest (fixed); `bindingDigest`: digest (fixed, required) |  |

### Acts of `issue-evidence4`: 55

| Kind | Step | Grant | Other items | Fields | Settles | Guards, effects, sends, attention | Needs |
|---|---|---|---|---|---|---|---|
| `accept` | transition on `commitment` | `issue.promise` | None | `terms`: fact of kind `file`, `revise`, `propose-terms` under `issue` |  | 3, 2, 0, 1 |  |
| `accept-handover` | transition on `commitment` | `issue.promise` | None | `terms`: fact of kind `file`, `revise`, `propose-terms` under `issue` |  | 4, 2, 0, 2 |  |
| `accept-report` | transition on `report` | `issue.request` | `commitment`: `commitment` by the field `commitment` | `commitment`: item of type `commitment`; `terms`: fact of kind `file`, `revise`, `propose-terms` under `issue` |  | 6, 2, 0, 0 |  |
| `add-concern` | open on `concern` | `issue.plan` | `plan`: `plan` by the field `plan` | `body?`: text, at most 65536 bytes, detached; `conditions`: list of at most 16, each a text, at most 4096 bytes; `interface?`: text, at most 4096 bytes; `plan`: item of type `plan`; `purpose`: text, at most 4096 bytes; `role`: enum: `required`, `optional`; `title`: text, at most 256 bytes |  | 3, 4, 1, 0 |  |
| `agree` | transition on `commitment` | `issue.request` | None | `terms`: fact of kind `file`, `revise`, `propose-terms` under `issue` |  | 3, 1, 0, 0 |  |
| `answer` | transition on `ask` | `issue.comment` | None | `answer`: text, at most 4096 bytes |  | 2, 2, 0, 1 |  |
| `ask` | open on `ask` | `issue.comment` | None | `addressee`: member; `question`: text, at most 4096 bytes |  | 0, 3, 0, 1 |  |
| `assign` | transition on `intent` | `issue.triage` | None | `assignees`: list of at most 10, each a member |  | 0, 1, 1, 1 |  |
| `authorize-export` | open on `export` | `work.export` | `hold`: `hold` by the field `hold` | `hold`: item of type `hold`; `to`: member |  | 1, 4, 0, 0 |  |
| `block` | open on `block` | `issue.work` | `commitment`: `commitment` by the field `commitment` | `commitment`: item of type `commitment`; `on`: fact of kind `ask` under `issue`; `reason?`: text, at most 4096 bytes |  | 3, 3, 0, 0 |  |
| `cancel` | transition on `commitment` | `issue.request` | None | None |  | 2, 1, 0, 1 |  |
| `close-any` | transition on `intent` | `issue.triage` | None | `reason?`: enum: `completed`, `not-planned` |  | 1, 3, 1, 0 |  |
| `close-own` | transition on `intent` | `issue.close-own` | None | `reason?`: enum: `completed`, `not-planned` |  | 2, 3, 1, 0 |  |
| `collapse-comment` | transition on `comment` | `issue.triage` | None | `reason`: text, at most 1024 bytes |  | 1, 2, 0, 0 |  |
| `comment` | open on `comment` | `issue.comment` | None | `body`: text, at most 65536 bytes, detached; `mentions?`: list of at most 16, each a member; `replyTo?`: item of type `comment` |  | 0, 4, 0, 1 |  |
| `decline` | transition on `commitment` | `issue.promise` | None | None |  | 2, 1, 0, 0 |  |
| `decline-handover` | transition on `commitment` | `issue.promise` | None | None |  | 2, 1, 0, 0 |  |
| `drop-concern` | transition on `concern` | `issue.plan` | None | None |  | 1, 1, 1, 0 |  |
| `edit-any` | transition on `intent` | `issue.edit-any` | None | `body?`: text, at most 65536 bytes, detached; `title?`: text, at most 256 bytes |  | 0, 2, 1, 0 |  |
| `edit-comment-any` | transition on `comment` | `issue.edit-any` | None | `body`: text, at most 65536 bytes, detached |  | 1, 1, 0, 0 |  |
| `edit-comment-own` | transition on `comment` | `issue.comment` | None | `body`: text, at most 65536 bytes, detached |  | 2, 1, 0, 0 |  |
| `edit-own` | transition on `intent` | `issue.edit-own` | None | `body?`: text, at most 65536 bytes, detached; `title?`: text, at most 256 bytes |  | 1, 2, 1, 0 |  |
| `expand-comment` | transition on `comment` | `issue.triage` | None | None |  | 1, 2, 0, 0 |  |
| `file` (genesis) | open on `intent` | `issue.open` | None | `body?`: text, at most 65536 bytes, detached; `conditions`: list of at most 16, each a text, at most 4096 bytes; `number?`: int, 1 to 1000000000; `opener?`: member; `origin?`: fact of kind `add-concern` under `issue`; `title`: text, at most 256 bytes; `kind?`: enum: `ordinary`, `published-failure`; `incident?`: fact of kind `published-check-failure` under `change`; `failure?`: fact of kind `check-fence`, `work-check-fence`, `reserve`, `platform:destination@17:evidence-admit`, `platform:destination@17:evidence-result`, `platform:destination@17:evidence-progress`, `platform:destination@17:judge`, `platform:destination@17:check-judge`, `platform:destination@17:receipt`, `platform:destination@17:read`, `platform:destination@17:evidence-notice`, `platform:destination@17:evidence-audit`, `platform:destination@17:published-checks` under `platform:destination`; `failedJob?`: fact of kind `request-check`, `admit-published-check`, `admit-audit-check` under `change`; `failedResult?`: fact of kind `check`, `check-error` under `change`; `publishedCommit?`: commit; `triagers?`: list of at most 32, each a member |  | 1, 16, 1, 1 |  |
| `fulfil` | transition on `commitment` | `issue.request` | `goal`: `intent` the one item of its type; `report`: `report` by the field `report` | `report`: item of type `report` |  | 5, 1, 1, 0 |  |
| `judge` | transition on `intent` | `issue.judge` | None | `evidence?`: list of at most 32, each a digest; `note?`: text, at most 4096 bytes; `satisfied`: bool |  | 1, 4, 0, 0 |  |
| `label` | transition on `intent` | `issue.triage` | None | `labels`: list of at most 20, each a text, at most 64 bytes |  | 0, 1, 1, 0 |  |
| `offer` | open on `commitment` | `issue.request` | `goal`: `intent` the one item of its type | `offeree?`: member |  | 1, 5, 0, 1 |  |
| `offer-handover` | transition on `commitment` | `issue.promise` | None | `successor`: member |  | 2, 1, 0, 1 |  |
| `open-plan` | open on `plan` | `issue.plan` | `goal`: `intent` the one item of its type | None |  | 1, 2, 0, 0 |  |
| `propose-terms` | open on `commitment` | `issue.promise` | `goal`: `intent` the one item of its type | `conditions`: list of at most 16, each a text, at most 4096 bytes |  | 1, 7, 0, 0 |  |
| `redact-comment-any` | transition on `comment` | `issue.edit-any` | None | None |  | 1, 2, 0, 0 |  |
| `redact-comment-own` | transition on `comment` | `issue.comment` | None | None |  | 2, 2, 0, 0 |  |
| `refuse-report` | transition on `report` | `issue.request` | `commitment`: `commitment` by the field `commitment` | `commitment`: item of type `commitment`; `reason`: text, at most 4096 bytes |  | 3, 3, 0, 1 | `hold@1` |
| `release-block` | transition on `block` | `issue.work` | `commitment`: `commitment` by the field `commitment` | `answer`: fact of kind `answer` under `issue`; `commitment`: item of type `commitment` |  | 6, 2, 0, 0 |  |
| `release-hold` | transition on `hold` | `issue.work` | None | None |  | 2, 1, 0, 0 |  |
| `renew-hold` | transition on `hold` | `issue.work` | `commitment`: `commitment` through the slot `under` of `on` | None |  | 4, 2, 0, 0 |  |
| `reopen-any` | transition on `intent` | `issue.triage` | None | None |  | 1, 3, 1, 0 |  |
| `reopen-own` | transition on `intent` | `issue.close-own` | None | None |  | 2, 3, 1, 0 |  |
| `replace-input` | transition on `input` | `issue.work` | `commitment`: `commitment` by the field `commitment` | `commitment`: item of type `commitment` |  | 3, 1, 0, 0 |  |
| `report` | open on `report` | `issue.work` | `commitment`: `commitment` by the field `commitment` | `claims?`: list of at most 32, each a text, at most 1024 bytes; `commit`: commit; `commitment`: item of type `commitment`; `evidence?`: list of at most 32, each a digest; `summary?`: text, at most 65536 bytes, detached; `terms`: fact of kind `file`, `revise`, `propose-terms` under `issue`; `tree`: tree |  | 5, 11, 0, 1 | `git-read@1`, `hold@1` |
| `resolve-concern` | open on `decision` | `issue.plan` | `concern`: `concern` by the field `concern`; `goal`: `intent` the one item of its type; `plan`: `plan` through the slot `plan` of `also.concern`; `replacement`: `concern` by the field `replacedBy` | `acceptance?`: fact of kind `accept-report` under `issue`; `concern`: item of type `concern`; `kind`: enum: `replaced`, `excluded`, `accepted-as-delivered`; `reason`: text, at most 4096 bytes; `replacedBy?`: item of type `concern`; `terms?`: fact of kind `file`, `revise`, `propose-terms` under `issue` |  | 3, 7, 0, 0 |  |
| `revise` | transition on `intent` | `issue.revise` | None | `conditions`: list of at most 16, each a text, at most 4096 bytes |  | 2, 2, 0, 0 |  |
| `seal-plan` | transition on `plan` | `issue.plan` | `current`: `plan` through the slot `currentPlan` of `also.goal`; `goal`: `intent` the one item of its type | `goalAt`: fact of kind `file`, `revise` under `issue`; `optional`: list of at most 32, each a record of `child?` (scope of kind `lane`), `item` (item of type `concern`); `required`: list of at most 32, each a record of `child?` (scope of kind `lane`), `item` (item of type `concern`) |  | 8, 3, 0, 0 |  |
| `settle-ask` | transition on `ask` | `issue.comment` | None | None |  | 2, 1, 0, 0 |  |
| `take-hold` | open on `hold` | `issue.work` | `commitment`: `commitment` by the field `commitment` | `commitment`: item of type `commitment`; `extent?`: text, at most 1024 bytes |  | 3, 4, 0, 0 |  |
| `use-input` | open on `input` | `issue.work` | `commitment`: `commitment` by the field `commitment` | `accepted`: fact of kind `accept-report` under `issue`; `commitment`: item of type `commitment`; `report`: fact of kind `report` under `issue` |  | 6, 5, 0, 0 |  |
| `withdraw` | transition on `commitment` | `issue.promise` | None | None |  | 2, 1, 0, 1 |  |
| `withdraw-ask` | transition on `ask` | `issue.comment` | None | None |  | 2, 1, 0, 0 |  |
| `withdraw-plan` | transition on `plan` | `issue.plan` | `goal`: `intent` the one item of its type | None |  | 2, 2, 0, 0 |  |
| `stage-work` | open on `work-source` | `issue.work` | `commitment`: `commitment` by the field `commitment` | `commitment`: item of type `commitment`; `terms`: fact of kind `file`, `revise`, `propose-terms` under `issue`; `commit`: commit; `destination`: scope of kind `destination` |  | 5, 6, 0, 0 | `git-read@1`, `hold@1` |
| `check` | open on `result` | `change.check` | `job`: `job` by the field `job` | `job`: item of type `job`; `jobFact`: fact of kind `request-work-check` under `issue`; `tree`: tree; `configuration`: digest; `bindingDigest`: digest; `outcome`: enum: `passed`, `failed`; `details?`: digest |  | 6, 6, 1, 0 |  |
| `check-error` | open on `result` | `change.check` | `job`: `job` by the field `job` | `job`: item of type `job`; `jobFact`: fact of kind `request-work-check` under `issue`; `tree`: tree; `configuration`: digest; `bindingDigest`: digest; `reason`: text, at most 4096 bytes; `details?`: digest |  | 6, 7, 1, 0 |  |
| `request-work-check` | open on `job` | `issue.work` | `source`: `work-source` by the field `source` | `binding`: text, at most 16384 bytes; `bindingDigest`: digest; `checker`: member; `reuse?`: bool; `source`: fact of kind `stage-work` under `issue`; `name`: text, at most 128 bytes; `configuration`: digest; `commitProof`: text, at most 49152 bytes |  | 2, 11, 1, 0 |  |
| `release-work` | transition on `work-source` | `issue.work` | None | `abandon?`: bool; `reason?`: text, at most 4096 bytes |  | 4, 3, 0, 0 | `hold@1` |

### Handlers of `issue-evidence4`: 8

| Name | Class and message | From | Opens | Copies | Other items | Fields | Settles | Guards, effects, sends, attention | Needs |
|---|---|---|---|---|---|---|---|---|---|
| `closes` | relate `closes` | `lane` under `change` | Nothing | 32 | `goal`: `intent` the one item of its type | `commit?`: commit; `plan?`: fact of kind `seal-plan` under `issue` | a copy in `set` | 0, 3, 0, 0 |  |
| `export-license` | tell `export-license` | `task` under `platform:task` | Nothing |  | `export`: `export` by the field `export`; `target`: `hold` by the field `hold` | `checkpoint`: digest; `export`: fact of kind `authorize-export` under `issue`; `hold`: item of type `hold`; `instance`: text, at most 128 bytes; `k`: int, 1 to 3 |  | 5, 1, 0, 0 | `hold@1` |
| `export-settled` | tell `export-settled` | `task` under `platform:task` | Nothing |  | `export`: `export` by the field `export` | `export`: fact of kind `authorize-export` under `issue`; `final`: enum: `confirmed`, `withheld` | `also.export` in `authorized` | 2, 3, 0, 0 | `hold@1` |
| `parent-dropped` | tell `parent-dropped` | `lane` under `issue` | Nothing |  | `goal`: `intent` the one item of its type | None |  | 1, 0, 0, 0 |  |
| `pin-confirm` | tell `pin-confirm` | `lane` under `change` | Nothing |  | None | `commit`: commit |  | 3, 1, 0, 0 | `hold@1` |
| `result` | relate `result` | `lane` under `issue` | Nothing | 100 | `concern`: `concern` by the field `parentItem`; `goal`: `intent` the one item of its type | `acceptance`: fact of kind `accept-report` under `issue`; `commitment`: fact of kind `offer`, `propose-terms` under `issue`; `conditions`: fact of kind `file`, `revise` under `issue`; `parentItem`: item of type `concern`; `report`: fact of kind `report` under `issue`; `terms`: fact of kind `file`, `revise`, `propose-terms` under `issue` | `also.concern` in `created` | 2, 2, 0, 1 |  |
| `unpin` | tell `unpin` | `lane` under `change` | Nothing |  | None | `because`: enum: `superseded`, `published`; `commit`: commit; `manifest`: fact of kind `propose-manifest` under `change`; `merge?`: fact of kind `merge` under `change` |  | 5, 1, 0, 0 | `hold@1` |
| `check-decision` | tell `check-decision` | `destination` under `platform:destination` | Nothing |  | `job`: `job` by the field `job` | `status`: enum: `admitted`, `reused`, `refused`, `decided`; `countedJob?`: fact of kind `request-work-check` under `issue`; `job`: fact of kind `request-work-check` under `issue`; `result?`: fact of kind `check`, `check-error` under `issue`; `decision`: fact of kind `check-fence`, `work-check-fence`, `reserve`, `platform:destination@17:evidence-admit`, `platform:destination@17:evidence-result`, `platform:destination@17:evidence-progress`, `platform:destination@17:judge`, `platform:destination@17:check-judge`, `platform:destination@17:receipt`, `platform:destination@17:read`, `platform:destination@17:evidence-notice`, `platform:destination@17:evidence-audit`, `platform:destination@17:published-checks` under `platform:destination`; `reason`: text, at most 128 bytes; `frozenGeneration`: text, at most 512 bytes; `observedGeneration`: text, at most 512 bytes; `commit?`: commit; `tree?`: tree; `base?`: commit | `also.job` in `requested`, `timed-out` | 6, 16, 0, 0 |  |

### Timed rules of `issue-evidence4`: 2

| Name | On | In states | Deadline slot | Effects, attention |
|---|---|---|---|---|
| `hold-end` | `hold` | `held` | `ends` | 1, 0 |
| `job-deadline` | `job` | `requested` | `deadline` | 2, 0 |

## `change-evidence4`

Name `change`. Genesis act `open`. Capabilities listed: `hold@1`, `git-read@1`. Rule expressions: 0.

### Item types of `change-evidence4`: 16

| Type | How many | States | Slots | Needs |
|---|---|---|---|---|
| `comment` | many, at most 5000 live | `collapsed`, **`redacted`**, `visible` (initial) | `author`: member (fixed, required); `mentioned`: member (fixed, list of at most 16); `replyTo`: item of type `comment`; `thread`: item of type `thread` (fixed); `body`: text, at most 65536 bytes, detached; `collapseReason`: text, at most 1024 bytes |  |
| `commitment` | many, at most 16 live | `accepted`, **`cancelled`**, **`declined`**, `offered` (initial), **`withdrawn`** | `offeree`: member (fixed); `performer`: member (author); `requester`: member (fixed, required); `successor`: member; `termsAt`: fact of kind `offer` under `change` (fixed, required); `terms`: text, at most 4096 bytes (fixed, required) |  |
| `export` | many, at most 16 live | `authorized` (initial), **`done`**, **`refused`** | `authorizer`: member (fixed, required); `from`: member (fixed, required); `to`: member (fixed, required); `hold`: item of type `hold` (fixed, required) |  |
| `hold` | many, at most 16 live | **`ended`**, `held` (initial) | `holder`: member (required); `under`: item of type `commitment` (fixed, required); `ends`: time (required); `epoch`: int, 1 to 1000000 (required); `extent`: text, at most 1024 bytes |  |
| `job` | many, at most 64 live | `errored`, `failed`, `passed`, `requested`, **`superseded`**, `timed-out`, `queued` (initial), **`fence-refused`**, **`reused`** | `asker`: member (fixed); `informed`: member (fixed, list of at most 2); `checker`: member (fixed, required); `decidedBy`: fact of kind `check`, `check-error`, `timed:job-deadline` under `change`; `manifest`: item of type `manifest` (fixed, required); `earlier`: item of type `job` (fixed); `countedJob`: fact of kind `request-check`, `admit-published-check`, `admit-audit-check` under `change`; `countedResult`: fact of kind `check`, `check-error` under `change`; `destination`: scope of kind `destination` (fixed, required); `admission`: fact of kind `check-fence`, `work-check-fence`, `reserve`, `platform:destination@17:evidence-admit`, `platform:destination@17:evidence-result`, `platform:destination@17:evidence-progress`, `platform:destination@17:judge`, `platform:destination@17:check-judge`, `platform:destination@17:receipt`, `platform:destination@17:read`, `platform:destination@17:evidence-notice`, `platform:destination@17:evidence-audit`, `platform:destination@17:published-checks` under `platform:destination`; `nativeDecision`: fact of kind `check-fence`, `work-check-fence`, `reserve`, `platform:destination@17:evidence-admit`, `platform:destination@17:evidence-result`, `platform:destination@17:evidence-progress`, `platform:destination@17:judge`, `platform:destination@17:check-judge`, `platform:destination@17:receipt`, `platform:destination@17:read`, `platform:destination@17:evidence-notice`, `platform:destination@17:evidence-audit`, `platform:destination@17:published-checks` under `platform:destination`; `incident`: item of type `incident`; `opening`: fact of kind `check-fence`, `work-check-fence`, `reserve`, `platform:destination@17:evidence-admit`, `platform:destination@17:evidence-result`, `platform:destination@17:evidence-progress`, `platform:destination@17:judge`, `platform:destination@17:check-judge`, `platform:destination@17:receipt`, `platform:destination@17:read`, `platform:destination@17:evidence-notice`, `platform:destination@17:evidence-audit`, `platform:destination@17:published-checks` under `platform:destination` (fixed); `forJob`: fact of kind `request-check`, `admit-published-check`, `admit-audit-check` under `change` (fixed); `auditOf`: fact of kind `request-check`, `admit-published-check`, `admit-audit-check` under `change` (fixed); `configuration`: digest (fixed, required); `deadline`: time (fixed, required); `name`: text, at most 128 bytes (fixed, required); `tree`: tree (fixed, required); `binding`: text, at most 16384 bytes (fixed, required); `bindingDigest`: digest (fixed, required); `stage`: enum: `work`, `landing`, `published` (fixed, required); `commit`: commit (fixed, required); `base`: commit (fixed, required); `reason`: text, at most 128 bytes; `frozenGeneration`: text, at most 512 bytes; `observedGeneration`: text, at most 512 bytes |  |
| `link` | many, at most 32 live | `removed`, `set` (initial) | `linker`: member (fixed, required); `issue`: scope of kind `lane` (fixed, required); `how`: enum: `keyword`, `manual` (fixed, required) |  |
| `manifest` | many, at most 64 live | `current` (initial), **`superseded`** | `authors`: member (fixed, required, list of at most 64); `integrator`: member (fixed, required); `goal`: fact of kind `file`, `revise` under `issue` (fixed); `pin`: fact of kind `hold@1:check` under `issue` (fixed); `plan`: fact of kind `seal-plan` under `issue` (fixed); `staging`: scope of kind `lane` (fixed); `under`: item of type `commitment` (fixed); `operation`: fact of kind `merge` under `change`; `base`: commit (fixed, required); `complete`: bool (fixed, required); `decisions`: list of at most 32, each a fact of kind `resolve-concern` under `issue` (fixed); `digest`: digest (fixed); `integration`: commit; `path`: text, at most 1024 bytes (fixed); `selected`: list of at most 32, each a record of `accepted` (fact of kind `accept-report` under `issue`), `report` (fact of kind `report` under `issue`) (fixed); `size`: int, 0 to 65536 (fixed); `tree`: tree; `reservationRef`: text, at most 128 bytes; `files`: list of at most 64, each a record of `path` (text, at most 1024 bytes), `entry` (fact of kind `propose-file` under `change`), `digest` (digest) (fixed) | `hold@1` |
| `merge` | many, at most 16 live | **`aborted`**, `committed`, `intended` (initial), **`published`**, **`refused`**, `unknown` | `merger`: member (fixed, required); `manifest`: item of type `manifest` (fixed, required); `commit`: commit; `reason`: text, at most 1024 bytes; `withdrawal`: enum: `asked`; `checkDeadline`: time |  |
| `proposal` | one | `closed`, `draft` (initial), **`merged`**, `open` | `assignees`: member (list of at most 10); `author`: member (fixed, required); `destination`: scope of kind `destination` (fixed, required); `rulesScope`: scope of kind `rules` (fixed, required); `body`: text, at most 65536 bytes, detached; `labels`: list of at most 20, each a text, at most 64 bytes; `number`: int, 1 to 1000000000; `title`: text, at most 256 bytes (required) |  |
| `result` | many, at most 512 live | **`recorded`** (initial) | `checker`: member (fixed, required); `job`: item of type `job` (fixed, required); `outcome`: enum: `passed`, `failed`, `error` (fixed, required); `reason`: text, at most 4096 bytes (fixed); `tree`: tree (fixed, required); `details`: digest (fixed); `bindingDigest`: digest (fixed, required) |  |
| `review` | many, at most 256 live | **`dismissed`**, `submitted` (initial), **`superseded`**, **`withdrawn`** | `reviewer`: member (fixed, required); `manifest`: item of type `manifest` (fixed, required); `body`: text, at most 65536 bytes, detached; `dismissal`: text, at most 4096 bytes; `extent`: text, at most 64 bytes (fixed); `verdict`: enum: `approve`, `request-changes` (fixed, required) |  |
| `review-request` | many, at most 64 live | **`met`**, `open` (initial), **`withdrawn`** | `requested`: member (fixed, required); `requester`: member (fixed, required) |  |
| `rules` | one | `current` (initial) | `source`: fact of kind `publish`, `rules-wanted` under `platform:rules`; `approvals`: int, 0 to 64 (required); `checks`: list of at most 32, each a record of `name` (text, at most 128 bytes), `configuration` (digest), `required` (bool), `checker` (member), `source?` (enum: `member`, `room`), `stage?` (enum: `work`, `landing`, `published`), `reuse?` (bool), `holds?` (bool), `audit?` (record of `check` (text, at most 128 bytes), `every` (int, 1 to 1)); `extents`: list of at most 8, each a record of `approvals` (int, 0 to 64), `approver` (text, at most 64 bytes), `checks` (list of at most 32, each a text, at most 128 bytes), `class` (enum: `content`, `deployment`, `authority`), `name` (text, at most 64 bytes); `ownerMayReview`: bool (required); `revision`: int, 0 to 1000000000 (required); `evidencePolicy`: text, at most 2048 bytes |  |
| `thread` | many, at most 1000 live | `open` (initial), `resolved` | `opener`: member (fixed, required); `manifest`: item of type `manifest` (fixed, required); `line`: int, 1 to 1000000000 (fixed); `path`: text, at most 4096 bytes (fixed, required); `side`: enum: `base`, `change` (fixed) |  |
| `source` | many, at most 64 live | `collected` (initial), **`selected`** | `authors`: member (fixed, required, list of at most 64); `integrator`: member (fixed, required); `goal`: fact of kind `file`, `revise` under `issue` (fixed); `pin`: fact of kind `hold@1:check` under `issue` (fixed); `plan`: fact of kind `seal-plan` under `issue` (fixed); `staging`: scope of kind `lane` (fixed); `under`: item of type `commitment` (fixed); `base`: commit (fixed, required); `complete`: bool (fixed, required); `decisions`: list of at most 32, each a fact of kind `resolve-concern` under `issue` (fixed); `digest`: digest (fixed); `integration`: commit (fixed); `path`: text, at most 1024 bytes (fixed); `selected`: list of at most 32, each a record of `accepted` (fact of kind `accept-report` under `issue`), `report` (fact of kind `report` under `issue`) (fixed); `size`: int, 0 to 65536 (fixed); `tree`: tree (fixed) | `hold@1` |
| `incident` | many, at most 8192 live | `creating` (initial), `created`, `refused`, `conflict`, `unknown` | `triagers`: member (fixed, required, list of at most 32); `job`: item of type `job` (fixed, required); `decision`: fact of kind `check-fence`, `work-check-fence`, `reserve`, `platform:destination@17:evidence-admit`, `platform:destination@17:evidence-result`, `platform:destination@17:evidence-progress`, `platform:destination@17:judge`, `platform:destination@17:check-judge`, `platform:destination@17:receipt`, `platform:destination@17:read`, `platform:destination@17:evidence-notice`, `platform:destination@17:evidence-audit`, `platform:destination@17:published-checks` under `platform:destination` (fixed, required); `publication`: fact of kind `reserve` under `platform:destination` (fixed, required); `manifest`: fact of kind `propose-manifest`, `propose-file` under `change` (fixed, required); `result`: fact of kind `check`, `check-error` under `change` (fixed); `child`: scope of kind `lane`; `cause`: text, at most 4096 bytes (fixed, required); `policyGeneration`: text, at most 512 bytes (fixed, required); `commit`: commit (fixed, required) |  |

### Acts of `change-evidence4`: 54

| Kind | Step | Grant | Other items | Fields | Settles | Guards, effects, sends, attention | Needs |
|---|---|---|---|---|---|---|---|
| `accept` | transition on `commitment` | `change.promise` | None | `terms`: fact of kind `offer` under `change` |  | 3, 2, 0, 1 |  |
| `accept-handover` | transition on `commitment` | `change.promise` | None | `terms`: fact of kind `offer` under `change` |  | 4, 2, 0, 2 |  |
| `ask-rules` | transition on `proposal` | `change.propose` | None | None |  | 0, 0, 1, 0 |  |
| `authorize-export` | open on `export` | `work.export` | `hold`: `hold` by the field `hold` | `hold`: item of type `hold`; `to`: member |  | 1, 4, 0, 0 |  |
| `cancel` | transition on `commitment` | `change.request` | None | None |  | 2, 1, 0, 1 |  |
| `cancel-merge` | transition on `merge` | `change.merge` | `proposal`: `proposal` the one item of its type | None |  | 2, 1, 1, 0 |  |
| `check` | open on `result` | `change.check` | `job`: `job` by the field `job`; `manifest`: `manifest` through the slot `manifest` of `also.job` | `job`: item of type `job`; `jobFact`: fact of kind `request-check`, `admit-published-check`, `admit-audit-check` under `change`; `tree`: tree; `configuration`: digest; `bindingDigest`: digest; `outcome`: enum: `passed`, `failed`; `details?`: digest |  | 6, 6, 1, 0 |  |
| `check-error` | open on `result` | `change.check` | `job`: `job` by the field `job`; `manifest`: `manifest` through the slot `manifest` of `also.job` | `job`: item of type `job`; `jobFact`: fact of kind `request-check`, `admit-published-check`, `admit-audit-check` under `change`; `tree`: tree; `configuration`: digest; `bindingDigest`: digest; `reason`: text, at most 4096 bytes; `details?`: digest |  | 6, 7, 1, 0 |  |
| `close-any` | transition on `proposal` | `change.edit-any` | None | None |  | 2, 1, 1, 0 |  |
| `close-own` | transition on `proposal` | `change.edit-own` | None | None |  | 3, 1, 1, 0 |  |
| `collapse-comment` | transition on `comment` | `change.triage` | None | `reason`: text, at most 1024 bytes |  | 1, 2, 0, 0 |  |
| `comment` | open on `comment` | `change.comment` | None | `body`: text, at most 65536 bytes, detached; `mentions?`: list of at most 16, each a member; `replyTo?`: item of type `comment`; `thread?`: item of type `thread` |  | 0, 5, 0, 1 |  |
| `decline` | transition on `commitment` | `change.promise` | None | None |  | 2, 1, 0, 0 |  |
| `decline-handover` | transition on `commitment` | `change.promise` | None | None |  | 2, 1, 0, 0 |  |
| `dismiss-review` | transition on `review` | `change.dismiss` | None | `reason`: text, at most 4096 bytes |  | 2, 2, 0, 0 |  |
| `edit-any` | transition on `proposal` | `change.edit-any` | None | `body?`: text, at most 65536 bytes, detached; `labels?`: list of at most 20, each a text, at most 64 bytes; `title?`: text, at most 256 bytes |  | 1, 3, 1, 0 |  |
| `edit-comment-any` | transition on `comment` | `change.edit-any` | None | `body`: text, at most 65536 bytes, detached |  | 1, 1, 0, 0 |  |
| `edit-comment-own` | transition on `comment` | `change.comment` | None | `body`: text, at most 65536 bytes, detached |  | 2, 1, 0, 0 |  |
| `edit-own` | transition on `proposal` | `change.edit-own` | None | `body?`: text, at most 65536 bytes, detached; `labels?`: list of at most 20, each a text, at most 64 bytes; `title?`: text, at most 256 bytes |  | 2, 3, 1, 0 |  |
| `expand-comment` | transition on `comment` | `change.triage` | None | None |  | 1, 2, 0, 0 |  |
| `link-any` | open on `link` | `change.edit-any` | `proposal`: `proposal` the one item of its type | `how`: enum: `keyword`, `manual`; `issue`: scope of kind `lane` |  | 3, 3, 1, 0 |  |
| `link-own` | open on `link` | `change.edit-own` | `proposal`: `proposal` the one item of its type | `how`: enum: `keyword`, `manual`; `issue`: scope of kind `lane` |  | 4, 3, 1, 0 |  |
| `merge` | open on `merge` | `change.merge` | `manifest`: `manifest` by the field `manifest`; `proposal`: `proposal` the one item of its type; `rules`: `rules` the one item of its type | `manifest`: item of type `manifest`; `reports`: list of at most 32, each a fact of kind `report` under `issue` |  | 9, 3, 1, 0 |  |
| `offer` | open on `commitment` | `change.request` | `proposal`: `proposal` the one item of its type | `offeree?`: member; `terms`: text, at most 4096 bytes |  | 1, 4, 0, 1 |  |
| `offer-handover` | transition on `commitment` | `change.promise` | None | `successor`: member |  | 2, 1, 0, 1 |  |
| `open` (genesis) | open on `proposal` | `change.open` | None | `body?`: text, at most 65536 bytes, detached; `destination`: scope of kind `destination`; `draft`: bool; `number?`: int, 1 to 1000000000; `opener`: member; `rules`: scope of kind `rules`; `title`: text, at most 256 bytes |  | 0, 7, 1, 0 |  |
| `open-thread` | open on `thread` | `change.comment` | `manifest`: `manifest` by the field `manifest` | `line?`: int, 1 to 1000000000; `manifest`: item of type `manifest`; `path`: text, at most 4096 bytes; `side?`: enum: `base`, `change` |  | 0, 5, 0, 0 |  |
| `propose-file` | open on `source` | `change.propose` | `proposal`: `proposal` the one item of its type | `base`: commit; `content`: text, at most 65536 bytes; `digest`: digest; `path`: text, at most 1024 bytes; `size`: int, 0 to 65536 |  | 5, 7, 0, 0 |  |
| `propose-manifest` | open on `manifest` | `change.propose` | `proposal`: `proposal` the one item of its type | `base`: commit; `files`: list of at most 64, each a record of `path` (text, at most 1024 bytes), `entry` (fact of kind `propose-file` under `change`), `digest` (digest) |  | 7, 5, 0, 0 |  |
| `ready-any` | transition on `proposal` | `change.edit-any` | None | None |  | 1, 1, 1, 0 |  |
| `ready-own` | transition on `proposal` | `change.edit-own` | None | None |  | 2, 1, 1, 0 |  |
| `redact-comment-any` | transition on `comment` | `change.edit-any` | None | None |  | 1, 2, 0, 0 |  |
| `redact-comment-own` | transition on `comment` | `change.comment` | None | None |  | 2, 2, 0, 0 |  |
| `release-hold` | transition on `hold` | `change.work` | None | None |  | 2, 1, 0, 0 |  |
| `renew-hold` | transition on `hold` | `change.work` | `commitment`: `commitment` through the slot `under` of `on` | None |  | 4, 2, 0, 0 |  |
| `reopen-any` | transition on `proposal` | `change.edit-any` | None | None |  | 1, 1, 1, 0 |  |
| `reopen-own` | transition on `proposal` | `change.edit-own` | None | None |  | 2, 1, 1, 0 |  |
| `reopen-thread-any` | transition on `thread` | `change.edit-any` | `proposal`: `proposal` the one item of its type | None |  | 1, 1, 0, 0 |  |
| `reopen-thread-own` | transition on `thread` | `change.edit-own` | `proposal`: `proposal` the one item of its type | None |  | 2, 1, 0, 0 |  |
| `request-check` | open on `job` | `change.propose` | `earlier`: `job` by the field `earlier`; `manifest`: `manifest` by the field `manifest`; `proposal`: `proposal` the one item of its type; `rules`: `rules` the one item of its type | `configuration`: digest; `earlier?`: item of type `job`; `manifest`: item of type `manifest`; `name`: text, at most 128 bytes; `binding`: text, at most 16384 bytes; `bindingDigest`: digest; `checker`: member; `reuse?`: bool |  | 8, 15, 1, 0 |  |
| `request-review-any` | open on `review-request` | `change.edit-any` | `proposal`: `proposal` the one item of its type | `requested`: member |  | 1, 2, 0, 1 |  |
| `request-review-own` | open on `review-request` | `change.edit-own` | `proposal`: `proposal` the one item of its type | `requested`: member |  | 2, 2, 0, 1 |  |
| `resolve-thread-any` | transition on `thread` | `change.edit-any` | `proposal`: `proposal` the one item of its type | None |  | 1, 1, 0, 0 |  |
| `resolve-thread-own` | transition on `thread` | `change.edit-own` | `proposal`: `proposal` the one item of its type | None |  | 2, 1, 0, 0 |  |
| `review-verdict` | open on `review` | `change.review` | `earlier`: `review` by the field `earlier`; `manifest`: `manifest` by the field `manifest`; `proposal`: `proposal` the one item of its type; `request`: `review-request` by the field `request` | `body?`: text, at most 65536 bytes, detached; `earlier?`: item of type `review`; `extent?`: text, at most 64 bytes; `manifest`: item of type `manifest`; `request?`: item of type `review-request`; `verdict`: enum: `approve`, `request-changes` |  | 9, 7, 0, 1 |  |
| `take-hold` | open on `hold` | `change.work` | `commitment`: `commitment` by the field `commitment`; `proposal`: `proposal` the one item of its type | `commitment`: item of type `commitment`; `extent?`: text, at most 1024 bytes |  | 4, 4, 0, 0 |  |
| `to-draft-any` | transition on `proposal` | `change.edit-any` | None | None |  | 2, 1, 1, 0 |  |
| `to-draft-own` | transition on `proposal` | `change.edit-own` | None | None |  | 3, 1, 1, 0 |  |
| `unlink-any` | transition on `link` | `change.edit-any` | `proposal`: `proposal` the one item of its type | None |  | 3, 1, 1, 0 |  |
| `unlink-own` | transition on `link` | `change.edit-own` | `proposal`: `proposal` the one item of its type | None |  | 4, 1, 1, 0 |  |
| `withdraw` | transition on `commitment` | `change.promise` | None | None |  | 2, 1, 0, 1 |  |
| `withdraw-review` | transition on `review` | `change.review` | None | None |  | 3, 1, 0, 0 |  |
| `withdraw-review-request-any` | transition on `review-request` | `change.edit-any` | `proposal`: `proposal` the one item of its type | None |  | 1, 1, 0, 0 |  |
| `withdraw-review-request-own` | transition on `review-request` | `change.edit-own` | `proposal`: `proposal` the one item of its type | None |  | 2, 1, 0, 0 |  |

### Handlers of `change-evidence4`: 8

| Name | Class and message | From | Opens | Copies | Other items | Fields | Settles | Guards, effects, sends, attention | Needs |
|---|---|---|---|---|---|---|---|---|---|
| `export-license` | tell `export-license` | `task` under `platform:task` | Nothing |  | `export`: `export` by the field `export`; `target`: `hold` by the field `hold` | `checkpoint`: digest; `export`: fact of kind `authorize-export` under `change`; `hold`: item of type `hold`; `instance`: text, at most 128 bytes; `k`: int, 1 to 3 |  | 5, 1, 0, 0 | `hold@1` |
| `export-settled` | tell `export-settled` | `task` under `platform:task` | Nothing |  | `export`: `export` by the field `export` | `export`: fact of kind `authorize-export` under `change`; `final`: enum: `confirmed`, `withheld` | `also.export` in `authorized` | 2, 3, 0, 0 | `hold@1` |
| `publication` | relate `publication` | `destination` under `platform:destination` | Nothing | 16 | `manifest`: `manifest` through the slot `manifest` of `also.merge`; `merge`: `merge` by the field `operation`; `proposal`: `proposal` the one item of its type | `commit?`: commit; `operation`: fact of kind `merge` under `change`; `outcome`: enum: `committed`, `unknown`, `published`, `refused`, `aborted`; `reason?`: text, at most 1024 bytes; `rules?`: int, 0 to 1000000000; `reservationRef?`: text, at most 128 bytes; `checkDeadline?`: time; `tree?`: tree | `also.merge` in `intended`, `committed`, `unknown` | 2, 13, 3, 0 | `hold@1` |
| `rules` | relate `rules` | `rules` under `platform:rules` | `rules` | 1 | `proposal`: `proposal` the one item of its type | `approvals`: int, 0 to 64; `checks?`: list of at most 32, each a record of `name` (text, at most 128 bytes), `configuration` (digest), `required` (bool), `checker` (member), `source?` (enum: `member`, `room`), `stage?` (enum: `work`, `landing`, `published`), `reuse?` (bool), `holds?` (bool), `audit?` (record of `check` (text, at most 128 bytes), `every` (int, 1 to 1)); `extents?`: list of at most 8, each a record of `approvals` (int, 0 to 64), `approver` (text, at most 64 bytes), `checks` (list of at most 32, each a text, at most 128 bytes), `class` (enum: `content`, `deployment`, `authority`), `name` (text, at most 64 bytes); `labels?`: list of at most 32, each a text, at most 64 bytes; `ownerMayReview`: bool; `singleControllerException?`: bool; `evidencePolicy`: text, at most 2048 bytes |  | 1, 7, 0, 0 |  |
| `check-decision` | tell `check-decision` | `destination` under `platform:destination` | Nothing |  | `job`: `job` by the field `job`; `earlier`: `job` through the slot `earlier` of `also.job` | `status`: enum: `admitted`, `reused`, `refused`, `decided`; `countedJob?`: fact of kind `request-check`, `admit-published-check`, `admit-audit-check` under `change`; `job`: fact of kind `request-check`, `admit-published-check`, `admit-audit-check` under `change`; `result?`: fact of kind `check`, `check-error` under `change`; `decision`: fact of kind `check-fence`, `work-check-fence`, `reserve`, `platform:destination@17:evidence-admit`, `platform:destination@17:evidence-result`, `platform:destination@17:evidence-progress`, `platform:destination@17:judge`, `platform:destination@17:check-judge`, `platform:destination@17:receipt`, `platform:destination@17:read`, `platform:destination@17:evidence-notice`, `platform:destination@17:evidence-audit`, `platform:destination@17:published-checks` under `platform:destination`; `reason`: text, at most 128 bytes; `frozenGeneration`: text, at most 512 bytes; `observedGeneration`: text, at most 512 bytes; `commit?`: commit; `tree?`: tree; `base?`: commit | `also.job` in `requested`, `timed-out` | 8, 15, 0, 0 |  |
| `admit-published-check` | tell `admit-published-check` | `destination` under `platform:destination` | `job` |  | `proposal`: `proposal` the one item of its type; `manifest`: `manifest` by the field `manifest` | `binding`: text, at most 16384 bytes; `bindingDigest`: digest; `checker`: member; `operation`: fact of kind `merge` under `change`; `manifest`: fact of kind `propose-manifest` under `change`; `name`: text, at most 128 bytes; `configuration`: digest; `tree`: tree; `commit`: commit; `base`: commit |  | 3, 13, 1, 0 |  |
| `admit-audit-check` | tell `admit-audit-check` | `destination` under `platform:destination` | `job` |  | `proposal`: `proposal` the one item of its type; `manifest`: `manifest` by the field `manifest`; `memberJob`: `job` by the field `forJob` | `binding`: text, at most 16384 bytes; `bindingDigest`: digest; `checker`: member; `operation`: fact of kind `merge` under `change`; `manifest`: fact of kind `propose-manifest` under `change`; `name`: text, at most 128 bytes; `configuration`: digest; `tree`: tree; `commit`: commit; `base`: commit; `auditOf`: fact of kind `request-check`, `admit-published-check`, `admit-audit-check` under `change`; `forJob`: fact of kind `request-check`, `admit-published-check`, `admit-audit-check` under `change` |  | 8, 15, 1, 0 |  |
| `published-check-failure` | tell `published-check-failure` | `destination` under `platform:destination` | `incident` |  | `job`: `job` by the field `job`; `proposal`: `proposal` the one item of its type | `job`: fact of kind `request-check`, `admit-published-check`, `admit-audit-check` under `change`; `publication`: fact of kind `reserve` under `platform:destination`; `manifest`: fact of kind `propose-manifest`, `propose-file` under `change`; `result?`: fact of kind `check`, `check-error` under `change`; `decision`: fact of kind `check-fence`, `work-check-fence`, `reserve`, `platform:destination@17:evidence-admit`, `platform:destination@17:evidence-result`, `platform:destination@17:evidence-progress`, `platform:destination@17:judge`, `platform:destination@17:check-judge`, `platform:destination@17:receipt`, `platform:destination@17:read`, `platform:destination@17:evidence-notice`, `platform:destination@17:evidence-audit`, `platform:destination@17:published-checks` under `platform:destination`; `cause`: text, at most 4096 bytes; `triagers`: list of at most 32, each a member; `policyGeneration`: text, at most 512 bytes |  | 7, 10, 1, 0 |  |

### Timed rules of `change-evidence4`: 3

| Name | On | In states | Deadline slot | Effects, attention |
|---|---|---|---|---|
| `hold-end` | `hold` | `held` | `ends` | 1, 0 |
| `job-deadline` | `job` | `requested` | `deadline` | 2, 1 |
| `merge-checks-deadline` | `merge` | `committed` | `checkDeadline` | 2, 0 |

## `issue-questions`

Name `issue`. Genesis act `file`. Capabilities listed: `hold@1`, `git-read@1`. Rule expressions: 0.

### Item types of `issue-questions`: 14

| Type | How many | States | Slots | Needs |
|---|---|---|---|---|
| `ask` | many, at most 64 live | `asked` (initial), **`decided`**, **`withdrawn`** | `asker`: member (fixed, required); `bodyAt`: fact of kind `ask`, `revise-ask` under `issue` (required); `decisionAt`: fact of kind `decide` under `issue`; `question`: text, at most 4096 bytes (fixed, required); `body`: text, at most 65536 bytes, detached (required); `decisionComment`: text, at most 4096 bytes |  |
| `block` | many, at most 32 live | `blocked` (initial), **`released`** | `commitment`: item of type `commitment` (fixed, required); `on`: fact of kind `ask` under `issue` (fixed, required); `releasedBy`: fact of kind `decide` under `issue`; `reason`: text, at most 4096 bytes |  |
| `comment` | many, at most 5000 live | `collapsed`, **`redacted`**, `visible` (initial) | `author`: member (fixed, required); `mentioned`: member (fixed, list of at most 16); `replyTo`: item of type `comment`; `about`: fact of kind `ask`, `revise-ask`, `approve`, `decide` under `issue` (fixed); `body`: text, at most 65536 bytes, detached; `collapseReason`: text, at most 1024 bytes |  |
| `commitment` | many, at most 64 live | `accepted`, **`cancelled`**, **`declined`**, **`fulfilled`**, `offered` (initial), `proposed`, **`withdrawn`** | `offeree`: member (fixed); `performer`: member (author); `requester`: member (fixed, required); `successor`: member; `conditionsAt`: fact of kind `file`, `revise` under `issue` (fixed, required); `termsAt`: fact of kind `file`, `revise`, `propose-terms` under `issue` (fixed, required); `conditions`: list of at most 16, each a text, at most 4096 bytes (fixed, required) |  |
| `concern` | many, at most 100 live | **`conflict`**, `created`, `creating` (initial), `delivered`, **`dropped`**, **`refused`** | `child`: scope of kind `lane`; `plan`: item of type `plan` (fixed, required); `result`: fact of kind `offer`, `propose-terms` under `issue`; `interface`: text, at most 4096 bytes (fixed); `purpose`: text, at most 4096 bytes (fixed, required); `role`: enum: `required`, `optional` (fixed, required) |  |
| `decision` | many, at most 32 live | **`recorded`** (initial) | `decider`: member (fixed, required); `acceptance`: fact of kind `accept-report` under `issue` (fixed); `concern`: item of type `concern` (fixed, required); `replacedBy`: item of type `concern` (fixed); `terms`: fact of kind `file`, `revise`, `propose-terms` under `issue` (fixed); `kind`: enum: `replaced`, `excluded`, `accepted-as-delivered` (fixed, required); `reason`: text, at most 4096 bytes (fixed, required) |  |
| `export` | many, at most 16 live | `authorized` (initial), **`done`**, **`refused`** | `authorizer`: member (fixed, required); `from`: member (fixed, required); `to`: member (fixed, required); `hold`: item of type `hold` (fixed, required) |  |
| `hold` | many, at most 16 live | **`ended`**, `held` (initial) | `holder`: member (required); `under`: item of type `commitment` (fixed, required); `ends`: time (required); `epoch`: int, 1 to 1000000 (required); `extent`: text, at most 1024 bytes |  |
| `input` | many, at most 32 live | **`replaced`**, `selected` (initial) | `authors`: member (fixed, list of at most 64); `selector`: member (fixed, required); `accepted`: fact of kind `accept-report` under `issue` (fixed, required); `for`: item of type `commitment` (fixed, required); `report`: fact of kind `report` under `issue` (fixed, required) |  |
| `intent` | one | `closed`, `open` (initial) | `assignees`: member (list of at most 10); `requester`: member (fixed, required); `closedBy`: fact of kind `close-own`, `close-any`, `closes` under `issue`; `conditionsAt`: fact of kind `file`, `revise` under `issue` (required); `currentPlan`: item of type `plan`; `judgedAt`: fact of kind `file`, `revise` under `issue`; `parent`: scope of kind `lane` (fixed); `body`: text, at most 65536 bytes, detached; `closeReason`: enum: `completed`, `not-planned`; `conditions`: list of at most 16, each a text, at most 4096 bytes (required); `judgeEvidence`: list of at most 32, each a digest; `judgeNote`: text, at most 4096 bytes; `labels`: list of at most 20, each a text, at most 64 bytes; `number`: int, 1 to 1000000000; `parentItem`: int, 0 to 1000000000 (fixed); `satisfied`: bool; `title`: text, at most 256 bytes (required) |  |
| `plan` | many, at most 16 live | `open` (initial), `sealed`, **`superseded`** | `planner`: member (fixed, required); `conditionsAt`: fact of kind `file`, `revise` under `issue` (fixed, required) |  |
| `report` | many, at most 64 live | **`accepted`**, **`refused`**, `reported` (initial) | `authors`: member (fixed, list of at most 64); `reporter`: member (fixed, required); `acceptedAt`: fact of kind `accept-report` under `issue`; `conditionsAt`: fact of kind `file`, `revise` under `issue` (fixed, required); `termsAt`: fact of kind `file`, `revise`, `propose-terms` under `issue` (fixed, required); `under`: item of type `commitment` (fixed, required); `claims`: list of at most 32, each a text, at most 1024 bytes (fixed); `commit`: commit (fixed, required); `evidence`: list of at most 32, each a digest (fixed); `reason`: text, at most 4096 bytes; `summary`: text, at most 65536 bytes, detached; `tree`: tree (fixed, required) |  |
| `approval-request` | many, at most 64 live | `open` (initial), **`met`**, **`withdrawn`** | `requested`: member (fixed, required); `requester`: member (fixed, required); `ask`: item of type `ask` (fixed, required); `bodyAt`: fact of kind `ask`, `revise-ask` under `issue` (fixed, required) |  |
| `approval` | many, at most 256 live | `submitted` (initial) | `approver`: member (fixed, required); `ask`: item of type `ask` (fixed, required); `bodyAt`: fact of kind `ask`, `revise-ask` under `issue` (fixed, required); `request`: item of type `approval-request` (fixed, required); `verdict`: enum: `approve`, `request-changes` (fixed, required); `comment`: text, at most 65536 bytes, detached (fixed) |  |

### Acts of `issue-questions`: 53

| Kind | Step | Grant | Other items | Fields | Settles | Guards, effects, sends, attention | Needs |
|---|---|---|---|---|---|---|---|
| `accept` | transition on `commitment` | `issue.promise` | None | `terms`: fact of kind `file`, `revise`, `propose-terms` under `issue` |  | 3, 2, 0, 1 |  |
| `accept-handover` | transition on `commitment` | `issue.promise` | None | `terms`: fact of kind `file`, `revise`, `propose-terms` under `issue` |  | 4, 2, 0, 2 |  |
| `accept-report` | transition on `report` | `issue.request` | `commitment`: `commitment` by the field `commitment` | `commitment`: item of type `commitment`; `terms`: fact of kind `file`, `revise`, `propose-terms` under `issue` |  | 6, 2, 0, 0 |  |
| `add-concern` | open on `concern` | `issue.plan` | `plan`: `plan` by the field `plan` | `body?`: text, at most 65536 bytes, detached; `conditions`: list of at most 16, each a text, at most 4096 bytes; `interface?`: text, at most 4096 bytes; `plan`: item of type `plan`; `purpose`: text, at most 4096 bytes; `role`: enum: `required`, `optional`; `title`: text, at most 256 bytes |  | 3, 4, 1, 0 |  |
| `agree` | transition on `commitment` | `issue.request` | None | `terms`: fact of kind `file`, `revise`, `propose-terms` under `issue` |  | 3, 1, 0, 0 |  |
| `ask` | open on `ask` | `issue.comment` | None | `question`: text, at most 4096 bytes; `body`: text, at most 65536 bytes, detached |  | 0, 4, 0, 0 |  |
| `assign` | transition on `intent` | `issue.triage` | None | `assignees`: list of at most 10, each a member |  | 0, 1, 1, 1 |  |
| `authorize-export` | open on `export` | `work.export` | `hold`: `hold` by the field `hold` | `hold`: item of type `hold`; `to`: member |  | 1, 4, 0, 0 |  |
| `block` | open on `block` | `issue.work` | `commitment`: `commitment` by the field `commitment` | `commitment`: item of type `commitment`; `on`: fact of kind `ask` under `issue`; `reason?`: text, at most 4096 bytes |  | 3, 3, 0, 0 |  |
| `cancel` | transition on `commitment` | `issue.request` | None | None |  | 2, 1, 0, 1 |  |
| `close-any` | transition on `intent` | `issue.triage` | None | `reason?`: enum: `completed`, `not-planned` |  | 1, 3, 1, 0 |  |
| `close-own` | transition on `intent` | `issue.close-own` | None | `reason?`: enum: `completed`, `not-planned` |  | 2, 3, 1, 0 |  |
| `collapse-comment` | transition on `comment` | `issue.triage` | None | `reason`: text, at most 1024 bytes |  | 1, 2, 0, 0 |  |
| `comment` | open on `comment` | `issue.comment` | None | `body`: text, at most 65536 bytes, detached; `mentions?`: list of at most 16, each a member; `replyTo?`: item of type `comment`; `about?`: fact of kind `ask`, `revise-ask`, `approve`, `decide` under `issue` |  | 1, 5, 0, 1 |  |
| `decline` | transition on `commitment` | `issue.promise` | None | None |  | 2, 1, 0, 0 |  |
| `decline-handover` | transition on `commitment` | `issue.promise` | None | None |  | 2, 1, 0, 0 |  |
| `drop-concern` | transition on `concern` | `issue.plan` | None | None |  | 1, 1, 1, 0 |  |
| `edit-any` | transition on `intent` | `issue.edit-any` | None | `body?`: text, at most 65536 bytes, detached; `title?`: text, at most 256 bytes |  | 0, 2, 1, 0 |  |
| `edit-comment-any` | transition on `comment` | `issue.edit-any` | None | `body`: text, at most 65536 bytes, detached |  | 1, 1, 0, 0 |  |
| `edit-comment-own` | transition on `comment` | `issue.comment` | None | `body`: text, at most 65536 bytes, detached |  | 2, 1, 0, 0 |  |
| `edit-own` | transition on `intent` | `issue.edit-own` | None | `body?`: text, at most 65536 bytes, detached; `title?`: text, at most 256 bytes |  | 1, 2, 1, 0 |  |
| `expand-comment` | transition on `comment` | `issue.triage` | None | None |  | 1, 2, 0, 0 |  |
| `file` (genesis) | open on `intent` | `issue.open` | None | `body?`: text, at most 65536 bytes, detached; `conditions`: list of at most 16, each a text, at most 4096 bytes; `number?`: int, 1 to 1000000000; `opener`: member; `origin?`: fact of kind `add-concern` under `issue`; `title`: text, at most 256 bytes |  | 0, 8, 1, 0 |  |
| `fulfil` | transition on `commitment` | `issue.request` | `goal`: `intent` the one item of its type; `report`: `report` by the field `report` | `report`: item of type `report` |  | 5, 1, 1, 0 |  |
| `judge` | transition on `intent` | `issue.judge` | None | `evidence?`: list of at most 32, each a digest; `note?`: text, at most 4096 bytes; `satisfied`: bool |  | 1, 4, 0, 0 |  |
| `label` | transition on `intent` | `issue.triage` | None | `labels`: list of at most 20, each a text, at most 64 bytes |  | 0, 1, 1, 0 |  |
| `offer` | open on `commitment` | `issue.request` | `goal`: `intent` the one item of its type | `offeree?`: member |  | 1, 5, 0, 1 |  |
| `offer-handover` | transition on `commitment` | `issue.promise` | None | `successor`: member |  | 2, 1, 0, 1 |  |
| `open-plan` | open on `plan` | `issue.plan` | `goal`: `intent` the one item of its type | None |  | 1, 2, 0, 0 |  |
| `propose-terms` | open on `commitment` | `issue.promise` | `goal`: `intent` the one item of its type | `conditions`: list of at most 16, each a text, at most 4096 bytes |  | 1, 7, 0, 0 |  |
| `redact-comment-any` | transition on `comment` | `issue.edit-any` | None | None |  | 1, 2, 0, 0 |  |
| `redact-comment-own` | transition on `comment` | `issue.comment` | None | None |  | 2, 2, 0, 0 |  |
| `refuse-report` | transition on `report` | `issue.request` | `commitment`: `commitment` by the field `commitment` | `commitment`: item of type `commitment`; `reason`: text, at most 4096 bytes |  | 3, 3, 0, 1 | `hold@1` |
| `release-block` | transition on `block` | `issue.work` | `commitment`: `commitment` by the field `commitment` | `answer`: fact of kind `decide` under `issue`; `commitment`: item of type `commitment` |  | 6, 2, 0, 0 |  |
| `release-hold` | transition on `hold` | `issue.work` | None | None |  | 2, 1, 0, 0 |  |
| `renew-hold` | transition on `hold` | `issue.work` | `commitment`: `commitment` through the slot `under` of `on` | None |  | 4, 2, 0, 0 |  |
| `reopen-any` | transition on `intent` | `issue.triage` | None | None |  | 1, 3, 1, 0 |  |
| `reopen-own` | transition on `intent` | `issue.close-own` | None | None |  | 2, 3, 1, 0 |  |
| `replace-input` | transition on `input` | `issue.work` | `commitment`: `commitment` by the field `commitment` | `commitment`: item of type `commitment` |  | 3, 1, 0, 0 |  |
| `report` | open on `report` | `issue.work` | `commitment`: `commitment` by the field `commitment` | `claims?`: list of at most 32, each a text, at most 1024 bytes; `commit`: commit; `commitment`: item of type `commitment`; `evidence?`: list of at most 32, each a digest; `summary?`: text, at most 65536 bytes, detached; `terms`: fact of kind `file`, `revise`, `propose-terms` under `issue`; `tree`: tree |  | 5, 11, 0, 1 | `git-read@1`, `hold@1` |
| `resolve-concern` | open on `decision` | `issue.plan` | `concern`: `concern` by the field `concern`; `goal`: `intent` the one item of its type; `plan`: `plan` through the slot `plan` of `also.concern`; `replacement`: `concern` by the field `replacedBy` | `acceptance?`: fact of kind `accept-report` under `issue`; `concern`: item of type `concern`; `kind`: enum: `replaced`, `excluded`, `accepted-as-delivered`; `reason`: text, at most 4096 bytes; `replacedBy?`: item of type `concern`; `terms?`: fact of kind `file`, `revise`, `propose-terms` under `issue` |  | 3, 7, 0, 0 |  |
| `revise` | transition on `intent` | `issue.revise` | None | `conditions`: list of at most 16, each a text, at most 4096 bytes |  | 2, 2, 0, 0 |  |
| `seal-plan` | transition on `plan` | `issue.plan` | `current`: `plan` through the slot `currentPlan` of `also.goal`; `goal`: `intent` the one item of its type | `goalAt`: fact of kind `file`, `revise` under `issue`; `optional`: list of at most 32, each a record of `child?` (scope of kind `lane`), `item` (item of type `concern`); `required`: list of at most 32, each a record of `child?` (scope of kind `lane`), `item` (item of type `concern`) |  | 8, 3, 0, 0 |  |
| `take-hold` | open on `hold` | `issue.work` | `commitment`: `commitment` by the field `commitment` | `commitment`: item of type `commitment`; `extent?`: text, at most 1024 bytes |  | 3, 4, 0, 0 |  |
| `use-input` | open on `input` | `issue.work` | `commitment`: `commitment` by the field `commitment` | `accepted`: fact of kind `accept-report` under `issue`; `commitment`: item of type `commitment`; `report`: fact of kind `report` under `issue` |  | 6, 5, 0, 0 |  |
| `withdraw` | transition on `commitment` | `issue.promise` | None | None |  | 2, 1, 0, 1 |  |
| `withdraw-ask` | transition on `ask` | `issue.comment` | None | None |  | 2, 1, 0, 0 |  |
| `withdraw-plan` | transition on `plan` | `issue.plan` | `goal`: `intent` the one item of its type | None |  | 2, 2, 0, 0 |  |
| `revise-ask` | transition on `ask` | `issue.comment` | None | `bodyAt`: fact of kind `ask`, `revise-ask` under `issue`; `body`: text, at most 65536 bytes, detached |  | 3, 2, 0, 0 |  |
| `request-approval` | open on `approval-request` | `issue.comment` | `ask`: `ask` by the field `ask` | `ask`: item of type `ask`; `bodyAt`: fact of kind `ask`, `revise-ask` under `issue`; `requested`: member |  | 4, 4, 0, 1 |  |
| `withdraw-approval-request` | transition on `approval-request` | `issue.comment` | `ask`: `ask` through the slot `ask` of `on` | `bodyAt`: fact of kind `ask`, `revise-ask` under `issue` |  | 3, 1, 0, 0 |  |
| `approve` | open on `approval` | `issue.approve` | `request`: `approval-request` by the field `request`; `ask`: `ask` through the slot `ask` of `also.request` | `request`: item of type `approval-request`; `bodyAt`: fact of kind `ask`, `revise-ask` under `issue`; `verdict`: enum: `approve`, `request-changes`; `comment?`: text, at most 65536 bytes, detached |  | 6, 7, 0, 1 |  |
| `decide` | transition on `ask` | `issue.decide` | None | `bodyAt`: fact of kind `ask`, `revise-ask` under `issue`; `comment?`: text, at most 4096 bytes |  | 5, 3, 0, 1 |  |

### Handlers of `issue-questions`: 7

| Name | Class and message | From | Opens | Copies | Other items | Fields | Settles | Guards, effects, sends, attention | Needs |
|---|---|---|---|---|---|---|---|---|---|
| `closes` | relate `closes` | `lane` under `change` | Nothing | 32 | `goal`: `intent` the one item of its type | `commit?`: commit; `plan?`: fact of kind `seal-plan` under `issue` | a copy in `set` | 0, 3, 0, 0 |  |
| `export-license` | tell `export-license` | `task` under `platform:task` | Nothing |  | `export`: `export` by the field `export`; `target`: `hold` by the field `hold` | `checkpoint`: digest; `export`: fact of kind `authorize-export` under `issue`; `hold`: item of type `hold`; `instance`: text, at most 128 bytes; `k`: int, 1 to 3 |  | 5, 1, 0, 0 | `hold@1` |
| `export-settled` | tell `export-settled` | `task` under `platform:task` | Nothing |  | `export`: `export` by the field `export` | `export`: fact of kind `authorize-export` under `issue`; `final`: enum: `confirmed`, `withheld` | `also.export` in `authorized` | 2, 3, 0, 0 | `hold@1` |
| `parent-dropped` | tell `parent-dropped` | `lane` under `issue` | Nothing |  | `goal`: `intent` the one item of its type | None |  | 1, 0, 0, 0 |  |
| `pin-confirm` | tell `pin-confirm` | `lane` under `change` | Nothing |  | None | `commit`: commit |  | 3, 1, 0, 0 | `hold@1` |
| `result` | relate `result` | `lane` under `issue` | Nothing | 100 | `concern`: `concern` by the field `parentItem`; `goal`: `intent` the one item of its type | `acceptance`: fact of kind `accept-report` under `issue`; `commitment`: fact of kind `offer`, `propose-terms` under `issue`; `conditions`: fact of kind `file`, `revise` under `issue`; `parentItem`: item of type `concern`; `report`: fact of kind `report` under `issue`; `terms`: fact of kind `file`, `revise`, `propose-terms` under `issue` | `also.concern` in `created` | 2, 2, 0, 1 |  |
| `unpin` | tell `unpin` | `lane` under `change` | Nothing |  | None | `because`: enum: `superseded`, `published`; `commit`: commit; `manifest`: fact of kind `propose-manifest` under `change`; `merge?`: fact of kind `merge` under `change` |  | 5, 1, 0, 0 | `hold@1` |

### Timed rules of `issue-questions`: 1

| Name | On | In states | Deadline slot | Effects, attention |
|---|---|---|---|---|
| `hold-end` | `hold` | `held` | `ends` | 1, 0 |

## `issue-questions-brief`

Name `issue`. Genesis act `file`. Capabilities listed: `hold@1`, `git-read@1`. Rule expressions: 0.

### Item types of `issue-questions-brief`: 14

| Type | How many | States | Slots | Needs |
|---|---|---|---|---|
| `ask` | many, at most 64 live | `asked` (initial), **`decided`**, **`withdrawn`** | `asker`: member (fixed, required); `bodyAt`: fact of kind `ask`, `revise-ask` under `issue` (required); `decisionAt`: fact of kind `decide` under `issue`; `question`: text, at most 4096 bytes (fixed, required); `body`: text, at most 65536 bytes, detached (required); `decisionComment`: text, at most 4096 bytes; `brief`: digest (fixed, required) |  |
| `block` | many, at most 32 live | `blocked` (initial), **`released`** | `commitment`: item of type `commitment` (fixed, required); `on`: fact of kind `ask` under `issue` (fixed, required); `releasedBy`: fact of kind `decide` under `issue`; `reason`: text, at most 4096 bytes |  |
| `comment` | many, at most 5000 live | `collapsed`, **`redacted`**, `visible` (initial) | `author`: member (fixed, required); `mentioned`: member (fixed, list of at most 16); `replyTo`: item of type `comment`; `about`: fact of kind `ask`, `revise-ask`, `approve`, `decide` under `issue` (fixed); `body`: text, at most 65536 bytes, detached; `collapseReason`: text, at most 1024 bytes |  |
| `commitment` | many, at most 64 live | `accepted`, **`cancelled`**, **`declined`**, **`fulfilled`**, `offered` (initial), `proposed`, **`withdrawn`** | `offeree`: member (fixed); `performer`: member (author); `requester`: member (fixed, required); `successor`: member; `conditionsAt`: fact of kind `file`, `revise` under `issue` (fixed, required); `termsAt`: fact of kind `file`, `revise`, `propose-terms` under `issue` (fixed, required); `conditions`: list of at most 16, each a text, at most 4096 bytes (fixed, required) |  |
| `concern` | many, at most 100 live | **`conflict`**, `created`, `creating` (initial), `delivered`, **`dropped`**, **`refused`** | `child`: scope of kind `lane`; `plan`: item of type `plan` (fixed, required); `result`: fact of kind `offer`, `propose-terms` under `issue`; `interface`: text, at most 4096 bytes (fixed); `purpose`: text, at most 4096 bytes (fixed, required); `role`: enum: `required`, `optional` (fixed, required) |  |
| `decision` | many, at most 32 live | **`recorded`** (initial) | `decider`: member (fixed, required); `acceptance`: fact of kind `accept-report` under `issue` (fixed); `concern`: item of type `concern` (fixed, required); `replacedBy`: item of type `concern` (fixed); `terms`: fact of kind `file`, `revise`, `propose-terms` under `issue` (fixed); `kind`: enum: `replaced`, `excluded`, `accepted-as-delivered` (fixed, required); `reason`: text, at most 4096 bytes (fixed, required) |  |
| `export` | many, at most 16 live | `authorized` (initial), **`done`**, **`refused`** | `authorizer`: member (fixed, required); `from`: member (fixed, required); `to`: member (fixed, required); `hold`: item of type `hold` (fixed, required) |  |
| `hold` | many, at most 16 live | **`ended`**, `held` (initial) | `holder`: member (required); `under`: item of type `commitment` (fixed, required); `ends`: time (required); `epoch`: int, 1 to 1000000 (required); `extent`: text, at most 1024 bytes |  |
| `input` | many, at most 32 live | **`replaced`**, `selected` (initial) | `authors`: member (fixed, list of at most 64); `selector`: member (fixed, required); `accepted`: fact of kind `accept-report` under `issue` (fixed, required); `for`: item of type `commitment` (fixed, required); `report`: fact of kind `report` under `issue` (fixed, required) |  |
| `intent` | one | `closed`, `open` (initial) | `assignees`: member (list of at most 10); `requester`: member (fixed, required); `closedBy`: fact of kind `close-own`, `close-any`, `closes` under `issue`; `conditionsAt`: fact of kind `file`, `revise` under `issue` (required); `currentPlan`: item of type `plan`; `judgedAt`: fact of kind `file`, `revise` under `issue`; `parent`: scope of kind `lane` (fixed); `body`: text, at most 65536 bytes, detached; `closeReason`: enum: `completed`, `not-planned`; `conditions`: list of at most 16, each a text, at most 4096 bytes (required); `judgeEvidence`: list of at most 32, each a digest; `judgeNote`: text, at most 4096 bytes; `labels`: list of at most 20, each a text, at most 64 bytes; `number`: int, 1 to 1000000000; `parentItem`: int, 0 to 1000000000 (fixed); `satisfied`: bool; `title`: text, at most 256 bytes (required) |  |
| `plan` | many, at most 16 live | `open` (initial), `sealed`, **`superseded`** | `planner`: member (fixed, required); `conditionsAt`: fact of kind `file`, `revise` under `issue` (fixed, required) |  |
| `report` | many, at most 64 live | **`accepted`**, **`refused`**, `reported` (initial) | `authors`: member (fixed, list of at most 64); `reporter`: member (fixed, required); `acceptedAt`: fact of kind `accept-report` under `issue`; `conditionsAt`: fact of kind `file`, `revise` under `issue` (fixed, required); `termsAt`: fact of kind `file`, `revise`, `propose-terms` under `issue` (fixed, required); `under`: item of type `commitment` (fixed, required); `claims`: list of at most 32, each a text, at most 1024 bytes (fixed); `commit`: commit (fixed, required); `evidence`: list of at most 32, each a digest (fixed); `reason`: text, at most 4096 bytes; `summary`: text, at most 65536 bytes, detached; `tree`: tree (fixed, required) |  |
| `approval-request` | many, at most 64 live | `open` (initial), **`met`**, **`withdrawn`** | `requested`: member (fixed, required); `requester`: member (fixed, required); `ask`: item of type `ask` (fixed, required); `bodyAt`: fact of kind `ask`, `revise-ask` under `issue` (fixed, required) |  |
| `approval` | many, at most 256 live | `submitted` (initial) | `approver`: member (fixed, required); `ask`: item of type `ask` (fixed, required); `bodyAt`: fact of kind `ask`, `revise-ask` under `issue` (fixed, required); `request`: item of type `approval-request` (fixed, required); `verdict`: enum: `approve`, `request-changes` (fixed, required); `comment`: text, at most 65536 bytes, detached (fixed) |  |

### Acts of `issue-questions-brief`: 53

| Kind | Step | Grant | Other items | Fields | Settles | Guards, effects, sends, attention | Needs |
|---|---|---|---|---|---|---|---|
| `accept` | transition on `commitment` | `issue.promise` | None | `terms`: fact of kind `file`, `revise`, `propose-terms` under `issue` |  | 3, 2, 0, 1 |  |
| `accept-handover` | transition on `commitment` | `issue.promise` | None | `terms`: fact of kind `file`, `revise`, `propose-terms` under `issue` |  | 4, 2, 0, 2 |  |
| `accept-report` | transition on `report` | `issue.request` | `commitment`: `commitment` by the field `commitment` | `commitment`: item of type `commitment`; `terms`: fact of kind `file`, `revise`, `propose-terms` under `issue` |  | 6, 2, 0, 0 |  |
| `add-concern` | open on `concern` | `issue.plan` | `plan`: `plan` by the field `plan` | `body?`: text, at most 65536 bytes, detached; `conditions`: list of at most 16, each a text, at most 4096 bytes; `interface?`: text, at most 4096 bytes; `plan`: item of type `plan`; `purpose`: text, at most 4096 bytes; `role`: enum: `required`, `optional`; `title`: text, at most 256 bytes |  | 3, 4, 1, 0 |  |
| `agree` | transition on `commitment` | `issue.request` | None | `terms`: fact of kind `file`, `revise`, `propose-terms` under `issue` |  | 3, 1, 0, 0 |  |
| `ask` | open on `ask` | `issue.comment` | None | `question`: text, at most 4096 bytes; `body`: text, at most 65536 bytes, detached; `brief`: digest |  | 0, 5, 0, 0 |  |
| `assign` | transition on `intent` | `issue.triage` | None | `assignees`: list of at most 10, each a member |  | 0, 1, 1, 1 |  |
| `authorize-export` | open on `export` | `work.export` | `hold`: `hold` by the field `hold` | `hold`: item of type `hold`; `to`: member |  | 1, 4, 0, 0 |  |
| `block` | open on `block` | `issue.work` | `commitment`: `commitment` by the field `commitment` | `commitment`: item of type `commitment`; `on`: fact of kind `ask` under `issue`; `reason?`: text, at most 4096 bytes |  | 3, 3, 0, 0 |  |
| `cancel` | transition on `commitment` | `issue.request` | None | None |  | 2, 1, 0, 1 |  |
| `close-any` | transition on `intent` | `issue.triage` | None | `reason?`: enum: `completed`, `not-planned` |  | 1, 3, 1, 0 |  |
| `close-own` | transition on `intent` | `issue.close-own` | None | `reason?`: enum: `completed`, `not-planned` |  | 2, 3, 1, 0 |  |
| `collapse-comment` | transition on `comment` | `issue.triage` | None | `reason`: text, at most 1024 bytes |  | 1, 2, 0, 0 |  |
| `comment` | open on `comment` | `issue.comment` | None | `body`: text, at most 65536 bytes, detached; `mentions?`: list of at most 16, each a member; `replyTo?`: item of type `comment`; `about?`: fact of kind `ask`, `revise-ask`, `approve`, `decide` under `issue` |  | 1, 5, 0, 1 |  |
| `decline` | transition on `commitment` | `issue.promise` | None | None |  | 2, 1, 0, 0 |  |
| `decline-handover` | transition on `commitment` | `issue.promise` | None | None |  | 2, 1, 0, 0 |  |
| `drop-concern` | transition on `concern` | `issue.plan` | None | None |  | 1, 1, 1, 0 |  |
| `edit-any` | transition on `intent` | `issue.edit-any` | None | `body?`: text, at most 65536 bytes, detached; `title?`: text, at most 256 bytes |  | 0, 2, 1, 0 |  |
| `edit-comment-any` | transition on `comment` | `issue.edit-any` | None | `body`: text, at most 65536 bytes, detached |  | 1, 1, 0, 0 |  |
| `edit-comment-own` | transition on `comment` | `issue.comment` | None | `body`: text, at most 65536 bytes, detached |  | 2, 1, 0, 0 |  |
| `edit-own` | transition on `intent` | `issue.edit-own` | None | `body?`: text, at most 65536 bytes, detached; `title?`: text, at most 256 bytes |  | 1, 2, 1, 0 |  |
| `expand-comment` | transition on `comment` | `issue.triage` | None | None |  | 1, 2, 0, 0 |  |
| `file` (genesis) | open on `intent` | `issue.open` | None | `body?`: text, at most 65536 bytes, detached; `conditions`: list of at most 16, each a text, at most 4096 bytes; `number?`: int, 1 to 1000000000; `opener`: member; `origin?`: fact of kind `add-concern` under `issue`; `title`: text, at most 256 bytes |  | 0, 8, 1, 0 |  |
| `fulfil` | transition on `commitment` | `issue.request` | `goal`: `intent` the one item of its type; `report`: `report` by the field `report` | `report`: item of type `report` |  | 5, 1, 1, 0 |  |
| `judge` | transition on `intent` | `issue.judge` | None | `evidence?`: list of at most 32, each a digest; `note?`: text, at most 4096 bytes; `satisfied`: bool |  | 1, 4, 0, 0 |  |
| `label` | transition on `intent` | `issue.triage` | None | `labels`: list of at most 20, each a text, at most 64 bytes |  | 0, 1, 1, 0 |  |
| `offer` | open on `commitment` | `issue.request` | `goal`: `intent` the one item of its type | `offeree?`: member |  | 1, 5, 0, 1 |  |
| `offer-handover` | transition on `commitment` | `issue.promise` | None | `successor`: member |  | 2, 1, 0, 1 |  |
| `open-plan` | open on `plan` | `issue.plan` | `goal`: `intent` the one item of its type | None |  | 1, 2, 0, 0 |  |
| `propose-terms` | open on `commitment` | `issue.promise` | `goal`: `intent` the one item of its type | `conditions`: list of at most 16, each a text, at most 4096 bytes |  | 1, 7, 0, 0 |  |
| `redact-comment-any` | transition on `comment` | `issue.edit-any` | None | None |  | 1, 2, 0, 0 |  |
| `redact-comment-own` | transition on `comment` | `issue.comment` | None | None |  | 2, 2, 0, 0 |  |
| `refuse-report` | transition on `report` | `issue.request` | `commitment`: `commitment` by the field `commitment` | `commitment`: item of type `commitment`; `reason`: text, at most 4096 bytes |  | 3, 3, 0, 1 | `hold@1` |
| `release-block` | transition on `block` | `issue.work` | `commitment`: `commitment` by the field `commitment` | `answer`: fact of kind `decide` under `issue`; `commitment`: item of type `commitment` |  | 6, 2, 0, 0 |  |
| `release-hold` | transition on `hold` | `issue.work` | None | None |  | 2, 1, 0, 0 |  |
| `renew-hold` | transition on `hold` | `issue.work` | `commitment`: `commitment` through the slot `under` of `on` | None |  | 4, 2, 0, 0 |  |
| `reopen-any` | transition on `intent` | `issue.triage` | None | None |  | 1, 3, 1, 0 |  |
| `reopen-own` | transition on `intent` | `issue.close-own` | None | None |  | 2, 3, 1, 0 |  |
| `replace-input` | transition on `input` | `issue.work` | `commitment`: `commitment` by the field `commitment` | `commitment`: item of type `commitment` |  | 3, 1, 0, 0 |  |
| `report` | open on `report` | `issue.work` | `commitment`: `commitment` by the field `commitment` | `claims?`: list of at most 32, each a text, at most 1024 bytes; `commit`: commit; `commitment`: item of type `commitment`; `evidence?`: list of at most 32, each a digest; `summary?`: text, at most 65536 bytes, detached; `terms`: fact of kind `file`, `revise`, `propose-terms` under `issue`; `tree`: tree |  | 5, 11, 0, 1 | `git-read@1`, `hold@1` |
| `resolve-concern` | open on `decision` | `issue.plan` | `concern`: `concern` by the field `concern`; `goal`: `intent` the one item of its type; `plan`: `plan` through the slot `plan` of `also.concern`; `replacement`: `concern` by the field `replacedBy` | `acceptance?`: fact of kind `accept-report` under `issue`; `concern`: item of type `concern`; `kind`: enum: `replaced`, `excluded`, `accepted-as-delivered`; `reason`: text, at most 4096 bytes; `replacedBy?`: item of type `concern`; `terms?`: fact of kind `file`, `revise`, `propose-terms` under `issue` |  | 3, 7, 0, 0 |  |
| `revise` | transition on `intent` | `issue.revise` | None | `conditions`: list of at most 16, each a text, at most 4096 bytes |  | 2, 2, 0, 0 |  |
| `seal-plan` | transition on `plan` | `issue.plan` | `current`: `plan` through the slot `currentPlan` of `also.goal`; `goal`: `intent` the one item of its type | `goalAt`: fact of kind `file`, `revise` under `issue`; `optional`: list of at most 32, each a record of `child?` (scope of kind `lane`), `item` (item of type `concern`); `required`: list of at most 32, each a record of `child?` (scope of kind `lane`), `item` (item of type `concern`) |  | 8, 3, 0, 0 |  |
| `take-hold` | open on `hold` | `issue.work` | `commitment`: `commitment` by the field `commitment` | `commitment`: item of type `commitment`; `extent?`: text, at most 1024 bytes |  | 3, 4, 0, 0 |  |
| `use-input` | open on `input` | `issue.work` | `commitment`: `commitment` by the field `commitment` | `accepted`: fact of kind `accept-report` under `issue`; `commitment`: item of type `commitment`; `report`: fact of kind `report` under `issue` |  | 6, 5, 0, 0 |  |
| `withdraw` | transition on `commitment` | `issue.promise` | None | None |  | 2, 1, 0, 1 |  |
| `withdraw-ask` | transition on `ask` | `issue.comment` | None | None |  | 2, 1, 0, 0 |  |
| `withdraw-plan` | transition on `plan` | `issue.plan` | `goal`: `intent` the one item of its type | None |  | 2, 2, 0, 0 |  |
| `revise-ask` | transition on `ask` | `issue.comment` | None | `bodyAt`: fact of kind `ask`, `revise-ask` under `issue`; `body`: text, at most 65536 bytes, detached; `brief?`: digest |  | 4, 2, 0, 0 |  |
| `request-approval` | open on `approval-request` | `issue.comment` | `ask`: `ask` by the field `ask` | `ask`: item of type `ask`; `bodyAt`: fact of kind `ask`, `revise-ask` under `issue`; `requested`: member |  | 4, 4, 0, 1 |  |
| `withdraw-approval-request` | transition on `approval-request` | `issue.comment` | `ask`: `ask` through the slot `ask` of `on` | `bodyAt`: fact of kind `ask`, `revise-ask` under `issue` |  | 3, 1, 0, 0 |  |
| `approve` | open on `approval` | `issue.approve` | `request`: `approval-request` by the field `request`; `ask`: `ask` through the slot `ask` of `also.request` | `request`: item of type `approval-request`; `bodyAt`: fact of kind `ask`, `revise-ask` under `issue`; `verdict`: enum: `approve`, `request-changes`; `comment?`: text, at most 65536 bytes, detached |  | 6, 7, 0, 1 |  |
| `decide` | transition on `ask` | `issue.decide` | None | `bodyAt`: fact of kind `ask`, `revise-ask` under `issue`; `comment?`: text, at most 4096 bytes |  | 5, 3, 0, 1 |  |

### Handlers of `issue-questions-brief`: 7

| Name | Class and message | From | Opens | Copies | Other items | Fields | Settles | Guards, effects, sends, attention | Needs |
|---|---|---|---|---|---|---|---|---|---|
| `closes` | relate `closes` | `lane` under `change` | Nothing | 32 | `goal`: `intent` the one item of its type | `commit?`: commit; `plan?`: fact of kind `seal-plan` under `issue` | a copy in `set` | 0, 3, 0, 0 |  |
| `export-license` | tell `export-license` | `task` under `platform:task` | Nothing |  | `export`: `export` by the field `export`; `target`: `hold` by the field `hold` | `checkpoint`: digest; `export`: fact of kind `authorize-export` under `issue`; `hold`: item of type `hold`; `instance`: text, at most 128 bytes; `k`: int, 1 to 3 |  | 5, 1, 0, 0 | `hold@1` |
| `export-settled` | tell `export-settled` | `task` under `platform:task` | Nothing |  | `export`: `export` by the field `export` | `export`: fact of kind `authorize-export` under `issue`; `final`: enum: `confirmed`, `withheld` | `also.export` in `authorized` | 2, 3, 0, 0 | `hold@1` |
| `parent-dropped` | tell `parent-dropped` | `lane` under `issue` | Nothing |  | `goal`: `intent` the one item of its type | None |  | 1, 0, 0, 0 |  |
| `pin-confirm` | tell `pin-confirm` | `lane` under `change` | Nothing |  | None | `commit`: commit |  | 3, 1, 0, 0 | `hold@1` |
| `result` | relate `result` | `lane` under `issue` | Nothing | 100 | `concern`: `concern` by the field `parentItem`; `goal`: `intent` the one item of its type | `acceptance`: fact of kind `accept-report` under `issue`; `commitment`: fact of kind `offer`, `propose-terms` under `issue`; `conditions`: fact of kind `file`, `revise` under `issue`; `parentItem`: item of type `concern`; `report`: fact of kind `report` under `issue`; `terms`: fact of kind `file`, `revise`, `propose-terms` under `issue` | `also.concern` in `created` | 2, 2, 0, 1 |  |
| `unpin` | tell `unpin` | `lane` under `change` | Nothing |  | None | `because`: enum: `superseded`, `published`; `commit`: commit; `manifest`: fact of kind `propose-manifest` under `change`; `merge?`: fact of kind `merge` under `change` |  | 5, 1, 0, 0 | `hold@1` |

### Timed rules of `issue-questions-brief`: 1

| Name | On | In states | Deadline slot | Effects, attention |
|---|---|---|---|---|
| `hold-end` | `hold` | `held` | `ends` | 1, 0 |

## `change-finding`

Name `change`. Genesis act `open`. Capabilities listed: `hold@2`, `git-read@1`. Rule expressions: 0.

### Item types of `change-finding`: 15

| Type | How many | States | Slots | Needs |
|---|---|---|---|---|
| `comment` | many, at most 5000 live | `collapsed`, **`redacted`**, `visible` (initial) | `author`: member (fixed, required); `mentioned`: member (fixed, list of at most 16); `replyTo`: item of type `comment`; `thread`: item of type `thread` (fixed); `body`: text, at most 65536 bytes, detached; `collapseReason`: text, at most 1024 bytes |  |
| `commitment` | many, at most 16 live | `accepted`, **`cancelled`**, **`declined`**, `offered` (initial), **`withdrawn`** | `offeree`: member (fixed); `performer`: member (author); `requester`: member (fixed, required); `successor`: member; `termsAt`: fact of kind `offer` under `change` (fixed, required); `terms`: text, at most 4096 bytes (fixed, required) |  |
| `export` | many, at most 16 live | `authorized` (initial), **`done`**, **`refused`** | `authorizer`: member (fixed, required); `from`: member (fixed, required); `to`: member (fixed, required); `hold`: item of type `hold` (fixed, required) |  |
| `hold` | many, at most 16 live | **`ended`**, `held` (initial) | `holder`: member (required); `under`: item of type `commitment` (fixed, required); `ends`: time (required); `epoch`: int, 1 to 1000000 (required); `extent`: text, at most 1024 bytes |  |
| `job` | many, at most 64 live | `errored`, `failed`, `passed`, `requested` (initial), **`superseded`**, `timed-out` | `asker`: member (fixed, required); `informed`: member (fixed, list of at most 2); `decidedBy`: fact of kind `check`, `check-error`, `timed:job-deadline` under `change`; `manifest`: item of type `manifest` (fixed, required); `configuration`: digest (fixed, required); `deadline`: time (fixed, required); `name`: text, at most 128 bytes (fixed, required); `tree`: tree (fixed, required) |  |
| `link` | many, at most 32 live | `removed`, `set` (initial) | `linker`: member (fixed, required); `issue`: scope of kind `lane` (fixed, required); `how`: enum: `keyword`, `manual` (fixed, required) |  |
| `manifest` | many, at most 64 live | `current` (initial), **`superseded`** | `authors`: member (fixed, required, list of at most 64); `integrator`: member (fixed, required); `goal`: fact of kind `file`, `revise` under `issue` (fixed); `pin`: fact of kind `hold@2:check` under `issue` (fixed); `plan`: fact of kind `seal-plan` under `issue` (fixed); `staging`: scope of kind `lane` (fixed); `under`: item of type `commitment` (fixed); `base`: commit (fixed, required); `complete`: bool (fixed, required); `decisions`: list of at most 32, each a fact of kind `resolve-concern` under `issue` (fixed); `digest`: digest (fixed); `integration`: commit (fixed); `path`: text, at most 1024 bytes (fixed); `selected`: list of at most 32, each a record of `accepted` (fact of kind `accept-report` under `issue`), `report` (fact of kind `report` under `issue`) (fixed); `size`: int, 0 to 65536 (fixed); `tree`: tree (fixed) | `hold@2` |
| `merge` | many, at most 16 live | **`aborted`**, `committed`, `intended` (initial), **`published`**, **`refused`**, `unknown` | `merger`: member (fixed, required); `manifest`: item of type `manifest` (fixed, required); `commit`: commit; `reason`: text, at most 1024 bytes; `withdrawal`: enum: `asked` |  |
| `proposal` | one | `closed`, `draft` (initial), **`merged`**, `open` | `assignees`: member (list of at most 10); `author`: member (fixed, required); `destination`: scope of kind `destination` (fixed, required); `rulesScope`: scope of kind `rules` (fixed, required); `body`: text, at most 65536 bytes, detached; `labels`: list of at most 20, each a text, at most 64 bytes; `number`: int, 1 to 1000000000; `title`: text, at most 256 bytes (required) |  |
| `result` | many, at most 512 live | **`recorded`** (initial) | `checker`: member (fixed, required); `job`: item of type `job` (fixed, required); `details`: digest (fixed); `outcome`: enum: `passed`, `failed`, `error` (fixed, required); `reason`: text, at most 4096 bytes (fixed); `tree`: tree (fixed, required) |  |
| `review` | many, at most 256 live | **`dismissed`**, `submitted` (initial), **`superseded`**, **`withdrawn`** | `reviewer`: member (fixed, required); `manifest`: item of type `manifest` (fixed, required); `body`: text, at most 65536 bytes, detached; `dismissal`: text, at most 4096 bytes; `extent`: text, at most 64 bytes (fixed); `verdict`: enum: `approve`, `request-changes` (fixed, required) |  |
| `review-request` | many, at most 64 live | **`met`**, `open` (initial), **`withdrawn`** | `requested`: member (fixed, required); `requester`: member (fixed, required) |  |
| `rules` | one | `current` (initial) | `source`: fact of kind `publish`, `rules-wanted` under `platform:rules`; `approvals`: int, 0 to 64 (required); `checks`: list of at most 32, each a record of `checker` (member), `configuration` (digest), `name` (text, at most 128 bytes), `required` (bool); `extents`: list of at most 8, each a record of `approvals` (int, 0 to 64), `approver` (text, at most 64 bytes), `checks` (list of at most 32, each a text, at most 128 bytes), `class` (enum: `content`, `deployment`, `authority`), `name` (text, at most 64 bytes); `ownerMayReview`: bool (required); `revision`: int, 0 to 1000000000 (required) |  |
| `thread` | many, at most 1000 live | `open` (initial), `resolved` | `opener`: member (fixed, required); `manifest`: item of type `manifest` (fixed, required); `line`: int, 1 to 1000000000 (fixed); `path`: text, at most 4096 bytes (fixed, required); `side`: enum: `base`, `change` (fixed) |  |
| `finding` | many, at most 256 live | `open` (initial), **`resolved`**, **`irrelevant`** | `reporter`: member (fixed, required); `answeredBy`: member; `version`: fact of kind `propose-manifest` under `change` (fixed, required); `file`: text, at most 1024 bytes (fixed, required); `start`: int, 1 to 1000000000 (fixed, required); `end`: int, 1 to 1000000000 (fixed, required); `class`: text, at most 64 bytes (fixed, required); `severity`: enum: `low`, `medium`, `high`, `critical` (fixed, required); `confidence`: int, 0 to 100 (fixed, required); `scenario`: text, at most 4096 bytes (fixed, required); `source`: text, at most 128 bytes (fixed, required); `sourceVersion`: text, at most 128 bytes (fixed, required); `tree`: tree (fixed, required); `answer`: text, at most 4096 bytes |  |

### Acts of `change-finding`: 23

| Kind | Step | Grant | Other items | Fields | Settles | Guards, effects, sends, attention | Needs |
|---|---|---|---|---|---|---|---|
| `open` (genesis) | open on `proposal` | `change.open` | None | `body?`: text, at most 65536 bytes, detached; `destination`: scope of kind `destination`; `draft`: bool; `number?`: int, 1 to 1000000000; `opener`: member; `rules`: scope of kind `rules`; `title`: text, at most 256 bytes |  | 0, 7, 1, 0 |  |
| `edit-own` | transition on `proposal` | `change.edit-own` | None | `body?`: text, at most 65536 bytes, detached; `labels?`: list of at most 20, each a text, at most 64 bytes; `title?`: text, at most 256 bytes |  | 2, 3, 1, 0 |  |
| `ready-own` | transition on `proposal` | `change.edit-own` | None | None |  | 2, 1, 1, 0 |  |
| `close-own` | transition on `proposal` | `change.edit-own` | None | None |  | 3, 1, 1, 0 |  |
| `ask-rules` | transition on `proposal` | `change.propose` | None | None |  | 0, 0, 1, 0 |  |
| `propose-manifest` | open on `manifest` | `change.propose` | `commitment`: `commitment` through the slot `under` of `also.hold`; `hold`: `hold` by the field `hold`; `previous`: `manifest` by the field `previous`; `proposal`: `proposal` the one item of its type | `base`: commit; `complete`: bool; `decisions`: list of at most 32, each a fact of kind `resolve-concern` under `issue`; `foreignHold?`: int, 0 to 1000000000; `goal?`: fact of kind `file`, `revise` under `issue`; `hold?`: item of type `hold`; `instance`: text, at most 128 bytes; `integration`: commit; `lane?`: scope of kind `lane`; `plan?`: fact of kind `seal-plan` under `issue`; `previous?`: item of type `manifest`; `selected`: list of at most 32, each a record of `accepted` (fact of kind `accept-report` under `issue`), `report` (fact of kind `report` under `issue`); `tree`: tree. Presented: `pin?`: fact of kind `hold@2:check` under `issue` |  | 24, 16, 2, 0 | `git-read@1`, `hold@2` |
| `propose-file` | open on `manifest` | `change.propose` | `proposal`: `proposal` the one item of its type | `base`: commit; `content`: text, at most 65536 bytes; `digest`: digest; `path`: text, at most 1024 bytes; `size`: int, 0 to 65536 |  | 4, 7, 0, 0 |  |
| `request-review-own` | open on `review-request` | `change.edit-own` | `proposal`: `proposal` the one item of its type | `requested`: member |  | 2, 2, 0, 1 |  |
| `review-verdict` | open on `review` | `change.review` | `earlier`: `review` by the field `earlier`; `manifest`: `manifest` by the field `manifest`; `proposal`: `proposal` the one item of its type; `request`: `review-request` by the field `request` | `body?`: text, at most 65536 bytes, detached; `earlier?`: item of type `review`; `extent?`: text, at most 64 bytes; `manifest`: item of type `manifest`; `request?`: item of type `review-request`; `verdict`: enum: `approve`, `request-changes` |  | 9, 7, 0, 1 |  |
| `request-check` | open on `job` | `change.propose` | `earlier`: `job` by the field `earlier`; `manifest`: `manifest` by the field `manifest`; `proposal`: `proposal` the one item of its type; `rules`: `rules` the one item of its type | `configuration`: digest; `earlier?`: item of type `job`; `manifest`: item of type `manifest`; `name`: text, at most 128 bytes |  | 7, 8, 0, 0 |  |
| `check` | open on `result` | `change.check` | `job`: `job` by the field `job`; `proposal`: `proposal` the one item of its type; `rules`: `rules` the one item of its type | `configuration`: digest; `details?`: digest; `job`: item of type `job`; `outcome`: enum: `passed`, `failed`; `tree`: tree | `also.job` in `requested`, `timed-out` | 4, 8, 0, 1 |  |
| `comment` | open on `comment` | `change.comment` | None | `body`: text, at most 65536 bytes, detached; `mentions?`: list of at most 16, each a member; `replyTo?`: item of type `comment`; `thread?`: item of type `thread` |  | 0, 5, 0, 1 |  |
| `link-own` | open on `link` | `change.edit-own` | `proposal`: `proposal` the one item of its type | `how`: enum: `keyword`, `manual`; `issue`: scope of kind `lane` |  | 4, 3, 1, 0 |  |
| `merge` | open on `merge` | `change.merge` | `manifest`: `manifest` by the field `manifest`; `proposal`: `proposal` the one item of its type; `rules`: `rules` the one item of its type | `manifest`: item of type `manifest`; `reports`: list of at most 32, each a fact of kind `report` under `issue` |  | 11, 2, 1, 0 |  |
| `cancel-merge` | transition on `merge` | `change.merge` | `proposal`: `proposal` the one item of its type | None |  | 2, 1, 1, 0 |  |
| `offer` | open on `commitment` | `change.request` | `proposal`: `proposal` the one item of its type | `offeree?`: member; `terms`: text, at most 4096 bytes |  | 1, 4, 0, 1 |  |
| `accept` | transition on `commitment` | `change.promise` | None | `terms`: fact of kind `offer` under `change` |  | 3, 2, 0, 1 |  |
| `take-hold` | open on `hold` | `change.work` | `commitment`: `commitment` by the field `commitment`; `proposal`: `proposal` the one item of its type | `commitment`: item of type `commitment`; `extent?`: text, at most 1024 bytes |  | 4, 4, 0, 0 |  |
| `release-hold` | transition on `hold` | `change.work` | None | None |  | 2, 1, 0, 0 |  |
| `file-finding` | open on `finding` | `change.check` | `proposal`: `proposal` the one item of its type; `rules`: `rules` the one item of its type | `version`: fact of kind `propose-manifest` under `change`; `file`: text, at most 1024 bytes; `start`: int, 1 to 1000000000; `end`: int, 1 to 1000000000; `class`: text, at most 64 bytes; `severity`: enum: `low`, `medium`, `high`, `critical`; `confidence`: int, 0 to 100; `scenario`: text, at most 4096 bytes; `source`: text, at most 128 bytes; `sourceVersion`: text, at most 128 bytes; `tree`: tree |  | 6, 12, 0, 0 |  |
| `resolve-finding-own` | transition on `finding` | `change.check` | None | `answer`: text, at most 4096 bytes |  | 2, 3, 0, 0 |  |
| `resolve-finding-any` | transition on `finding` | `change.dismiss` | `proposal`: `proposal` the one item of its type; `manifest`: `manifest` through the slot `version` of `on` | `answer`: text, at most 4096 bytes |  | 3, 3, 0, 0 |  |
| `mark-finding-irrelevant` | transition on `finding` | `change.dismiss` | `proposal`: `proposal` the one item of its type; `manifest`: `manifest` through the slot `version` of `on` | `answer`: text, at most 4096 bytes |  | 3, 3, 0, 0 |  |

### Handlers of `change-finding`: 2

| Name | Class and message | From | Opens | Copies | Other items | Fields | Settles | Guards, effects, sends, attention | Needs |
|---|---|---|---|---|---|---|---|---|---|
| `publication` | relate `publication` | `destination` under `platform:destination` | Nothing | 16 | `manifest`: `manifest` through the slot `manifest` of `also.merge`; `merge`: `merge` by the field `operation`; `proposal`: `proposal` the one item of its type | `commit?`: commit; `operation`: fact of kind `merge` under `change`; `outcome`: enum: `committed`, `unknown`, `published`, `refused`, `aborted`; `reason?`: text, at most 1024 bytes; `rules?`: int, 0 to 1000000000 | `also.merge` in `intended`, `committed`, `unknown` | 2, 9, 3, 0 | `hold@2` |
| `rules` | relate `rules` | `rules` under `platform:rules` | `rules` | 1 | `proposal`: `proposal` the one item of its type | `approvals`: int, 0 to 64; `checks?`: list of at most 32, each a record of `checker` (member), `configuration` (digest), `name` (text, at most 128 bytes), `required` (bool); `extents?`: list of at most 8, each a record of `approvals` (int, 0 to 64), `approver` (text, at most 64 bytes), `checks` (list of at most 32, each a text, at most 128 bytes), `class` (enum: `content`, `deployment`, `authority`), `name` (text, at most 64 bytes); `labels?`: list of at most 32, each a text, at most 64 bytes; `ownerMayReview`: bool; `singleControllerException?`: bool |  | 1, 6, 0, 0 |  |

### Timed rules of `change-finding`: 2

| Name | On | In states | Deadline slot | Effects, attention |
|---|---|---|---|---|
| `hold-end` | `hold` | `held` | `ends` | 1, 0 |
| `job-deadline` | `job` | `requested` | `deadline` | 2, 1 |
