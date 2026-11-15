# A definition states which subjects an act observed

Status: for review. This note is the design of step A of
[the act environment note](2026-11-14-act-environment.md), which this
note calls the environment note. Hugh decided the direction on 14
November 2026 (decision 1 of its section 17). Nothing here is built.
Section 10 lists the decisions that this note asks Hugh to make.

Two members drag one note on a pinboard. Each page sends a `move` with
the revision of the note that its member saw. The scope records the
first move and refuses the second with `revision-moved`. The members
did not conflict. Each member meant "put the note here", and neither
move depends on the note's earlier place.

A member who comments on a place of a shared map has the same problem.
The comment names the place, and the judge requires the revision of
the place. An edit of the place then refuses each comment in flight.
The map gave up its guard `place-gone` for that reason
(`~/play/dap-foldkit/PLAN.md`, section 6.1).

This note lets the author of a definition say that an act does not
depend on the revision that its signer saw. The author writes one
list in the act. The scope then judges the guards at the commit and
compares no revision for the subjects in that list.

Each fact below is read at main `26d1e65c`. Each name in a code block
is a sketch, and a build step can change it.

## 1. The author writes one list in the act

```json
{
	"format": "artroom-definition-1",
	"admission": { "name": "by-subject", "version": 1 },
	"acts": {
		"move": {
			"step": "transition",
			"on": "note",
			"also": {},
			"current": ["on"]
		},
		"comment": {
			"step": "open",
			"on": "comment",
			"also": { "place": { "item": "place", "by": "place" } },
			"current": ["place"],
			"guards": [
				{ "of": "also.place", "state": ["open"], "reason": "place-gone" }
			]
		}
	}
}
```

The example leaves out the other members of each act.

- **The part `admission`** is a new optional part of a definition. It
  carries a name and a version, as `level` and `capacity` do. A
  definition with no part has today's meaning.
- **The member `current`** is a new optional member of an act. It
  lists keys of the intent's `expected`: `on`, or a name of `also`.
  A subject in the list has the admission `current`. Each other
  subject has the admission `observed`, which is today's rule.

The `move` of the example records for both members, and the last
destination stands. The `comment` records while the place is open,
whatever its revision. When the place is gone, the scope refuses the
comment with `place-gone`.

The author declares the admission. No part of dap infers it from a
guard that holds.

## 2. The judge leaves a current subject out of its comparison

`actJudged` builds the list `expects` of the keys that `expected` must
hold (`packages/derive/src/judge.ts:289-313`). The list has `on` for a
transition, and each bound name of `also` that no mark selects. The
judge refuses an intent whose keys differ from the list with
`bad-intent`. It then refuses with `revision-moved` when a revision
differs.

Step A changes one thing. A key in the act's `current` does not enter
`expects`. The two `push` lines at `judge.ts:295` and `:305` each gain
one condition.

Each other rule stays as it is:

- The check of the keys stays exact. An intent that holds a key for a
  `current` subject is refused with `bad-intent`. A signer cannot
  choose the admission.
- The guards, the grant, the field checks, the alias rule, the rule
  for a final state and the bounds apply as they do today.
- An effect raises the revision of an item that it changes, as today.
- The judge reads the admission from the pinned definition. The
  runtime and the verifier call the same judge, so replay derives the
  same answer (promise 9 of `docs/kernel.md`).

The scope processes one act at a time. So `current` costs no second
signature, no second round trip and no repeated race.

## 3. The validator admits the list under four checks

The validator is `packages/derive/src/validate/`. Today it refuses the
part and the member, because the contract does not define them
(`validate/shape.ts:65`, called at `validate/index.ts:147` and
`validate/handlers.ts:231`).

Step A makes the validator admit them, with these checks:

1. **The part and the member come together.** The part is exactly
   `{ "name": "by-subject", "version": 1 }`. Another name or version
   is refused with `unsupported-definition`, as an unknown `level` is
   (`validate/format-1.ts:45-63`). An act states `current` only in a
   definition with the part. A definition states the part only when
   one act or more states `current`. So one meaning has one form.
2. **Each name is a subject that takes a key.** A name is `on` in an
   act with the step `transition`, or it is a name of the act's
   `also` that no mark selects. The list is not empty, each name
   appears one time, and the names are in ascending order.
3. **Version 1 has a narrow scope.** The validator refuses the part
   in a platform declaration, and in a definition whose level is
   `live` or `sequenced`. It refuses `current` in the genesis act.
   Neither level is built, and no platform definition needs the part.
   A handler and a timed rule have no signer and no `expected`, so
   they take no `current`. A `comment` act takes none, because its
   `on` has no key today (`judge.ts:295`).
4. **A revision must prove its item.** Section 4 gives this check.

