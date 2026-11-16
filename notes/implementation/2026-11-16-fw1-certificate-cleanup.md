# FW1: certificate cleanup before fleet preparation

The certificate helper now unlinks only its known owned files and removes its two empty staging directories. It keeps the existing same-inode guard for partial published outputs. Unknown entries remain in place and cause a fixed cleanup-stop message. An earlier failed or interrupted generation keeps its exit status; cleanup failure after successful generation returns 1.

All SAN, cryptography, lifetime, exclusive-publication and trap code outside cleanup stays unchanged. The existing fifth collision case adds a harmless unknown staging marker and checks its retention. All five case identities, old assertions and deadlines remain.

Request `f471e88dbb312f69c08d59468631174254342e63`, promise `2e7d6441ecf223a5670d479b85f9aa9e86fd8a32` and ruling `77a253b93d5ea53d8ab4b4a23875fad617eb735e` govern this rider of the AE1 head.

| Boundary | Evidence |
| --- | --- |
| Source application | Normal local commit `e9757c3fee7b90297a1f4b279ba469f3fe08d8f1`, tree `93443f3d4c1f1c21da9e63cd76242610adf139f1`; exit 0, 0.187342083 s, clean. `/private/tmp/artroom-ae1-certificate-cleanup-source-application-20261116/result.json` SHA `e983b620e3a872f543c462087bb5647f18ebfc2117a97ac2464586200f977ba2`. |
| Earlier whole Node at 142fa779 | 206 tests passed through the original helper. END `55c3b45d4525ce219911615bd4e4b20b90e121bc` records the indirect cleanup-command qualification; it does not validate this successor. |
| Successor whole Node and Gate3 | UNRUN. The required whole Node stage supplies the Mac parent and actual certificate child results. |
| Persistent fleet witness | UNRUN. No binary download, real fleet certificate, credential, privileged install, counted act or restart followed from this source application. |

FW1 preparation uses the repaired helper on the build laptop. Private material stays on this machine where the kit places it; no credential or key bytes enter acts or evidence. The owner runs privileged steps through the planner, outside gate intervals. The local cleanup checks do not establish fleet readiness or restart durability.
