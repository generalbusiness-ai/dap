# Two workers for the Scope test project

Request: git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:50695e48bce9673efd1864fec5d264ffa28e384a.

## What changed

The `scope` project allows two workers and keeps `isolate: false`.
Each worker reuses its own runtime across files. The separate
`scope-denial` project still runs after it, with one worker and its own
runtime. The root file-task limit remains four. Test selections,
assertions, deadlines and production source are unchanged.

This is source preparation from Main `9daa037e`. The R7 review must settle
before the owner schedules BR-3's runtime measurement and ordinary gate.
No speedup or passing runtime result is claimed here.

## Decisions and why

Two workers are the smallest change that permits files to run in parallel.
The pinned Cloudflare pool creates a Miniflare instance for each pool
worker. The archive fixture's module-local clock and owner remain within
that worker's runtime. No clock, fixture lifetime or cleanup assertion changes.

The project-wide setup remains shared. The clone server allocates an
ephemeral listener and nonce per setup. Only `runtime-versions.test.ts`
configures its singleton repository. Archive clone calls allocate unique
temporary directories, and archive command sessions have random IDs and
separate session records. Teardown runs after the project. The maintained
application setup captures immutable packet data once and provides copies
to the workers. Source inspection found no concrete setup change to make
before runtime validation.

The root project comments and testing guide now describe two Scope workers
and the separate single denial worker. No packages were installed for this
preparation. This worktree has no `node_modules`; the one Node witness below
needs no external dependency.

## Evidence

Checks ran at `da2cf7737f30c0918c7e6e6200b866166a9d7a2c`, tree
`3ed91174f2b826039bc04b22b1c09ac02fd5f6d2`. The final note and manifest
are later documentation changes. The
[evidence manifest](evidence/2026-10-26-br3-source-preparation.manifest.json)
names the read-only output directory and its `SHA256SUMS`.

| Check | Command | Exit | Output SHA-256 |
| --- | --- | --- | --- |
| Canonical phase selection | `node --test scripts/test-phases.test.mjs` | 0; one case passed | `87b7db670166cf0df4d0ac1eac4cc637705ac1b5a00e5ec0675cdb250c84d980` |
| Source whitespace | `git diff --check 9daa037e1976fa0e245192823cce96fc8741360d HEAD` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

The phase-selection witness does not resolve inherited Worker configs or
prove that two native runtimes execute concurrently. It preserves the
canonical split and the ordered separate denial project. No compiler,
native suite, measurement or gate ran in this preparation.

## Open limits

Request `50695e48` owns the measurement, ordinary gate, exact-head review
and any repair needed when tests run on two workers. After R7 settles,
the owner must recut this preparation if Main has moved and provision its
existing reviewed dependency view before those runs.

The focused measurement can time the unchanged native phase command:
`node node_modules/vitest/vitest.mjs run --config vitest.native.config.ts`.
Use the existing progress and timing reporters with new output paths,
leave `VITEST_MAX_WORKERS` unset, and retain elapsed time, child CPU, machine,
load, cache state, final case states and the per-project phase span. Run
the ordinary `npm run gate` separately, once at the candidate sent for review.
The owner must decide the measurement command before execution: the older
`scripts/measure-tests.sh` also installs packages and repeats package suites,
so invoking it unchanged would exceed this source-preparation plan.

Report the one-worker baseline's exact head, tree, selection and outcome
beside the two-worker result. R7's 1,315.81-second native continuation
failed two tests, so it cannot be described as the cost of a passing gate.
A comparison across different code trees or uncontrolled load must state
those differences and cannot establish a controlled speedup.

The older request `7783018d` remains separate. This preparation neither
repeats its campaign nor claims to close it. Archive work retains priority.
