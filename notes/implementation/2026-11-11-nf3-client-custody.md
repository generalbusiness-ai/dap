# Client owns request custody

NF3 moves the complete `Custody` owner, its record types, `decisive`, and `memoryStore` from MCP to Client. `CustodyStore` is the one custody port, and Client owns it. Client also owns the file store and its locks through the source-only `@generalbusiness/dap-client/node` entry. MCP keeps its SQLite store, its server transports, and its metrics vocabulary. The browser SDK exports only its root and application entries. The release guards omit `src/node.ts` and reject emitted Node output.

This head starts from the NF2 head `95ff9a43` merged with main `fb354651`. It keeps every NF2 behaviour and changes only custody ownership and the imports that follow it.

## The stored vocabulary stays the same

Record phases are `prepared`, `sent`, `unknown`, `accepted`, `archived`, `refused`, `mismatch`, and `settled`. Step phases are `prepared`, `sent`, `unknown`, and `answered`. A step answer does not accept the act. An archived settlement can omit its fact. Record, segment, chunk, and archive formats keep their versions and bytes.

## The caller supplies metrics

`Custody` takes an optional synchronous metrics port as its third argument. It calls the port at the same three sites after each write and catches observer exceptions. MCP passes its existing transition functions as `custodyMetrics`. The metrics witness keeps the lost send, the failed accepted write, the persisted unknown, and the successful settlement.

## The predecessor fixes the expected bytes

The predecessor capture ran once at `490291a168ca4c8e8b4ae7f369bb387c718077bb`. Its END is `0ccfd24595083a965b7592ef06f9b8b6119338ef`. The literal fixture has 2,351 bytes, no final newline, and SHA-256 `a734bc6b9f76b2b1e601ed0b35e68b8b7488257ea6025ee653f5e446bf7ddd5a`.

The Client custody witness compares the literal with raw memory and file records, reads the memory records through a fresh `Custody`, and reopens the file store. The MCP SQLite witness compares raw ordered chunk bytes and a reopened store with the same literal. The fixture uses a fixed TEST signer, detached values, one answered step, a lost send, and a settlement at fixed clock positions.

## Named MCP aliases remain until importers move

The MCP root re-exports these 16 values from Client: `UNRESOLVED_MOST`, `OUTCOMES_INLINE`, `OUTCOMES_INLINE_BYTES`, `RECORD_BYTES`, `KEY_BYTES`, `DECIDED_SLICE`, `TERMINAL`, `identityId`, `meaningOf`, `stepId`, `CustodyError`, `Lost`, `validKey`, `decisive`, `Custody`, and `memoryStore`. It re-exports these 12 types: `Identity`, `BindingRecord`, `Envelope`, `Phase`, `ArchivedSettlement`, `Decided`, `Outcome`, `Step`, `CustodyRecord`, `CustodyStore`, `HeldBack`, and `Sent`.

MCP's Node entry re-exports `FILE_STORE_BOUNDS`, `releaseLock`, `blockedBy`, `takeLock`, `fileStore`, `FileStoreBounds`, and `Holding` from Client. No private custody path remains in MCP. Source consumers import the Client files directly.

NF5 removes the named MCP aliases after NF4 and NF5 move their importers to Client. NF5 also retires `Kept` and `AttemptJournal`. NF3 leaves both, and their record domains, unchanged.

## Changed security seals

The custody import edits change six seals in `scripts/security-entry-points.test.mjs`. The builder computed each new value with the test's own seal functions, `sourceSeal` and `namedSourceSeals`, and adopted it.

| Seal | Old | New |
|---|---|---|
| `packages/mcp/src/index.ts` | `3758cff2` | `a47dac62` |
| `packages/mcp/src/hosted.ts` | `64f14a28` | `0d49c351` |
| `packages/mcp/src/hosted-retirement.ts` | `8707c99f` | `3c6f4653` |
| `packages/mcp/src/act-result.ts` | `df3f0746` | `be9a341b` |
| `packages/mcp/src/service.ts:$module` | `d1cd323e` | `38190902` |
| `packages/mcp/src/service.ts:McpService` | `aa4fddb5` | `fa45fc1a` |
