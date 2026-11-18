# KD-1: down survives a label that launchd removes between two reads

KD-1 (request `2cc0c0b2`) fixes the fault of the first FW-1 restart on 17
November. The owner ran `down` at 18:33 EST. It closed celld, then printed
`"reason": "supervisor-stop-unproved"` and `"storeStopped": false`, with a
`closures` object that held celld only. The store kept running. The start
loop then bootstrapped celld and Caddy against that store, and each
SeaweedFS bootstrap failed with `5: Input/output error`. A second `down` at
21:13 EST completed, and the full restart passed every journal and packet
read (act `b5d7c460`).

## The fault

`MacPorts.job` (`apps/room/celld/mac/shutdown.py`) reads one launchd label
twice:

1. `job_state` runs `launchctl print` and answers `loaded`, `absent` or
   `unavailable`.
2. When the label is loaded, `job` runs `launchctl print` again to read the
   PID, and requires exit status 0.

`bootout` polls `job` until the label is gone. The unified log of the 18:33
run shows launchd disabling Caddy at 23:33:25.455Z and removing it at
.472Z, 17 ms later. A poll that falls between the two reads gets `loaded`
from the first and exit status 113, "Could not find service", from the
second. `job` then raised `supervisor became unavailable`. `stop` caught
it before it recorded Caddy's closure or disabled the store, which gives
exactly the 18:33 JSON line.

## The fix

`kit.service_missing` names launchctl's answer for a missing label: exit
status 113 with `Could not find service "<label>"` on stderr. `job_state`
uses it as before. `job` now uses it on its second read and answers
`("absent", None)`, the same answer `job_state` gives a moment later. Any
other failure of the second read still raises.

`bootout` keeps its own proof: an absent label completes the closure only
after the original process identity is gone.

## Guide

`docs/self-host-mac.md`, "Maintain the host", now says what each exit
status of `down` means. Exit status 0 means `"preservePreparation":
"complete"` and `"storeStopped": true`. Any other status means the owner
must not run the start lines and must report the JSON line. The old
sentence "An exit status of zero alone does not show that the preserve
shutdown finished" contradicted `main`, which exits 0 only in that case.

## Tests

`apps/room/celld/mac/test_shutdown.py`, run by the Node stage through
`scripts/mac-host-kit.test.mjs`:

- `test_scripted_label_removed_between_the_two_supervisor_reads_completes_the_bootout`
  drives the real `MacPorts.bootout` for Caddy with scripted launchctl and
  process reads: print, bootout, then a print that answers 113. The
  closure completes.
- `test_scripted_second_supervisor_read_failure_other_than_absence_stays_unavailable`:
  a 113 without the missing-service text still refuses.

No test needs `sudo` or a loaded label.

## Red

| Red | What was broken | First failure | File | SHA-256 |
| --- | --- | --- | --- | --- |
| The removed label completes the bootout | the `service_missing` branch in `job` removed | `kit.Refusal: supervisor became unavailable` | `red.txt` | `ed0b32ff70f234027e33df86fa51d402ce65bebe76fc3bede5cff858c8141be1` |

The output is in `artroom-evidence/2026-11-18-kd1-red/`.

## Install

The installed kit under `/Library/dap-host` changes only when the owner
installs it again after KD-1 lands. Until then the owner reads the JSON
line of every `down` before the start lines.
