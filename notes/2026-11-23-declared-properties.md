# State a guarantee beside the definition

Status: draft for Hugh's review, 23 November 2026, under request
`8b418656`. Nothing is built.

A dap definition states what each act needs and what each act changes.
It does not state what the author expects to stay true. That expectation
lives in a sentence, in the invariant table of
[Write an application](../docs/write-an-application.md#put-each-invariant-where-it-lives),
and in the assertions of chosen tests.

A cryptographic protocol is written in two texts. One text is the
mechanism. The other text is the property, for example "each accepted
session has a matching start". A tool compares the two for every run of
the mechanism. This note gives a dap definition its second text.

**Guarantee.** A named property holds in every state that the model's
cast can reach within the model's length.

The [history search](2026-11-23-history-search.md) supplies those states.
Each name in a code block is a sketch.

## 1. What this note changes in the 21 November design

The [21 November note](2026-11-21-property-based-testing.md) decides how
dap tests one guarantee over histories. Its case is "`lastNumber` equals
the number of fulfilled pledges" in Counting Commitments. This note keeps
its method and changes six parts.

| Part | 21 November design | This note |
|---|---|---|
| The histories | The author writes two loops over four resolutions: 16 pairs. | The history search enumerates every history of the cast to the length. The 16 pairs are among them. |
| The step driver | The test chooses each signer and builds each act (`claimFields`, `resolution`, the clock move for `expire`). | The author writes the choices of the model one time. Every property of the definition uses them. |
| Authority | `act()` gives each actor every grant. The witness does not test who can act. | Each actor has the actions of its role. A refusal for `unauthorized` is in the enumerated set. |
| The guarantee | A sentence in the note and an `expect` in the test loop. | A named property in a file beside the definition. |
| The expected count | A counter in the test loop (`fulfilled++`). | A count of the `fulfill` entries of the journal. It still does not read `lastNumber`. |
| The covered range | Two resolutions before the board finishes, with target three. | Every order to the length: refused pledges, a pause and a finished board when the model reaches them. |

Six parts do not change:

- dap enumerates. It uses no generator library and no shrinking library.
- The order is fixed and needs no seed.
- The test runs the real judges and the real fold in memory.
- A failure names its history.
- A control must show that the test can fail. The control stays the
  write of zero to `lastNumber` in the `fail` effect.
- The native witness stays separate evidence.

Two facts limit the change.

**The cost is not known.** The 16 pairs take 1.2 seconds. The search to
the same depth judges more candidates. The history search note measures
before anything else is built.

**The existing test stays until the search finds the same control
fault.** The search must print the history `fulfill`, then `fail`. Only
then does a head replace the 16-pair test, and that head names the
acceptance case that it moves.

The 21 November note also names three hand-written enumerations: the
settlement ledger, the card histories and the Git framing variants. They
drive other boundaries. This note does not change them.

Ruling `d6aa9122` asks for one guarantee and the smallest mechanism. One
test with two loops is smaller than a shared search. The search is worth
its code only when two or more definitions use it. Section 5 names the
second user.

## 2. A library member reads three guarantees

The [lending definition](../examples/lending/definition.ts) has a `thing`
that is `available`, `lent` or `gone`, and a `reservation` that is `held`,
`lapsed` or `released`. Its author expects three facts.

1. A lent thing has a borrower.
2. A thing on the shelf, or gone, has no borrower.
3. Two held reservations never have the same tool and the same day.

No act states any of them. Each follows from several acts together:
`borrow` sets the borrower, and `return` and `cancel` clear it. A new act
that moves a thing to `lent` and forgets the borrower passes validation
today.

```ts
export const lendingProperties = properties(lending, {
	"lent-has-borrower": always(thing, ({ on }) => [
		when(on.set("borrower"), { if: [on.in("lent")] }),
	]),
	"shelf-has-no-borrower": always(thing, ({ on }) => [
		when(on.unset("borrower"), { if: [on.in("available", "gone")] }),
	]),
	"one-hold-per-tool-day": always(reservation, ({ on }) => [
		when(count(range(reservation, ["held"], { where: held => [
			equals(held.slot("tool"), on.slot("tool")), equals(held.slot("day"), on.slot("day")),
		] }), { max: 1 }), { if: [on.in("held")] }),
	]),
});
```

## 3. Two forms of property

**A state property is a list of guards on an item type.** It uses the
guard forms of the definition: `state`, `set`, `unset`, `equals`,
`count`, `none`, and the `if` and `unless` conditions. The author learns
no second language. A state property is data. It can travel in a package
([properties in the package](2026-11-23-properties-in-the-package.md)).

A state property cannot use a guard that reads the signer, a field or a
clock. A state has none of them.

**A history property is a function of the journal and the view.** The
Counting guarantee compares a slot with a count of entries, and no guard
form counts entries.

```ts
export const countingHistory = {
	"last-number-counts-fulfillments": (entries, view) =>
		view.board.values.lastNumber === entries.filter(inGeneration(view)).filter(kindIs("fulfill")).length,
};
```

A history property is code. It stays in the test files of its
application and does not travel in a package.

Both forms live outside the pinned bytes. A changed property changes no
digest. [Write an application](../docs/write-an-application.md) calls
such a file an annotation: a typed sidecar that uses the definition's
names.

## 4. The judge evaluates a state property

The search evaluates each state property at each state that it reaches,
on each item of the property's type.

It asks the judge. The search adds one act to a copy of the definition
in memory. That act is on the property's item type. Its guards are the
property's guards, and it has no effect. The search judges that act with
`judgeActBody`. An admitted act means that the property holds for the
item. A refusal with `guard-failed` means that it fails, and
`detail: guards.<n>` names the guard.

No scope pins the copy, and its digest appears nowhere. So the guard
validator and the guard evaluator of the kernel read the property, and
the design adds no second evaluator.

The build confirms this route first. If the route needs a new export
from `packages/derive`, the step stops for the review of
[kernel section 7](../docs/kernel.md#7-rule-for-adding-to-the-kernel).

## 5. What a failure prints

A planted act `lend-again` moves a thing to `lent` and sets no borrower.
The search prints:

```
lending: lent-has-borrower fails at guards.0
  item thing 1, state lent
  history: ada donate, ben lend-again
```

The history is a shortest one, because the search enumerates shorter
histories first.

A pass prints the model beside the result: the cast, the length and the
count of histories. A reader sees the bound each time.

The first two users are Lending, with the three properties of section 2,
and Counting Commitments, with the history property of section 3.

## 6. What a pass does not claim

- A history longer than the model's length, or a larger cast.
- A room whose membership gives roles other actions than the package's
  `roles`. [The authority table](2026-11-23-authority-table.md) covers
  that change.
- Another scope, a capability, a platform definition or the host. The
  history search note lists these limits.

## 7. Steps

1. The measurement of the history search note.
2. State properties: the `properties` and `always` helpers in
   `packages/define`, and the judgment of section 4. Witness: Lending's
   three properties pass, and a planted act that moves a thing to `lent`
   with no borrower fails `lent-has-borrower` with its history.
3. History properties: the Counting guarantee as a function, with the
   control of the 21 November note.
4. `dap check` runs the properties of a package that states a model.

## 8. What Hugh decides

1. Whether a shared search passes the bar of ruling `d6aa9122`, or the
   21 November form stays the only form.
2. Whether a state property uses guard forms only, as section 3 says.
3. Whether the 16-pair test goes when the search finds its control fault.
