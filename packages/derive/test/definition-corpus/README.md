# Register a positive definition

Add a row to this corpus when a shipped app, example, fixture, or recorded history introduces a complete declared definition. The owning test is [`definition-corpus.test.ts`](../definition-corpus.test.ts). The registry is [`index.ts`](index.ts).

1. Give the row a stable name that identifies the declaration and its validation context.
2. List each existing caller in `origins`. Keep aliases when several callers use the same bytes and context.
3. Supply the original raw declaration through `declaration()`. Move a local literal or mutation into a pure helper shared with its original caller. Keep the original validation wrapper and assertions.
4. Copy the caller's `bounds`, `profiles`, and `options` exactly. Omit optional arguments when the caller omits them. Register a separate row when the context differs, even if the bytes match. If the full bound combination depends on measured history sizes, map that combination to its owning runtime witness. Do not replace its measured fields with defaults to create a corpus row.
5. Set `expectedDigest` when the existing caller or generated catalogue declares a pin. Do not change a pin to make the corpus pass.
6. Add the origin and any exclusions to the owning mapping file. Register the shard export in `index.ts`.

Do not validate declarations while a shard loads. Keep JSON reads and constructor calls inside `declaration()`. Do not import a test file to obtain its local data. A declaration may be valid even when its package, delivery, graph, authority, or history is deliberately refused.

Keep intentionally malformed declarations, future unsupported forms, and partial presentation objects outside the positive corpus. Record the exact source and refusal reason in the coverage ledger. Do not replace a refused declaration with a different example.

History-dependent declarations can use an asynchronous thunk when their literal fields contain actual signed facts. `historicalOperandProbeData()` is the current exception: it reconstructs the original pure Scope history inside its named test. Its existing fixture validation is a prerequisite, not proof that its final declaration passed. No history runs while the corpus loads.

The allocated owning check runs the whole corpus. The stricter-format control selects only `^pinned definition corpus: 'derive/shared/small'$`. That row reads raw `small` bytes without a validated fixture prerequisite. The control temporarily adds a stricter name check to format 1, requires that named assertion to fail, and restores the original source. It does not alter a pinned definition or run a mutation sweep.
