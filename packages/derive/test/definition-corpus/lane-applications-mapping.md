# Lane application corpus

These 33 named rows cover six source lane exports, the native scenario's office,
the custom required-rules input in each of its two callers, the foreign-hold
fixture, and five explicit native validation contexts, plus 18 positive shape-bound contexts. The six source exports
keep their existing literal pins. Their retained JSON counterparts remain
separate rows in `shipped.ts`.

The office literal and the custom mutation moved into the shared pure module
`apps/room/lanes/test/support/definition-corpus-data.ts`. Existing callers still
validate at their original points. The office's creation digest fields and
callback order are unchanged. The custom declaration is valid even though the
fixed CLI workflow refuses its newly required input.

The foreign-hold fixture is already pure and remains unchanged. Its declaration
is used by actual lane creation and replay; refusal of another consumer or a
package graph does not make it a validator-negative case.

Native rows preserve the actual directory/partition cohort aliases and pins,
explicit `PROFILES`, `platform: true`, and each direct validator's bounds.
They are distinct from the catalog rows that use `RULE_PROFILES` and owner
outcome domains. Runtime quota changes made after definition validation remain
in their existing tests; these rows do not claim to enumerate measured quotas.

The separate lane security/edit shard covers declaration variants in
`declared-name-origin.scope.test.ts` and `edit.scope.test.ts`. Scenario state,
scripted entries, malformed requests, and reply-loss controls are unchanged.

This is a source inventory, pending corpus validation and the ordinary gate.

The shape-bound matrix is shared with `definitions.test.ts`: six separate
Issue bounds, ten Change bounds, and `listElements: 32` for each declaration.
Every row changes one bound only and retains its literal pin. The one-less
cases and the `entryBytes: 1` probes are deliberately invalid and remain only
in the owning test. Native `RULE_PROFILES` contexts for the six source lanes
are registered separately in `shipped.ts`.
