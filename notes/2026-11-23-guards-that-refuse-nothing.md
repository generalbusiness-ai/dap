# Report a guard that refuses nothing

Status: current. Hugh asked for this note on 23 November 2026, read
draft 1 and said "ok by my review". The checker approved draft 2 in
review `9f6bdb85`. The note landed as main `f3f0fa9a` for request
`8b418656`. Nothing is built, and the decisions of section 7 are open.

A dap author writes guards to state who can do what, and when. The
validator accepts a guard that is well formed. It does not ask whether
the guard can refuse an act. The
[definition-author reference](../docs/security/definition-authors.md#fail-open-authoring-list)
lists eight valid forms that impose less policy than their author can
expect, such as `guards: []` and a `count` with `min: 0`. An author must
read that page and compare each row with the definition by eye.

This note makes the comparison a report.

**Guarantee.** `dap check` names each guard that refuses no act, by its
form or in the stated model, and each act that has no guard.

Two mechanisms give the report. The first reads the declaration. The
second counts the refusals of a
[history search](2026-11-23-history-search.md). Each has its own time of
use.

## 1. Mechanism one reads the form

The first mechanism reads the declared definition and nothing else. It
runs no judge and needs no model. Each rule matches one form.

| Form | Finding | What the report says |
|---|---|---|
| An act with an effect or a send, and no guard | `no-guard` | Every signer who holds the act's action can do the act. |
| `count` with `min: 0` and no `max` | `count-accepts-all` | The guard holds for every count. |
| `each` with no nested guard | `each-accepts-all` | The guard holds for every list. |
| `fact` with `where: []` | `fact-unbound` | The entry has the declared kind. No field of it is tied to this signer, item or act. |
| `ifPresent` on the act's only guard of a field or a proof | `evidence-optional` | An act without the value skips the guard. |

The rules come from the fail-open list. Three rows of that list stay
outside this mechanism:

- `notIn` needs to know who can sign.
  [The authority table](2026-11-23-authority-table.md) reports it.
- The two extent rows, `approvals: 0` and an approver action that every
  role holds, are content of a room's rules scope. They are not part of a
  definition.

**Lending gives one finding.** The act `publish` of the
[lending definition](../examples/lending/definition.ts) has one send and
no guard. A member who holds `lending.member` can publish any text at the
page of any thing. The report prints:

```
lending  acts.publish  no-guard  warning
  Every signer who holds lending.member can do publish.
```

The author decides whether the definition intends that. This note does
not decide it.

The finding does not list every act that writes a shelf page. `borrow`,
`return` and `cancel` each send a `content` field that the signer
supplies, and each has a guard. The
[authority table](2026-11-23-authority-table.md) lists every act that
sends to the page.

## 2. Mechanism one runs when the author checks or packs

- **`compile`** in `packages/define` returns `findings` today
  (`packages/define/src/index.ts:641`). The list has one rule, about the
  names that a rule expression reads, and `compile` stops on each finding
  of that rule. The five rules extend the same list. A `Finding` gains a
  severity, and `compile` does not stop on a warning.
- **`dap check`** and **`dap pack`** print each finding as a row with the
  definition, the row, the check, the severity, the reason and the
  message. [Package reference](../docs/package-reference.md) describes
  that row format, and `unowned-bound` is a warning of the same kind
  today.

A finding is a warning. It never stops validation, a pack or an
installation, for two reasons. Each form is a legitimate declaration: an
act that every member can do in every state is a real design. And
[kernel section 7.2](../docs/kernel.md#72-definition-format-validation)
binds the validator to the definition format, so a new refusal needs a
new format.

The runtime never runs this mechanism. A scope judges acts and does not
judge its definition's intent.

**The author answers a finding with one sentence.** The sentence sits in
the properties file beside the definition, under the path of the row:

```ts
intended: { "acts.publish": "Any member can write a shelf page's text. borrow, return and cancel also write it." }
```

The report then prints the row as answered, with the sentence. Without
this answer, the same warning prints on every run and the author stops
reading the report.

No check compares the sentence with the declared forms. The sentence is
the author's word, and the report marks it as such.

## 3. Mechanism two counts the deciding guard

The form of a guard does not show every guard that refuses nothing. A
guard can be well formed and still never decide a refusal, because an
earlier guard always fails first, or because no reachable state fails
it.

The judge already names the guard that decides each refusal. A refusal
with `guard-failed` carries `detail: guards.<n>`
(`packages/derive/src/program/body.ts:62`). The history search keeps
every answer. So the second mechanism is a count: for each act and each
guard, the number of refusals that the guard decided.

After the search, the report gives two findings.

| Finding | Meaning |
|---|---|
| `never-decides` | The guard decided no refusal in the model. |
| `never-takes-effect` | No candidate of the act took effect in the model. |

`never-decides` has two possible causes, and the author must look in
both cases.

1. The guard is vacuous, or an earlier guard hides it.
2. The model lacks the actor or the choice that the guard refuses. Then
   the application's scenarios also lack that refused path.
   [Write an application](../docs/write-an-application.md#write-scenarios)
   asks for it: "Include the refused path that distinguishes the
   invariant".

The count has one limit. `guards.<n>` names a guard of the act's own
list. It does not name a guard nested in `anyOf` or `each`. A nested
guard gets no count in the first version.

This mechanism is not a mutation sweep. It removes no guard and runs no
second search. Hugh's rule of 3 October 2026 against a mutant for each
guard stands (request `ecbc722a`).

## 4. Mechanism two runs only where a model exists

- **`dap check`** runs it when the package states a model, in the same
  search that evaluates the
  [declared properties](2026-11-23-declared-properties.md).
- **`dap pack`** runs it under the same condition.
- It does not run at installation and it does not run in a scope.
- It does not enter `npm run gate` before the measurement of the history
  search note.

## 5. Kernel placement

Both mechanisms sit in `packages/define` and the CLI. No file and no
export enters `packages/contract`, `packages/derive` or `packages/bytes`.
The validator does not change, and no definition changes its digest.

## 6. Steps

1. **Count first.** A scratch script applies the five rules of section 1
   to the six authored definitions and to the corpus in
   `packages/derive/test/definition-corpus/`. It reports the findings of
   each rule. A rule whose findings are mostly intended does not ship.
2. **Mechanism one**, with the `intended` answer. Witness: the Lending
   finding of section 1, and one definition for each rule.
3. **Mechanism two**, after the history search exists. Witness: a
   planted second `state` guard that repeats the first is reported as
   `never-decides`.

## 7. What Hugh decides

1. Whether a finding stays a warning in every case, as section 2 says.
2. Whether the author's answer lives in the properties file.
3. Whether step 1 starts before the history search is measured. It does
   not depend on the search.