The new refusals of checks 2 to 4 take one new problem code,
`admission`. A refusal of form takes `shape`, as today.

## 4. An observed name is not selected through a moving slot

A name of `also` that is bound with `via` reads a reference slot of
another subject (`packages/derive/src/handlers.ts:289-292`). The
intent does not hold the ID of that item. The signer's page read the
slot, found the item and wrote the item's revision in `expected`.

Today that is safe. The subject with the slot is `observed`, and a
change of the slot raises its revision. So an equal revision of the
subject proves that the slot names the item that the signer saw.

Under `current`, that proof is gone. Take an act whose `on` is
`current`, with a name `plan` bound through the slot `currentPlan` of
`on`. The signer sees plan 7 at revision 3. Another member sets the
slot to plan 9, which is also at revision 3. The judge selects plan
9, finds revision 3 and admits the act. The signer authorized a
change to plan 7 and changed plan 9.

So the validator refuses this combination:

> An `observed` name that is bound with `via` through a slot of a
> `current` subject, unless the slot is `fixed`.

A fixed slot is set only by the act that opens its item
(`validate/effects.ts:85-86`), so it names one item for the life of
its subject. The validator walks each chain of `via` names today and
finds the slots that are not fixed (`validate/handlers.ts:100-121`).
The new check reads the same walk, one link at a time.

The other three bindings need no check:

| Binding | Why a revision proves the item |
|---|---|
| `on` | The intent holds the ID |
| `by` | A field of the intent holds the ID, and the signature covers it |
| `one` | The type is not `many`, and the judge refuses the name when two items of the type exist (`handlers.ts:294-296`) |

A `current` name can be bound through a slot of a `current` subject.
The judge compares no revision for it. The name then means the item
that the slot holds at the commit, and the guards judge that item.

The 20 tracked definition files of format 1 hold 38 names that are
bound with `via`. Eight of them read a slot that is not fixed: three
names of `raise-alert` and one of `propose-restoration` in
`examples/grow/definitions/room.json`, and one name of `seal-plan` in
each of the four issue definitions of `apps/room/lanes/definitions/`.
Each of those acts has only `observed` subjects, so the check does not
touch them. The check meets an act only when its author adds `current`
to the subject with the slot.

The environment note names a later design: put the item's ID beside
the revision. That design would admit the refused combination. Step A
does not need it.

## 5. One function gives the keys of expected

Five places compute which keys `expected` holds:

| Place | Rule |
|---|---|
| The judge, `judge.ts:289-305` | The authority |
| `expectedOf`, `packages/client/src/expected.ts:55-68` | The builder for the CLI, the MCP server, the pages and the examples. About 30 call sites |
| `packages/mcp/src/views/declared.ts:150-152` | Its own list: each name of `also` that no mark selects, and `on` for a transition. A card signs only when each of those keys is present |
| `packages/define/src/story.ts:196-201` | Its own rule. It sets `on` whenever the story names an item, and the judge takes no `on` key for a `comment` |
| `capturedExpected`, `packages/mcp/src/shape.ts:118-133` | The check of the MCP input `at`. It compares with the builder's keys. It also admits a key that the builder left out, for `on` and for each name of `also` that no mark selects, because a subject can leave the live summary |

Five rules for one fact can differ. The fourth differs from the judge
now. The third is stricter on purpose, and it keeps that rule. Step A
would add one more condition to each. So step A first makes the change
easy: `packages/derive` exports one function, and each place calls it.

```ts
/** The keys of `expected` for an act. `bound`: the names of `also`
 *  that are bound and that no mark selects. */
function expectedKeys(act: ActType, bound: Iterable<string>): string[]
```

The judge calls the function with the names that it resolved. The
builder calls it with the names that the caller's view resolves. The
card view calls it with each name that no mark selects.

The check of the MCP input `at` does not follow from the builder. The
builder leaves out the key of a `current` subject, and the check then
admits that key as one of a subject that left the summary. The scope
would refuse the intent with `bad-intent`, after a signature. So the
check takes its admitted names from the function, with each name that
no mark selects. The MCP server then refuses an `at` that holds a key
for a `current` subject, and it signs nothing. The rule covers a
`current` `on` in the same way. The description of that input
(`packages/mcp/src/input-schema.ts:36`) says "bound subjects" and
gains the word "observed".

The member `current` sits in the act. Each call site of `expectedOf`
passes the act today, so no call site changes.

The environment needs nothing more. Its note defines a bound act as
one whose `expected` holds a key for each `observed` subject (its
section 3). Explore, a draft and a dependent step read the keys from
the same builder. A `current` subject has no basis, so a step never
returns for a move of that subject. Section 8 of that note does not
change: a step with no key for a subject names no `{ after }` for it.

