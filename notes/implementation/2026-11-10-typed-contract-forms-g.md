# Typed contract forms: G source preparation

Request `f682cbc46d28df9029418272616bf0f4ead29dc7` covers the remaining
Define builder witnesses, missing contract forms, and exact authored Grow
and lane definitions. Promise `39da96860e62eaad1dc05da05a3772d3389bbe33`
covers this builder work. Planner ruling
`88cf23c309a7fc7085cc0590d47f6bdf051f637b` opens items 2 and 3 for source
work before F lands. Item 1 waits for F's canonical spelling changes.

## Missing forms

`reference(fragment)` emits `{ type: "reference", fragment }` as plain
contract data. The helper preserves the literal numeric bound. The real
validator checks that bound; the helper adds no admission policy.
`field-types.ts` holds the helper, and the existing package root exports
it. This change adds no package subpath or alias requirement.

Two existing builders now expose the remaining optional forms. A second
`isFact` argument supplies the comparisons of a field fact. Its overload
rejects that argument for presented facts and bound elements. `sameSet`
accepts `where` and `except` in its options and passes them to `range`.
The typed filter exposes the scanned item's declared slot names. Calls
that omit these options retain their previous output shapes.

## PD-2 form mapping

This inventory maps the current declared contract in
`packages/contract/src/definition.ts` to the authoring API. A represented
form can still refuse validation in an unsupported context or with an
invalid bound. Platform-only definitions remain outside the authoring API.

| Contract family | Authoring form |
| --- | --- |
| Definition format, name, profile, genesis, rules, capabilities | `define`; its supported restricted profile; inline `rule` or the `rules` option; explicit `capabilities` |
| Durability and capacity | `define` options `level` and `capacity` |
| Text, detached text, integers, booleans, times, enums | `text`, `detached`, `int`, `bool`, `time`, `enumOf` |
| Members, local items, facts, scopes, citations | `member`, `itemOf`, `fact`, `scope`, `reference` |
| Digests, commits, trees, records, lists | `digest`, `commit`, `tree`, `record`, `list` |
| Required, optional, and defaulted fields | `required`, `optional`, `withDefault` |
| Item cardinality, initial and final states | `item` options `many`, `initial`, and `states`; `live`, `final` |
| Party, value, and reference slot modes | `party`, `value`, and `ref`: fixed, once, required, optional; `party.list` |
| Authorship, capability ownership, value defaults | `author`, `owned`, the `value.required` start argument |
| Open, transition, comment, presented facts | `open`, `transition`, `comment`, `presented` |
| Other local subjects | `by`, `via`, `one`, and dependent `siblings` |
| Tell, relate, and advisory handlers | `receive`, including `from`, `opens`, `copies`, `order`, and `late.then` |
| Item, copy, and marker settlement | Subject `settles`, `settlesCopy`, subject `settlesBy` |
| Field, presented-fact, slot, element, and item reads | Context `f`, `p`, subject `slot` and `id`, `el`, `elements`, `elementMember`, `eachItem` |
| Signer, sender, source, update, and result reads | `signer`, `sender`, `source`, `update`, `resultReason` |
| Scope, intent, absence, and constant reads | `theScope`, `theIntent`, `nothing`, `constant`; primitive literal arguments |
| Every entry part and compound reference part | `part` and `source` accept the contract's `Part` and `EntryPart` arguments |
| Ranges and comparisons | `range` with `where` and `except`; `equals`, `differs` |
| State, signer, signer exclusion, presence, and clock guards | Subject `in`, `signer`, `notSigner`, `set`, `unset`, `before`, `after` |
| Range and list quantifiers | `some`, `none`, `count`, subject `every`, `each`, `has`, `distinct`, `sameSet` including range `where` and `except` |
| Fact and rule guards | `isFact` including field-fact comparisons, `rule` |
| Alternatives, optional guards, refusal names | `anyOf`, `ifPresent`, `require` |
| Conditional effects and sends | `when`, and send `if` arguments |
| State, party, reference, value, and clock effects | Subject `to`, `party`, `add`, `remove`, `ref`, `value`, `take`; `self`, `now`, `plusSeconds` |
| Attribution and its four further source forms | Subject `attribute`; `authorsOf`, subject `authors`, `authorsIn`, `authorsFrom` |
| Hold, redaction, and capability effects or guards | Subject `hold`, `redact`, `capability`; `permit`, `eachOf`, `slotsOf`, `invoke` |
| All send sources and send kinds | `self`, ordinary operands, `collect`; `create`, `tell`, `relate`, `index` |
| Every request result clause | The send's `result` record; `conflict` remains creation-only at validation |
| Notices and timed rules | Subject `notify`, body `attention`, `timed` |

The table records source representation. It does not claim that the full
PD-2 acceptance is complete. Exact Grow, Change, and Issue witnesses and
their regeneration check still wait for item 1 after F lands.

## Validator witnesses

The new whole owner `packages/define/test/contract-forms.test.ts` declares
twelve cases. Each compiles a small made-up definition through the existing
validator and checks a plausible invalid counterpart at that same boundary.

| Invariant | Refusal counterpart |
| --- | --- |
| A signed act can redact detached text | Ordinary text and a handler cannot redact |
| `every`, signer exclusion, and `some` use declared item lists | Unknown states and non-item lists refuse |
| `collect` and `authorsOf` resolve bounded range members | Unknown members and non-party attribution sources refuse |
| Field defaults match optional field types | Wrong default types and required defaults refuse |
| A settlement mark starts false and only writes true | False writes and true defaults refuse |
| Update reads belong to relate handlers | A tell handler has no update |
| Result reasons belong to result clauses | The sending act has no result |
| Timed attention accompanies a total exit | A timed notice cannot have a condition |
| Explicit level and capacity retain their own bytes | Unsupported durability refuses |
| Citation fragments retain a bounded type | A fragment bound above 65,536 bytes refuses |
| Field facts can match foreign input fields | A non-field left read refuses |
| `sameSet` filters and excludes its range before matching keys | An undeclared excluded subject refuses |

The separate type fixture preserves the literal citation bound and rejects
a text argument. It also rejects comparisons on non-field facts and an
undeclared slot in a set's filter. Existing suites retain their cases and
assertions.

## Validation status

All new compiler, validator, and gate checks remain **UNRUN**. Source
preparation changes no kernel, pin, generator, dependency, normalization,
or compile implementation. Root will book the focused checks and the one
final gate after the remaining source work and main integration.
