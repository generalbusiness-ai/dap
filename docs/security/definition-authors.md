# Definition-author security reference

A definition that validates is well formed under its declared format and the supplied bounds. Validation does not establish that its policy matches the author's intent. A valid definition can allow an authorized actor to proceed without a review, a nonempty set of evidence, or a link between that evidence and the actor.

This reference covers the format `artroom-definition-1` and the extent checks of the rules scope. [Definitions](../scopes.md#definitions) describes every form a definition may use.

## What validation refuses

[`validateDefinition`](../../packages/derive/src/validate/index.ts) returns either a `ValidDefinition` or problems with a `code`, `path`, and `message`. The table lists the refusals that matter for security. The [shape reader](../../packages/derive/src/validate/shape.ts) names every code, and the [validation table](../../packages/derive/test/definition-corpus/validate-table-data.ts) gives positive and negative examples.

| Input or form | Refusal |
|---|---|
| A missing required member, an unknown member or form, or two forms where exactly one is allowed | `shape` |
| A nonempty definition format other than `artroom-definition-1` | `unsupported-definition`. The validator does not fall back to format 1. |
| An unknown item, state, slot, subject, or field, or one of the wrong type | `name` |
| A declared name beginning with `platform:`, or a platform-only mark in a declared definition | `shape`. Only trusted platform data passes the platform option. |
| Lists, nesting, canonical bytes, fields, or derived entries beyond their applicable bounds | `bound`, or the relevant reservation refusal |
| A genesis that names no open act, opens a timed item, or opens a hold | `genesis` or `genesis-timed` |
| An opening that leaves a required slot unset, or a guard that reads the item being opened | `required-unset` or `nascent-guard` |
| Conflicting writes, a later write to a fixed slot, or a state effect that can leave a final state | `conflict`, `fixed`, or `final` |
| A named rule that is not declared, an unsupported profile, or an undeclared capability version | `rule`, `profile`, or `capability` |
| Timed work or settlement reservations that can cycle without a finite reservation | `reserve-unbounded` |

Whether the validator checks rule text depends on the profile table you pass it. The default, `PROFILES`, identifies profiles without loading the expression engine. The scope runtime uses [`RULE_PROFILES`](../../packages/derive/src/rule/index.ts), which also checks rule text, and refuses definitions whose capabilities it cannot derive. So a definition that passes the validator with the default table can still be refused by the runtime.

Validation accepts empty lists where the grammar permits them. It does not infer a missing policy from an action's name. For example, the validator can refuse a state-changing act with no live-state guard as `final`. That refusal does not mean every act needs a guard.

## Guard forms that matter for authorization

[Guards](../scopes.md#guards) lists every guard form and when it holds. The [guard validator](../../packages/derive/src/validate/guards.ts) checks each form's required members and context. These distinctions matter when a definition is an authorization policy:

- `signer` checks membership in named party slots. `notIn` checks exclusion. It does not require a member to be present.
- `count` requires a `min`, a `max`, or both. Zero is a valid minimum. A bound read from an empty or noninteger value fails at judgment.
- `each` accepts an empty list. `has` needs an element that passes. A filter can leave `each` with nothing to check.
- `anyOf: []` is invalid. An alternative is itself a guard list, so an empty alternative adds no restriction.
- `ifPresent` requires a guard that names a field or a presented fact. When the named value is absent, the applicable guard passes without checking its usual condition.
- `reason` supplies a refusal name. It does not change whether the guard passes.

The [guard evaluator](../../packages/derive/src/guards.ts) has three results: pass, fail, or not judged because required evidence or work is unavailable. An unfinished scan is never proof of absence. A completed false guard refuses the input even when another guard could not finish.

## Fail-open authoring list

Here, *fail-open* means that a valid declaration imposes less policy than its author may expect. It does not mean that the scope accepts an invalid signature, an unavailable dependency, or an exhausted work limit.

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
| `{ "fact": { "field": "proof", "where": [] } }` | The referenced entry has a kind and definition name that the field's fact type allows. The reference is still checked against its entry. | No field in that entry is tied to this actor, item, or request. |

The `each` example assumes `names` is a declared list field. The optional-proof example assumes `presents.proof` declares its `kind`, `under`, and `required: false`. The `notIn` example assumes an existing subject with the party slot `authors`. It is not valid in a handler, which has no signer. The last example assumes `proof` is a declared fact field.

An empty `fact.where` does not bypass reference verification. [`readFacts`](../../packages/derive/src/fields.ts) checks scope, incarnation, position, and hash. The guard then checks `kind` and `under`. However, `under` is a definition name, not a restriction to one scope. A valid entry of that kind is not by itself proof that its performer is this signer.

A field-based fact condition can state that relationship. This fragment comes from the lane-assignment test. There, `proof` has the fact type `kind: ["assign"]`, `under: "lane"`:

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

With a positive threshold, an action held by all roles broadens who can count as a reviewer. It does not remove the distinct-member and author exclusions. `ownerMayReview` affects whether an authoring agent's controller may count outside the `rules` extent. If nobody holds the approver action, no review can count toward a positive threshold. A zero threshold requires nobody to hold it.

A well-formed path pattern is not proof that it matches an intended path. Unmatched paths use the catch-all extent. These choices need review against the actual role table, changed paths, checks, and pinned rules version.

## Authority and evidence boundaries

For an ordinary act of a declared definition, the [act judge](../../packages/derive/src/judge.ts) requires a current grant for the act's declared action and target scope before deriving its guards and effects. An empty or vacuous guard does not create that grant. Platform grant rules are trusted, version-pinned code. Some of them let an act take effect without a member-valued signer. Genesis has its own seed, signature, and creator-source checks, rather than inheriting an ordinary act's grant check.

Definition validation alone neither proves a genesis nor authorizes a credential read. The runtime checks the requesting key's session, one-time disclosure, expiry, and private custody of a read token ([read-token tests](../../packages/scope/test/read-token.test.ts)). A definition author cannot use a definition to obtain another key's credential or to bypass those runtime checks.

## Tests

[Test dap](../testing.md) describes where the validator, evaluator and extent tests live and how to run them.

## Source

Checked against main `5dc9765f` on 30 October 2026. Sources: [validate/index.ts](../../packages/derive/src/validate/index.ts), [validate/shape.ts](../../packages/derive/src/validate/shape.ts), [validate/format-1.ts](../../packages/derive/src/validate/format-1.ts), [validate/guards.ts](../../packages/derive/src/validate/guards.ts), [guards.ts](../../packages/derive/src/guards.ts), [judge.ts](../../packages/derive/src/judge.ts), [extents.ts](../../packages/platform/src/extents.ts).