A scenario file states `expected` by hand
(`packages/cli/src/application-scenarios.ts:143-147`). Its author
leaves out the key of a `current` subject, and the judge refuses a
file that keeps it.

## 6. The part and the member are the carrier

`docs/kernel.md` section 7.2 binds each validation check to the format
`artroom-definition-1`, or to an optional part with its own version.
The environment note asked this design to choose the carrier.

| Carrier | Result |
|---|---|
| A new format, `artroom-definition-2` | Each tool, fixture and reader of the format learns a second format for one optional rule. Refused |
| A table in the top-level part, by act name | The act form stays as it is. Each of about 30 call sites of `expectedOf` then needs the definition beside the act. An author reads the rule of an act in two places |
| A versioned part, and one member in the act | Chosen. The version owns the checks, and the rule of an act stays in the act |
| A gate by cohort with no part | The definition's bytes then do not say which grammar they use. Refused |

The chosen carrier has a precedent in the same validator. The part
`level` carries a version, and a definition of the sequenced level
admits the act members `sequenced` and `reads` (`sequencedAct`,
`validate/handlers.ts:197-203`).

An older validator refuses a definition with the part, and it refuses
an act with the member. Both refusals are `shape`. An older verifier
therefore refuses to replay a scope that pins such a definition. It
does not give a wrong answer.

A later stricter check on the list takes version 2 of the part, as
section 7.2 of the kernel page rules.

## 7. A room installs the part only at a Rules pin that opts in

Reference fields set the precedent. They stay in format 1, and
`requireReferenceInstall` refuses a definition with a reference field
unless the room's Rules pin is `platform:rules@14`
(`packages/platform/src/application-install-reference.ts:24-27`). The
kernel page says why: "The shared field type does not migrate an
older room's native installation policy" (section 7.3).

The part `level` has no such gate, and it needs none today. No runtime
derives a `live` or a `sequenced` definition
(`packages/derive/src/capability.ts:224-226`), so no room pins one.

The admission part is derivable from its first build. So step A takes
the gate of the reference field:

- The install rule refuses a definition with the part unless the
  room's Rules pin opts in. The reason is
  `admission-requires-rules<n>`, where `<n>` is the lowest pin that
  opts in. The reason is a name in `packages/platform`, as
  `reference-requires-rules14` is.
- A pin opts in by name. An unknown later pin stays closed until its
  cohort opts in.
- The pins that opt in are the pins that install reference fields at
  the head of step A. Today that is `platform:rules@14`. Step A adds
  no Rules version.
- One table in `packages/platform` holds both features with their
  pins. `requireReferenceInstall` reads that table.

The gate changes what a room at `platform:rules@14` installs. It
changes no recorded entry. Before step A, each such room refused the
part, so no journal holds an install that the new rule judges
differently.

## 8. A current act still moves the item's revision

A dap item has one revision. An act with a `current` subject changes
the item, and the revision rises. An `observed` act in flight on the
same item then returns.

On the pinboard, Ann edits the text of a note while Bo drags it. Bo's
`move` is `current` and records. Ann's `edit` is `observed`, and it
returns with `revision-moved`, although the text did not change. Ann
sees the note and her text, and she submits again (section 6 of the
environment note).

An author who needs both acts to record splits the item. The place of
a note becomes its own item, with a fixed slot that names the note.
`move` acts on the place, and `edit` acts on the note. A drag then
never moves the revision of the note. This uses today's forms.

Step A adds no revision for a group of fields.

Three kinds of act suit `current`, and two do not:

| Act | Under `current` |
|---|---|
| An act that sets an absolute value: `move`, `resize` | Suits. Each act records, and the last value stands |
| An act that adds a party to a list slot, or removes one | Suits. The effect changes the list that the item holds at the commit |
| An act that adds beside an item, with a guard on that item: a comment on a place | Suits. The guard is the precondition |
| An act that carries content which its signer wrote from what the signer saw: Lending `borrow` with its page content | Does not suit. The content can be stale |
| An edit of a text | Does not suit. The member sees the other text first |

## 9. The build is one preparation and one kernel head

| Step | Work | Kernel |
|---|---|---|
| A1 | `expectedKeys` in `packages/derive`. The judge, `expectedOf`, `views/declared.ts`, `story.ts` and `capturedExpected` call it. No answer of the judge changes. `story.ts` stops setting `on` for a `comment` | One export |
| A2 | The contract types, the validator's checks, the judge's condition, the install gate, and the documents | The part, the member, one problem code |
| A3 | The map's `comment` takes `also.place`, `current` and the guard `place-gone`, in `~/play/dap-foldkit`. The pinboard states `current` for `move` and `resize` when it has a definition | None |

A1 and A2 are one head or two. Each waits for the kernel ruling of
section 10. A1 can land after step E1, which splits the judge, because
A1 changes no answer of the judge. A2 follows steps E1 to E6, as the
environment note orders.

