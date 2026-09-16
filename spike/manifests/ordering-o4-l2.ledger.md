# O4-L2 issuance exception boundary

This component repairs report `869821dee977b1697050fb09ba8f80f8112425f3` under O4 request `1b6384e27d6dbfd5a22da3330378776d32ad23ab` and promise `18ba74b01cbbea27e2d8c18b063ff482428c95aa`. The base is the exact reviewed candidate `e0467ae9c44d99e10f38916b74f047b4e9183c5c`. Work is isolated on `request/o4-r2-issuance`; the reviewed checkout is unchanged.

## Preserved failure

`ordering-o4-runs/r2-issuance/before/results.json` pins the original source, commands, exits, harness hashes and output paths. The two original checker scripts are copied unchanged beside the outputs. Both memory and SQLite cold opens returned a live Scope without Bob after one hashing fault. The original activation diagnostic at crypto calls 2307 and 2450 returned `ineffective_release` while cold replay and exact retry were effective. These diagnostic scripts exit zero even when they reproduce the defect; their printed observations, not exit status, establish failure.

## Repair and compatibility

The codec and legacy canonicalizer record their declared validation TypeErrors in private WeakSets. Their types and messages remain unchanged. Predicates inspect only the thrown value's type/nullness and WeakSet membership, so an incidental TypeError with codec-looking text or a revoked Proxy is not a validation refusal.

`verifyIssuance` prepares the same signed or legacy commitment bytes, catches only these declared validation failures as `malformed`, then hashes outside the catch. Unexpected hashing, key-construction and object-inspection faults propagate unchanged. The strict Scope fold therefore cannot keep a partially replayed membership state or report a successful activation attempt as an ordinary failed release. Existing Scope/Context exception invalidation preserves committed bytes; a clean reopen and exact retry recover them.

The release-opening and public-proof codec catches use the same validation identity. The outer Scope and wire-input refusal inspection cannot replace an opaque thrown value when `instanceof` itself throws. The Scope constructor is private at the TypeScript API boundary; supported construction uses create/open, both of which enable strict folding. A negative compilation check prevents accidentally reopening the non-strict constructor surface. This is a TypeScript API restriction, not a JavaScript sandbox.

## Measurement plan and limits

Formal focused results will be appended after this source is frozen. Coverage comprises all issuance hash/key-construction calls in one cold open and one activation on each backend, plus original thrown values including Error, two unexpected TypeErrors, object, string, undefined, null and revoked Proxy. Direct signed/legacy checks also cover hash update/digest. A separate signature extension sweeps all cold-open verification calls and samples the first/middle/last activation verifications plus every activation signing call. The remaining activation signature verifications and unrelated hashing calls are not swept.

Malformed signed and legacy embedded issuances remain ordinary admission refusals, with no new position and a usable Scope. Malformed public/release proof bytes remain typed policy failures and permit a later valid activation. The unchanged codec vectors and invitation tests check successful bytes and legacy acceptance. No broad suite or campaign is planned for this component.

After a postcommit replay fault, submit, retained Context writes, interpret and export are blocked. `proof()` and retained `context.view()` may still inspect memory-backed history; these are not claimed blocked. A fault in the final post-replay `verifyEnvelope` can throw without poisoning the facade, but does not change its replayed outcome. Existing precommit envelope/prepare catches can return a refusal without storing anything. Deliberately thrown Scope policy-error instances remain policy verdicts, and the existing exact plain-Error message allowlist in `WIRE_REJECTIONS` remains; this component does not rebrand all Journal failures.

Runtime byte changes require new combined runtime/package/genesis/proof pins. This component will report its identities, but root will regenerate combined lifecycle identities after integrating the independently repaired L1/L3 components. Earlier lifecycle measurements and source identities remain historical evidence at their original commits.
