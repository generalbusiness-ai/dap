# S3-F: remove the staged project after each deployment

S3-F follows the S3 approval `74ac31a4` (non-blocking point 1). S3 made
`deploy.py` pass the per-install proxy token to the Worker as
`CELLD_PROXY_TOKEN` through a private `staged-*` copy of the project. Each
deployment left that copy in the operator's project, token included, and
the copies accumulated.

## Change

- `staged_project` is a context manager
  (`apps/room/celld/mac/deploy.py:209`). It makes the `staged-*` directory
  (0700) and its two files (0600), yields the directory, and removes it when
  the `with` block ends. On an error or interrupt it attempts the removal
  and then raises the original exception unchanged. On success a failed
  removal raises, so the operator learns that a token copy remains.
- `remove_staged` (`deploy.py:234`) removes only the directory that
  `staged_project` made. It refuses a path that is not directly under the
  project, has no `staged-` name, is not a directory (a symlink included),
  or has another owner. It then calls `shutil.rmtree`.
- `deploy` runs `run_deployment` inside the `with` block
  (`deploy.py:358`). The CLI still deploys the staged path. Its working
  directory and private `deployment-*` logs move back to the operator's
  project, as before S3, so the logs outlive the staged copy.
- `docs/self-host-mac.md:202` states that `deploy.py` removes the staged
  directory and keeps the logs in the project.

## Tests

In `apps/room/celld/mac/test_deploy.py`:

- `test_deployment_stages_the_installation_proxy_token_without_rewriting_the_project`
  (line 87) checks the modes and token inside the `with` block, and checks
  that the directory is gone after it.
- `test_deployment_removes_the_staged_copy_after_success` (line 149) runs
  `deploy()` with a scripted installation and a scripted `run_deployment`.
  The scripted CLI reads the token from the staged copy. Afterwards no
  `staged-*` directory remains, no project file holds the token, and the
  logs directory is the project.
- `test_deployment_removes_the_staged_copy_after_failure_and_keeps_the_error`
  (line 160) repeats the run with a `Refusal`, a `PermissionError` and a
  `KeyboardInterrupt` from `run_deployment`. `deploy()` raises the same
  exception object, and no staged directory or token remains.
- `test_staged_removal_refuses_a_path_it_did_not_make` (line 173) gives
  `remove_staged` a `deployment-*` directory, a `staged-*` directory
  outside the project and a `staged-*` symlink. Each one refuses and stays.

All four fail on main `9255e1f8`: `staged_project` returns a path with no
context protocol, `remove_staged` does not exist, and the staged copy with
the token stays after `deploy()`.

## Evidence

Files are in `artroom-evidence/2026-11-18-s3f-red/`. Each run is
`PYTHONDONTWRITEBYTECODE=1 /usr/bin/python3 -B -m unittest -v test_deploy`
in `apps/room/celld/mac`.

| Run | Result | File | SHA-256 |
|---|---|---|---|
| S3-F tests, base `deploy.py` (`9255e1f8`) | 8 of 17 fail: 5 failures, 3 errors | `red.txt` | `c57d9ded8aa5a51454dd02ee85e9cc694d87b5db67fbaea6615bba569ba00bb7` |
| S3-F tests, S3-F `deploy.py` | 17 pass | `green.txt` | `6879134c139bf1c3fdf0665a47fb2a6e052614403b4e6b3bf76c9ff06372b95a` |

`scripts/mac-host-kit.test.mjs` passes 1 of 1 on the S3-F source. The gate
runs on the committed head; its START and END acts name
`artroom-evidence/2026-11-18-s3f-gate/`.
