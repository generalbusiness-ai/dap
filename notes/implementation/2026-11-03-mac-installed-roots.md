# Keep reviewed installed roots through Mac staging

Request `5ed8de03`, under promise `d558e857`, supplies the source prerequisite
for G3b configuration request `05c380ce`. Both Mac project validators
previously rejected `INSTALLED_REGISTER_SCOPES` as an extra variable.
Appending it after GitHub staging also failed the deployment validator.

`prepare-github.mjs` now permits that one optional setting and checks it
with the production `readInstalledRegisters` parser through the existing
pinned loader. The check runs in the project stage, before the helper
reads a private App key. The staged copy preserves the exact setting bytes.
The earlier optional creation-policy check still runs only when its own
setting exists.

`deploy.py` applies the same list contract at its prepared-project boundary:
a string of at most 4,096 UTF-8 bytes, one to 32 distinct canonical Scope
IDs, including the current `REGISTER_SCOPE`. A canonical 256-bit Scope ID
has 52 base32 characters; its final character is `a` or `q`. A malformed
Unicode string refuses through the same named boundary. Both validators
keep the original absent-setting behavior and exact variable allowlist.
Unrelated settings, altered Worker bindings or entries, unsafe private
files and inconsistent GitHub authority still refuse through their
existing checks.

The [Mac procedure](../../docs/self-host.md) places the reviewed setting
in the new prepared project before GitHub staging. The G3b packet still
needs its own source export and configuration review. This head changes
no register, Native rule, credential, App configuration, host binding or
deployed service. The planner supplies private inputs and deploys.

## Focused evidence

The [focused manifest](evidence/2026-11-03-mac-installed-roots-focused.manifest.json)
has SHA-256 `7f42972a05b62bceb6c04ba88f3b980c7a7f7528ce083c6861152c9cbaf71621`.
It seals 18 public files. Checks run on dirty source over `ecf59e05`;
source and tests stay fixed after those runs, while operator documentation
follows. The snapshot records the bytes after focused work.

The complete Node preparation owner passes seven cases. Its valid list
survives real staging, including whitespace, and the actual Python
validator accepts the result. Invalid lists stop at the project stage
before an absent private-key input could be read; the Python boundary
also refuses them. The existing original-project, private-mode,
GitHub authority, session and no-overwrite assertions remain.
The complete Python deployment owner passes six cases. Its new witness
accepts 32 roots without changing the file, then refuses an unrelated
variable and a thirty-third root.

Two named controls each start with seven passing Node cases. Removing the
JavaScript guard fails the intended `missing current root` assertion.
Removing the Python uniqueness/current-root check fails the intended
`deployment refuses missing current root` assertion. Each changed run
records six passes and one assertion failure, with no timeout. Each control
exits 0 and restores its source to the exact before hash. The maintained
control helper uses a scratch Node-runner package; no package install or
checkout manifest change occurs.

The owners use actual private scratch files and synthetic RSA key syntax.
They contact no App, provider, installed register or deployed service.
## Frozen gate

The one required gate runs at clean commit
`25146ccfec870e27e9373ff13a50f482dbb107ce`, tree
`03add0b276b14bb2e1dab3a3aad1df878782eb29`. Its actual `gate.exit` reads
`exit 0` after 1,814.988 seconds. Source-before and source-after retain
that exact head, tree and clean status. The run uses shared macOS arm64,
Node 26.13.0 and owned locked dependency copies; initial machine load and
OS cache state are unmeasured. It starts after O4’s gate finishes.

Every precheck, compiler and test stage passes. Node records 133 cases,
Counting 56, plain 3,601 with one skip, and Native 1,065 with two skips.
Both Vitest phases report zero unhandled errors. Every phase is complete,
and reconciliation reports zero issues or failed cases. The fixed Node
stage’s Mac owner separately reports 15 Node and 18 Python child cases,
each with exit 0 and no signal. The earlier
archive failure stays open under `64552d40`; this required passing gate
does not identify its cause. Teardown retains its existing reopening
condition.

The [gate manifest](evidence/2026-11-03-mac-installed-roots-gate.manifest.json)
has SHA-256 `50223ca884a92785d0e26c6a5e57ffee9f1a7d0494ac132592e3a018f7ebe25e`.
It seals nine public files and indexes 29 private originals, including the
complete temporary pipeline. Together with focused evidence, the head
retains 27 public files and 29 private originals.

Only operator documentation, this record and the gate manifest follow
the frozen checkpoint. The top-level self-hosting instruction now states
the installed-root option consistently with its Mac procedure. Production
source, tests, configuration and dependencies stay unchanged.
