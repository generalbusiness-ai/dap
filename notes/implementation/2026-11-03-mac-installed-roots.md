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
The full gate follows at a clean committed checkpoint, after the O4 gate
finishes. Its actual exit and source hashes will govern the review record.