Step A2 changes these documents: section 6.4 of
`notes/2026-10-04-scope-and-replay-contract.md`, promise 3 and
sections 7 and 7.1 of `docs/kernel.md`, `docs/mcp.md` and
`docs/hosted-mcp.md` for the input `at`, and
`docs/write-an-application.md` for the author.

**Named cases of A2.** Each has one test.

1. Two transitions with one `expected` basis on a `current` subject.
   The scope records both.
2. An intent with a key for a `current` subject. The scope refuses it
   with `bad-intent`.
3. A `current` subject and a guard that fails at the commit. The
   scope refuses with the guard's reason, and with no
   `revision-moved`.
4. An act with one `current` subject and one `observed` subject,
   where the `observed` item moved. The scope refuses with
   `revision-moved` for that key.
5. A `current` transition on an item in a final state. The scope
   refuses as today.
6. The verifier replays a journal that holds cases 1 to 5 and derives
   each answer again.
7. The validator refuses each of these: `current` with no part, the
   part with no `current`, an unknown version, a name that is no
   subject, `on` in an `open` act, a name that a mark selects, a name
   two times, names out of order, the part in a platform declaration,
   the part at the `live` level, and `current` in the genesis act.
8. The validator refuses an `observed` name through a slot of a
   `current` subject that is not fixed. It admits the same act when
   the slot is fixed, and when the name is also `current`. This is
   case 8 of the suite in section 12 of the environment note.
9. A room at a pin that does not opt in refuses the install with the
   reason of section 7. A room at `platform:rules@14` installs.
10. `expectedOf` gives no key for a `current` subject. The MCP
    server refuses an `at` that holds one, for `on` and for a name of
    `also`, before it signs.

**Controls.** Each control changes one line and names the case that
fails.

- Remove the judge's condition. Case 1 fails: the second act is
  refused.
- Remove the check of section 4 from the validator. Case 8 fails. One
  more test then shows the fault of section 4 in the judge: the slot
  moves to an item with an equal revision, and the judge admits the
  act.
- Remove the install gate. Case 9 fails.

**Compatibility.** Each row of the definition corpus
(`packages/derive/test/definition-corpus/`) keeps its bytes, its
digest and its validation answer. No row has the part. The judge's
tests and the verifier's tests give the same answers with no change
to a test. The repository holds no corpus of recorded judgments under
that name, and step E1 rules how its condition is met. Step A uses
what E1 leaves.

## 10. The kernel review, and what Hugh decides

`docs/kernel.md` section 7 asks why a part cannot be a platform
service or an application.

**Why the admission is kernel.** The admission decides whether the
judge compares a revision. That decides whether an entry is admitted
or refused. The runtime and the verifier must derive one answer from
the pinned definition, and a service that a host can replace cannot
decide it. The part fails the test of section 2 of that page by
design: each recorded entry of such a scope needs the judge's reading
to be derived again.

**What step A adds to the kernel.**

- In `packages/contract`: the type of the part, the optional member
  `admission` of a declared definition, and the optional member
  `current` of an act.
- In `packages/derive`: the export `expectedKeys`, the validator's
  checks, the problem code `admission`, and one condition in the
  judge.
- No scope kind, platform name, capability name, field type, entry
  kind, level, reason code of a result, or tool family. The list of
  section 7.1 holds none of step A's parts.

**Step A closes no K item.** Section 7.1 holds a head that adds to
the kernel and names no K item that it closes. The two levels passed
with an owner's decision and a ruling. Step A needs the same. It adds
nothing to K1's count and nothing to K4's list. It adds one form,
`current`, to each copy of the grammar that K5 names. The function
`expectedKeys` gives the judge and the clients one rule for the keys.

**Compatibility review, for section 7.2.** Step A makes the validator
accept declarations that it refused. It refuses no declaration that
it accepted. A definition with no part keeps its bytes and its
meaning. No scope pins a definition with the part, because each
earlier validator refused it.

**Promise 3** gains the part: "The optional parts `level`, `capacity`
and `admission` carry their own versions."

Hugh decides these items. Each has this note's recommendation.

1. **The carrier: a versioned part and one act member** (section 6).
   The environment note recommended a part and left the act form as
   it is. This note puts the list in the act, for the reasons of
   section 6.
2. **The install gate at the pins of the reference field** (section
   7). The other choice is no gate: each room installs the part when
   its Worker has the code.
3. **The narrow scope of version 1** (section 3, check 3): no
   platform declaration, the recorded level only.
4. **The export `expectedKeys`** (section 5), as one more addition to
   `packages/derive`.
5. **The kernel ruling.** After Hugh's decision, the planner files
   the ruling that sections 7 and 7.1 of the kernel page record, and
   step A2 writes it there.
