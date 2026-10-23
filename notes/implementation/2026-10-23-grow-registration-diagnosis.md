# Grow registration failures

Five Grow scopes return `not-found` after the planner deployed accepted Main
`aa016e0e1e6d71a8d466f82e8aff7e9f22ca0250` in register mode. This candidate
adds fixed failure-phase observations so the next repair can address the actual
cause. It does not restore access or replace genesis verification.

Request `ad99c669365a4bd4c2ed5f677b1f2ae767fb31cb` and promise
`b98dba6598f32cfae2ad21b29a3277db532a576d` track the urgent repair. Diagnostic child request
`c3acd11f155110fe078b75bf29fdff1c3be910d5` and promise
`ddab955263bcc3102523e8dcdcd00299a8ec6531` track this candidate. The
planner reported that version `fbb6468f` passed health, but two manifest sweeps
verified only six of eleven scopes. Room A, Site, Directory, Rules, and
Destination were unavailable. The new storage migration blocked rollback to
version `520aa54f`. Other deployment rollouts remain held.

## What the source establishes

`registerKnown` requires a bounded local genesis entry and verifies its hash,
position, applied decision, seed address, incarnation, and kind before asking
the index to register it. The namespace adapter returns `not-found` when that
registration fails or its RPC rejects. Those conditions explain the response,
but do not identify which condition occurred in Grow.

The initial hypothesis was that archive confirmation removed entry zero.
Source inspection does not support that hypothesis. Archive confirmation
updates its own records without deleting journal entries. Grow's production
wiring does not enable the fixture floor writer. A properly judged floor also
keeps genesis as a required root. The archive pin is bounded identity metadata;
it does not prove an applied genesis and cannot replace the original checks.

A failed activation can reject the registration RPC before its method body
runs. The candidate therefore observes both the native failure phase and the
existing namespace catch. A wrapper rejection does not prove that the
constructor failed. Missing log rows remain inconclusive.

## Fixed observations preserve the existing decision

The temporary `scope-index-registration` observation contains only fixed
`phase` and `outcome` values. It includes no scope identifiers, hashes, byte
counts, entry contents, credentials, or exception text. Successful registration
emits no row. Logging failures are caught and cannot change the original
registration result or namespace refusal.

The original database reads, check order, callback, and refusal behavior stay
in place. The diagnostic adds no public route, persistent state, retry,
timeout, authority grant, or archive fallback. The planner owns deployment
and collection of the failure phase. The urgent repair remains open until a
reviewed change restores the ordinary scope answer.

## Validation status

Independent production and test source reviews found no mandatory issue.
Both Scope compilers passed. The four security entry-point checks, three
scope-index cases, and three archive-publication cases passed without changing
their deadlines or worker settings. The maintained security parser supplied the
actual two owner hashes used in the three existing security-map value slots.

The native witness confirms a component archive through genesis, checks that
entry zero remains intact, and removes only its exact index row as a labelled
migration fixture. After restarting the real object, enforce mode refuses the
unknown scope; an ordinary member-session read in register mode restores the
index proof. A second restart preserves the same ordinary answer in enforce
mode. Corrupting the genesis hash still refuses registration; restoring the
original bytes and hash restores the valid path. The witness uses real archive
planning, Mark, rebuild, and explicit row confirmation. It does not exercise the
full production ArchiveDriver or Grow factory, or reproduce the hosted failure.

The ordinary final gate is the next required check. The durable review packet
records its result at the committed head; no hosted recovery is claimed here.

Dependencies were privately copied from the retained reviewed rollout checkout.
Receipt `bd582c074b4bbea8809ff33ad618bdb697776fee` records unchanged source,
exact copied bytes and modes, distinct single-link files, and target-owned links.
The lock and inherited compatibility bytes are unchanged. No installation ran.
