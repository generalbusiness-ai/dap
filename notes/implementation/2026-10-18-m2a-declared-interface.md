# M2a declared projections and generic views

Preparation under Source child `823817ed` and promise `63dc4e4e`, within
M2a `b6aaa3ce` and parent promise `9ebca0a5`. M1 install review `b21d8603`
remains with checker at frozen `432dab40`. This separate checkout starts
from that code as a preparation base. Delivery waits for completed M1 and
reconciliation against its actual audited Main.

The private dependency namespace is an APFS COW copy. Its 13 first-party
links resolve inside this checkout, and all 106 installed versions match the
lock. No package was installed. Only copied caches were removed; M1's source
and dependency view remain frozen. The read-only audit is
`/tmp/artroom-m2a-interface-dependency-view-20261018.json`.

## Boundary and first preparation

M1's package decoder and Rules5 judgment remain strict. New projection and
view syntax must use a separate versioned wire surface. Widening a shared
legacy decoder would change the judgment of an existing native pin.

The first bounded declaration parser names a definition, its item sources,
selected native value, party and reference slots, their types, and native
revision metadata. It owns and freezes input. It admits no getter or code,
and it cannot hide native id, state, type or revision behind a field alias.
Two owning codec cases pass at this preparation (`70473`, terminal `eed5c4`,
exit 0), with source and test typechecks. They distinguish caller mutation,
unknown syntax, metadata shadowing, invalid read bounds and getter access.
The raw result is `/tmp/artroom-m2a-projection-codec-20261018.log`.

The next preparation binds the declaration to the exact native definition
digest, item states, slot kinds, full field types and required/optional
status. Party lists retain their declared member bound. Detached text is
not an inline value and this first binding refuses it. Native whole-definition
validation and read authorization remain separate requirements. Two owning
binding cases pass (`6823b1`), and source/test typechecks pass. Removing the
field-type comparison makes the intended assertion fail at the widened text
bound (`57eade`); the source was restored. This is a focused control, not a
mutation sweep or a runtime acceptance claim.

It does not yet bind fields to a native schema, read any journal, authorize a
viewer, install a package, or render a view. Those remain implementation work.

The following acceptance remains owed: shared host/MCP/kit projection bytes
and revision, presentation declarations and generic kinds, model-facing
fallback and identity with view-only data, current-revision and held-action
enforcement, Grow alert/grid declarations, Counter/Lending migration, named
native witnesses and paired controls, the final gate, review and landing.
Several-scope birth remains the parent task's separate acceptance. No hostile
package containment, presentation update, device command or deployment is
claimed.
