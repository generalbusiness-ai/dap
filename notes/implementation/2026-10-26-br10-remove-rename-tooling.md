# Remove the completed workspace rename tooling

Request: git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:d75a32d18bc7edf51ae8c598dba8139668c59106.

## What changed

The completed workspace rename no longer needs its transformation script,
preservation inventory, or operating guide. This preparation removes these
three files, which together held 782,246 bytes:

- `scripts/rename-workspaces.mjs`
- `scripts/workspace-rename-preservation.json`
- `docs/workspace-rename.md`

The Page's agent invitation instructions name `DAP_HOME`. The existing UI
assertion expects that same name.

## Decisions and why

Commit `9f5ebc81703ff04d985d3599dfb2780d4cad19eb` retains the exact bytes of
all three removed files. Each file is available with
`git show 9f5ebc81703ff04d985d3599dfb2780d4cad19eb:<path>`.
That commit remains an ancestor of this preparation's Main base,
`986c712040295bd769c29f870cd49d40b3fc81a0`.

Before this cleanup, no tracked file outside those three files and the
dated review note named the removed tooling. Historical notes retain their
original references.
The CLI still accepts `ARTROOM_HOME` as a compatible alias. This change
updates the Page's preferred name without changing configuration selection.

## Evidence

This commit is source preparation. No build, compiler, test, or gate has
run for this change. The committed Page asset still contains the earlier
instruction and must be regenerated before validation.

| Check | Command | Exit | Output digest |
| --- | --- | --- | --- |
| Owning validation | Pending | Not run | None |

## Open limits

Request `d75a32d18bc7edf51ae8c598dba8139668c59106` owns the Page asset build,
the owning UI and asset tests, the required active-source Node check,
applicable compiler checks, the ordinary gate, retained evidence, and
review of the exact candidate. Validation waits for the serialized BR-3
gate. This preparation does not complete the request.
