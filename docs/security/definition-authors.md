# Definition-author security reference

A definition that validates is well formed under its declared format and the supplied bounds. Validation does not establish that its policy matches the author's intent. A valid definition can allow an authorized actor to proceed without a review, a nonempty set of evidence, or a link between that evidence and the actor.

This page describes `artroom-definition-1` and the current extent checks. It documents existing behavior; it does not change the definition format, platform versions, grants, or deployment settings. [Definitions are data](../scopes.md#definitions-are-data) describes the broader model.

## What validation refuses

[`validateDefinition`](../../packages/derive/src/validate/index.ts) returns either a `ValidDefinition` or problems with a `code`, `path`, and `message`. Its checks include the following refusals:

| Input or form | Refusal |
|---|---|
| A missing required member, an unknown member or form, or two forms where exactly one is allowed | `shape` |
| A nonempty definition format other than `artroom-definition-1` | `unsupported-definition`; it does not fall back to format 1 |
| An unknown item, state, slot, subject, or field, or one of the wrong type | `name` |
| A declared name beginning with `platform:`, or platform-only marks submitted as a declared definition | Refused by the declared-definition checks; the platform option belongs to trusted platform data |
| Lists, nesting, canonical bytes, fields, or derived entries beyond their applicable bounds | `bound`, or the relevant reservation refusal |
| A genesis that names no open act, opens a timed item, or opens a hold | `genesis` or `genesis-timed` |
| An opening that leaves a required slot unset, or a guard that reads the item being opened | `required-unset` or `nascent-guard` |
| Conflicting writes, a later write to a fixed slot, or a state effect that can leave a final state | `conflict`, `fixed`, or `final` |
| A named rule that is not declared, an unsupported profile, or an undeclared capability version | `rule`, `profile`, or `capability` |
| Timed work or settlement reservations that can cycle without a finite reservation | `reserve-unbounded` |

This is a security-oriented subset, not the complete diagnostic list. The [shape reader](../../packages/derive/src/validate/shape.ts) names the codes; the [validation table](../../packages/derive/test/definition-corpus/validate-table-data.ts) gives positive and negative examples.

Rule-text admission depends on the profile table supplied to validation. The default `PROFILES` identifies profiles without loading the expression engine. The Scope runtime uses [`RULE_PROFILES`](../../packages/derive/src/rule/index.ts), which also checks rule text, and refuses definitions whose capabilities it cannot derive. A direct call to the validator with its default profile table is not evidence of runtime admission.

Validation accepts empty lists where the grammar permits them. It does not infer a missing policy from an action's name. For example, removing the live-state guard from a state-changing act can be refused as `final`; that does not mean every act must have a guard.

## Allowed guard forms

The [guard validator](../../packages/derive/src/validate/guards.ts) accepts `state`, `signer`, `notIn`, `set`, `unset`, `equals`, `differs`, `some`, `none`, `count`, `every`, `fact`, `before`, `after`, `rule`, `each`, `has`, `anyOf`, `distinct`, `sameSet`, and declared `capability` forms. Each form has its own required members and context checks. `of`, `ifPresent`, and `reason` are optional only where their checks permit them.

Some distinctions matter when a definition is used as an authorization policy:

- `signer` checks membership in named party slots. `notIn` checks exclusion; it does not require a member to be present.
- `count` requires a `min`, a `max`, or both. Zero is a valid minimum. A bound read from an empty or noninteger value fails at judgment.
- `each` accepts an empty list. `has` needs an element that passes. A filter can leave `each` with nothing to check.
- `anyOf: []` is invalid. An alternative is itself a guard list, so an empty alternative adds no restriction.
- `ifPresent` requires a guard that names a field or a presented fact. When the named value is absent, the applicable guard passes without checking its usual condition.
- `reason` supplies a refusal name. It does not change whether the guard passes.

The [guard evaluator](../../packages/derive/src/guards.ts) has three results: pass, fail, or not judged because required evidence or work is unavailable. An unfinished scan is not treated as proof of absence. A completed false guard refuses the input even when another guard could not finish.

## Fail-open authoring list

Here, *fail-open* means an allowed declaration imposes less policy than its author may expect. It does not mean an invalid signature, unavailable dependency, or exhausted work limit is accepted.

The examples below are fragments. Their field, item, state, and party names must be declared in a surrounding definition with the matching types. They are not complete installable definitions.

| Allowed form | What it actually establishes | Missing policy |
|---|---|---|
| `guards: []` | No additional guard condition. Other act, authority, field, and capacity checks still apply. | No ownership, evidence, or review condition is inferred. |
| A non-`rules` extent with `approvals: 0` | Zero counted reviews meet the approval threshold. Required checks and other extent obligations still apply. | No independent review is required by that threshold. |
| An extent whose `approver` action is held by every role | Any otherwise eligible reviewer holding that action can count. | The action's spelling does not restrict review to a specialist role. |
| `{ "count": { "type": "job", "states": ["passed"], "min": 0 } }` | The count needs no positive witness. An exact count of zero meets the minimum. | It does not require a passed job. |
| `{ "each": { "list": { "field": "names" }, "as": "n", "guards": [] } }` | All selected elements pass an empty guard list. An empty or absent optional list also passes. | It requires neither an element nor a condition on one. Even meaningful nested guards do not require the list to be nonempty. |
| `{ "fact": { "presented": "proof" }, "ifPresent": true }` | A supplied proof is checked, but an absent optional proof skips this guard. | It does not require evidence to be presented. |
| `{ "notIn": ["authors"] }` | Neither the signer's member nor its principal is in `authors`. With no such signer identity, both exclusion tests pass. | It does not establish identity, membership, or permission to review. |
| `{ "fact": { "field": "proof", "where": [] } }` | The referenced entry has a kind and definition name admitted by the field's fact type. The reference is still checked against its entry. | No field in that entry is tied to this actor, item, or request. |

The `each` example assumes `names` is a declared list field. The optional-proof example assumes `presents.proof` declares its `kind`, `under`, and `required: false`. The `notIn` example assumes an existing subject with the party slot `authors`; it is not valid in a handler context that has no signer. The last example assumes `proof` is a declared fact field.

An empty `fact.where` does not bypass reference verification. [`readFacts`](../../packages/derive/src/fields.ts) checks scope, incarnation, position, and hash. The guard then checks `kind` and `under`. However, `under` is a definition name, not a restriction to one scope. A valid entry of that kind is not by itself proof that its performer is this signer.

A field-based fact condition can state that relationship explicitly. This fragment comes from the existing lane-assignment witness; `proof` has fact type `kind: ["assign"]`, `under: "lane"`:

```json
{
	"fact": {
		"field": "proof",
		"where": [
			{ "equals": { "a": { "field": "performer" }, "b": { "signer": true } } }
		]
	}
}
```

This comparison constrains the named entry's `performer` field. It does not replace the target act's grant check. Likewise, `has` or a positive `count.min` can express existence where universal checking with `each` alone cannot.

## Extent thresholds and reviewer eligibility

Extent records are rules content, not guard objects. [`isExtents`](../../packages/platform/src/extents.ts) accepts integer approvals from 0 through 64 and a syntactically valid action name for `approver`. It does not compare that name with the role table during shape validation.

For example, this valid extent record requires no review:

```json
{
	"name": "docs",
	"patterns": ["docs/**", "**/*.md"],
	"approvals": 0,
	"approver": "change.review",
	"checks": [],
	"class": "content"
}
```

It is a fragment of a complete extent list. Publishing the complete list must retain the protected `rules` extent, including its fixed patterns, at least one approval, `rules.publish` approver, and `authority` class. The list must also have exactly one catch-all extent. The `rules` minimum cannot be lowered to zero by this example.

With a positive threshold, an action held by all roles broadens who can count as a reviewer. It does not remove the distinct-member and author exclusions. `ownerMayReview` affects whether an authoring agent's controller may count outside the `rules` extent. An unknown approver action held by nobody cannot supply a positive review threshold; a zero threshold still requires nobody to hold it.

A well-formed path pattern is not proof that it matches an intended path. Unmatched paths use the catch-all extent. These choices need review against the actual role table, changed paths, checks, and pinned rules version.

## Authority and evidence boundaries

For an ordinary act of a declared definition, the [act judge](../../packages/derive/src/judge.ts) requires a current grant for the act's declared action and target scope before deriving its guards and effects. An empty or vacuous guard does not create that grant. Platform grant rules are trusted, version-pinned code; some can admit an act without a member-valued signer. Genesis has its own seed, signature, and creator-source checks, rather than inheriting an ordinary act's grant check.

Definition validation alone neither proves a genesis nor authorizes a credential read. The [native read-token witness](../../packages/scope/test/read-token.test.ts) checks the requesting key's session, one-time disclosure, expiry, and private custody. Its Git hosts are stand-ins. Nothing on this page gives a definition author another key's credential or bypasses those runtime checks.

## Existing witnesses and their limits

These are references to existing assertions, not a report of a new run for this page:

| Source | Named witness or table | What it covers |
|---|---|---|
| [Definition format tests](../../packages/derive/test/definition-format.test.ts) | `unknown formats refuse with their actual name and never invoke a profile` | Unsupported formats do not select format-1 checks. |
| [Validation tests](../../packages/derive/test/validate.test.ts) and their [table](../../packages/derive/test/definition-corpus/validate-table-data.ts) | `the definition validator` table | Declared positive examples and explicit refusal codes, including unknown forms, names, bounds, fixed slots, and nascent guards. |
| [List-guard tests](../../packages/derive/test/forms-guards.test.ts) and their [rows](../../packages/derive/test/definition-corpus/forms-guards-variants.ts) | The `anyOf`, `has`, and `each` three-result case | Empty `each` passes, empty or absent `has` fails, filters omit elements, and incomplete scans stay incomplete. |
| [Presented-fact tests](../../packages/derive/test/forms-beside.test.ts) | `a presented fact is fetched and checked like a fact field, a guard ties it to the signer, and the entry records it and uses it; one that is absent skips its guards` | The optional proof can be absent; a supplied proof is checked against the signer. |
| [Judgment tests](../../packages/derive/test/judge.test.ts) | `a report after a handover is attributed to both performers, both holders and their principals` | Authors and their principals are excluded by `notIn`; an eligible outsider is not. This does not test a missing signer. |
| [Extent tests](../../packages/platform/test/extents.test.ts) | `a list of extents is 1 to 8 records of exactly six members, inside the bounds of each: a name of lowercase letters, digits and hyphens, a pattern with no empty name and no control byte, and bounds that count bytes` | Shape validation accepts zero approvals. Extent judgments in this file use explicit input data, not native scope execution. |
| [Rules-scope tests](../../packages/platform/test/rules-scope.test.ts) | `publish keeps the extents that it states, whole, and the scope holds them; a list outside the bounds of an extent is refused bad-field; one without the fixed minimum of the rules extent, without exactly one extent that has no pattern, or with a check that the act does not hold is refused by name` | A zero-approval docs extent publishes, while the protected rules minimum and catch-all checks remain. These are pure platform judgments. |

The zero minimum, missing-signer exclusion, and empty fact-condition behavior above follow the cited validator and evaluator branches. This page does not claim a separate dedicated runtime witness for each combination or prove that any deployed definition uses it. It also does not claim that validation checks an author's intent or replaces review of a definition's effects, sends, and authority.
