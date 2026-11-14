# H1: the sequenced level in the contract and the validator

Request `71bb8559`, the first head of `333de97b`. The
[sequenced note](../2026-10-18-sequenced-level-and-order-scope.md),
sections 5.11, 9 and 13, states the scope. Ruling `08c5ff25` permits the
kernel additions, and ruling `09d80b57` settles the reason codes and the
open points of this head.

## What H1 adds

- `validateFormat1` admits `{ name: "sequenced", version: 1 }`.
  `derivable` is false for a sequenced definition, so no runtime pins one
  before the heads that derive the level.
- The mark `sequenced` and at most four `reads` on an act. Each read
  names a member and a range of a type and states. The `read` operand
  stands only as the `list` of `each`, `has`, `distinct` and `sameSet`.
- `Entry.position`, `Entry.reads`, `GroupReadUse`, and the six input
  kinds `prepare`, `commit`, `abandon`, `allocation`, `resolution` and
  `hole`.
- The retained kind `page`, and the types of the `at` read.
- The scope kind `order` and the platform name `platform:order`. K4's
  closed kind list gains `order`. K1's count does not change until H3
  adds the rules of `platform:order@1`.
- The builders `sequencedLevel`, `sequenced`, `groupRead` and
  `groupList` in `define`.
- No reason code. Section 13.2 of the sequenced note lists each code,
  its class and the head that adds it.

## Promise 2 of the kernel page

The bytes check of an entry refuses the six input kinds, and replay
stops `unsupported-definition` at one. No service writes one of the six
input kinds before H4, so promise 2 of the kernel page holds for every
journal that a service writes.

## Witnesses

- `packages/derive/test/forms-sequenced.test.ts`: each admitted form,
  one refusal pair for each misuse that the request names, and the
  `derivable` gate.
- `packages/derive/test/definition-corpus/sequenced-variants.ts`: a
  corpus row for each admitted form and for the admitted half of each
  pair.
- `packages/define/test/sequenced.test.ts`: a definition built with the
  builders has the digest of the corpus row that reads a member.
