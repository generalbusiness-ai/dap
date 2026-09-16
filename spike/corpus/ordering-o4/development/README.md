# O4 development findings before the certificate decision

These are development tests of the initial `scope-proof.ts` helper, not a
frozen O4 lifecycle measurement. The source and test are retained in the
commit introducing this record. The helper and test matched those used by
the runs; other uncommitted runtime files were being developed concurrently,
so the logs are not attributed retroactively to a clean whole-tree snapshot.

Twelve actual signed-journal proof checks: seven passed, five failed. The
helper accepted top-level private extras and proofs omitting an attach,
grant, revoke or withdrawal body while retaining its header. The omission
diagnostics demonstrate restored capability after hidden revoke and a false
effective acceptance after hidden withdrawal. No expected lifecycle result
was substituted for a source fold.

Root escalated the completeness proposal under workroom request
`git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:8a1f2a6564492e67c2ea4af0f2379255748793ea`.
A certificate prototype is permitted, but a formal O4 baseline awaits the
checker decision about the frozen manifest. The source writer would attest
the public opening set's completeness, not release effectiveness; the
recipient must still authenticate and replay source semantics and grants.
