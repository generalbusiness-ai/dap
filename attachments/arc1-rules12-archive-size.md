# ARC-1 Rules 12 archive size

One Rules 12 `publish` added **74,549 logical bytes across 25 new Git objects** to the local Artifacts test peer. One receive-pack request carried a **15,337-byte Git pack**. The Native archive pass confirmed sequence 34 from prior confirmed sequence 33 in 113 ms.

| Measurement | Bytes | Basis |
| --- | ---: | --- |
| Canonical signed entry | 40,842 | UTF-8 encoding of the signed ledger entry |
| New Git object data | 74,549 | 9 blobs, 72,880 bytes. 15 trees, 1,422 bytes. One commit, 247 bytes. |
| Git pack | 15,337 | One receive-pack body with the command frame and flush removed |
| Receive-pack body | 15,518 | Git pack plus 181 bytes of command framing and flush |
| Metadata charged across the pass | 2,098,646 | Archive driver ledger, 1,047,082 bytes below the proposed 3 MiB envelope |

The pass charged two entry operations, 157 attempts, 66 nodes, 339 calls, and 87,072,715 input-work units on the unchanged default ledger. The deadline was 30 seconds. Four genuine setup passes confirmed the prior prefix through 33. The candidate entry configured 32 named checks against one Membership and used five facts from three source references. The earlier Native run in workroom record `2106ca59` recorded the same six ledger counters and took 118 ms for the candidate pass.

The probe used source `087b1a6baeed59bef5209ae98ae3c037326cb3a9`, tree `6bfcff3856003836e7652f7682c0a939a9dacaa6`, in scratch. Native provided the journal, room policy and archive driver. Artifacts and the clock used local stand-ins. The counts cover object data first added by the candidate pass and the bytes in its request body. Provider storage allocation and billing were outside the measurement. The Rules 12 admission proof in `a6ff5af3` still lacks bounds across other histories and source closures.

## Reproduction evidence

```sh
ARC1_SIZE_OUTPUT=<numeric-json-output> node node_modules/vitest/vitest.mjs run --config vitest.native.config.ts --project scope --reporter=default --reporter=./arc1-archive-size-reporter.mjs packages/scope/test/archive-covered-rules.test.ts
```

The captured run passed one case and exited 0 in 8.83 seconds including setup and prefix passes. An initial scratch run passed with the default reporter, which omitted the numeric output. The capture reran that one case and attached the result through a test annotation.

Files are in `~/play/artroom-evidence/2026-11-22-087b1a6-arc1-rules12-size/`.

| File | SHA-256 |
| --- | --- |
| `measurement.json` | `b2d19ed71eab9aae7c200d1dc3556af0bec225b3a0cbfdc75a6a32e8f369d3fd` |
| `native-summary.txt` | `13027f02c7a1b58e5c59964705c28c9adda714d0f0151d84093689948cabd57b` |
| `archive-covered-rules.test.ts` | `e84808b0d6a56d6212b87ea02b2ce2db87e51b85a4bb1e2189f2cd38c9a59b0c` |
| `archive-room-pass.ts` | `4d86adf8570a38b31652cfe349880272d5f7640d5cff1019bcf879c0becad38f` |
| `arc1-archive-size-reporter.mjs` | `3ca88da7cc0fb3e58c5484c5b81b3741d9b56f01d4d8d739a61a7ac7922114b4` |
