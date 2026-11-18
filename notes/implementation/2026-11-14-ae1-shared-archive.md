# Share room archive policy and wiring (AE-1)

AE-1 landed on main `3c8b8b8a1be26d3660fb2ad0a9d71b5f2315d446` on 16
November 2026. The landing merged main `67280592` with the approved head
`75b491f0329ce69c4d6a0aa07f501a365b67407d` (tree `7a46897f`). It also carried
the CS-1 screen host (counter.inguz.space), the LS-6 screen host
(lending-shelf.inguz.space), and the FW-1 certificate cleanup.

Request 0c265d01, ruling 59767cd8, and promise 43fa0d74 asked for one archive
policy that every room Worker shares. This note says what changed, how it
works, what passed at the approved head, and what stays open.

## What changed

- One archive adapter, `apps/room/archive.ts`, serves every room Worker. Each
  Directory supplies its own repository from its open `repository` row with
  `archive: "journal"`.
- An installed package gets its archive policy from a signed proof that the
  Rules scope returns. Before AE-1, only Grow had this wiring.
- A release without a current trust row now stops with the terminal reason
  `application-policy-revoked`.
- The journal inventory ceilings rise: `nodes` goes from 64 to 128, and
  `inputWork` goes from 67108864 to 134217728 (ruling 790afe00). The other
  ceilings stay.
- The room page shows "No archive: this room has no repository." when the
  Directory has no repository row. It shows "Archive unavailable for this
  repository provider." when the provider cannot serve archives.
- `docs/operate-a-service.md` gains the section "Verify a room from its
  archive".

## How it works

The Rules scope answers the proof request through
`ScopeObject.applicationArchiveProofBytes`. This is a namespace RPC. It has no
HTTP route. The proof read is bounded and authenticated, and the receiver
checks its size and shape before it parses the reply.

The receiver then decides whether the archive may export the installed
package.

1. It walks the creator chain from the genesis of the archived scope
   (`archiveInstallationIdentity`).
2. It compares every ID on that chain with the IDs in the signed proof.
3. It requires a current `APPLICATION_TRUST` row for the release and its
   publisher.

A signature names the publisher. It does not grant permission. A digest, an
alias, or a declaration alone grants nothing either.

When the trust row is missing, the receiver stops the archive with
`application-policy-revoked`. The stop keeps the confirmed receipt. Restoring
the trust row later does not clear the stop.

Some proof replies mean "try again later", such as an installation that is
still pending or a reply that cannot be read. The receiver retries those.
Replies that cannot change, such as a malformed proof or missing retained
inputs, stop the archive.

## What passed

Gate 3 ran the ordinary `npm run gate` at the approved head. Its START was
`dabcb8d6` and its END was `2723f6c0`.

- The gate exited 0 after 1678.5 s of wall time.
- Node passed 206 of 206 tests and counting passed 56.
- Plain passed 4891 tests with 1 skipped.
- Native passed 1172 tests with 2 skipped.

The evidence is in `artroom-evidence/2026-11-16-ae1-cs1-gate-attempt3`.
`gate.log` has SHA-256 `0232ea4e…` and `gate.result.json` has `adada1b7…`.
Preflight 3 (START `65940893`) passed in 35.8 s.

Gate 1 and gate 2 failed and stay recorded as failed. Gate 3 is the only gate
result for this head.

## What stays open

1. **Trust rows before the first archive pass.** Every live installed release
   on a Worker needs its trust row before that Worker runs its first archive
   pass. Grow `71e10ca9…` has no trust row on dap-grow today. The planner
   checks this before deployment.
2. **DNS for the new screens.** Each new screen name needs a proxied DNS
   record unless a wildcard record serves it.
3. **Unexplained Native log lines.** The Native log printed four "Cannot
   perform I/O on behalf of a different Durable Object" lines, and the
   development run at `da8a7337` printed two. No test failed. The
   cause and the owning test are unknown. A separate request covers them.
4. **Creator walks that exceed the pass budget.** ARC-1 owns the case where a
   creator walk costs more than the remaining pass budget, so each retry
   reports `limit`.
5. **Grow-only aliases.** The names `growArchiveDriver`,
   `growArchiveConfiguration`, and `growArchivePolicies` remain because four
   test files still import them. A later head can remove them.
6. **Limits of the witnesses.** The witnesses use TEST keys and a scripted
   peer, clock, and scheduler. They show no hosted fit and no general bound on
   the size of a cohort. No DNS, hosted, provider, or deployment result
   exists.

## Decisions to trace

- Ruling 59767cd8 and promise 43fa0d74 require the shared policy.
- Ruling 790afe00 raises the two journal ceilings.
- Ruling c461110c keeps the journal ceiling in Git and leaves the layer
  assertion and its allowlist unchanged.
- Ruling 77a253b9 adds the FW-1 certificate cleanup to this head. The
  cleanup unlinks only the files that its own run made.
