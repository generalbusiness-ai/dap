# FW-1: the persistent fleet witness, 17 November

FW-1 (request `f471e88d`) witnesses the CB-1 Mac host kit on a machine
that keeps running. See [the CB-1 note](2026-11-14-cb1-base-celld.md) for
the kit. FW-1 ran the Mac host kit of main `4e5d6c87` on a
persistent fleet on hakuin.local, an arm64 laptop. Hugh ran each `sudo`
step. The builder ran every other step as the service user. The private
outputs stay in the builder's private evidence folder on that machine.

## Preparation

- celld 0.6.3, SeaweedFS 4.51 and Caddy 2.11.7, arm64, from their GitHub
  releases. `gh attestation verify --repo denoland/celld` passes for celld.
  The Caddy archive matches the release's SHA-512 checksum file. The
  SeaweedFS archive matches the release's MD5 file, the only digest that
  release publishes.
- `certificate.sh` made the certificate and key for `hakuin.local`,
  `localhost` and `127.0.0.1`. The guide's steps 2 and 3 made the store
  credential file and `dap-host.json`.
- Hugh ran the installer (step 4) and accepted the store credential copies
  under `/Library/dap-host/private`. The application firewall is off, so
  step 5 did not run.

## First room and Counter

- Before the first deployment, a request through Caddy to a listed name
  waits with no answer, because celld holds it until a deployment exists.
  `localhost` is not a listed name, so Caddy answers it with an empty 200.
  Neither shows the host's health.
- The plan, `prepare-project.mjs` with the trust file, `deploy.py` and
  `PHASE=run` all exit 0. Health then reports `"sessions":"ok"` and
  register `ready`, and the smoke verifies 7 journals.
- The trust file holds one row, Counter 0.3.0, release
  `sha256:0b3e5038…a32e1`, from commit `20caa2d4` (blob `d77f239f`).
- `dap install` without `--values` is refused with `bad-field`. Counter's
  `establish` act needs its target. With `--values '{"target":2}'`, item 2
  becomes active.
- One counted act: `initialize`, `participate`, `activate`, `start`,
  `commit` with `n=1`, then `fulfill` at entry 7.
- `dap verify` on the Counter scope reports consistent for entries 0 to 7.
  `dap verify --all` reports all 8 scopes consistent, with 28 verified
  dependencies and none missing.
- The stored packet under `r2/application-content/` in the fleet bucket is
  2,593,092 bytes, with SHA-256 `81b59b8c…a32e1`, equal to the signed
  packet.
- The screen URL that `dap application` prints answers 404. The room's
  own host never serves a package screen. Screen hosts must be
  `inguz.space` origins that the hosted sandbox Worker serves, so a
  self-hosted room serves no application screen.

## Restart

Each restart used the installed kit's `down`, then the guide's start
lines. After each restart, the builder made the same three reads as
before it, without `sudo`.

| Read                              | Before                       | After the partial restart  | After the full restart                                   |
| --------------------------------- | ---------------------------- | -------------------------- | -------------------------------------------------------- |
| `dap verify` of the Counter scope | consistent through entry 7   | consistent through entry 7 | consistent through entry 7                               |
| `dap verify --all`                | 8 scopes consistent          | 8 scopes consistent        | 8 scopes consistent; 28 verified dependencies, 0 missing |
| Stored Counter packet             | 2,593,092 bytes, `81b59b8c…` | the same bytes             | the same bytes                                           |

Entry 7 has hash `sha256:71c8075c…89df` in every read.

**Partial restart, 18:33 EST.** `down` closed celld, then exited nonzero
with `"reason": "supervisor-stop-unproved"` and `"storeStopped": false`.
Its `closures` object held celld only, so Caddy and the store kept
running. The start lines then loaded celld and Caddy again. Each
SeaweedFS `bootstrap` failed with `5: Input/output error`, because the
store job was still loaded. This run restarted celld against a store that
never stopped, so it shows no store restart.

KD-1 (main `6cd48fab`) names the cause. launchd removed the Caddy label
17 ms after `down` disabled it, between the two `launchctl print` reads
of one poll. The second read answered "Could not find service", and
`down` raised. KD-1 treats that answer as absent. The guide now runs the
start lines only after `down` exits 0 with `"storeStopped": true`.

**Full restart, 21:13 EST.** A second `down` of the same installed kit
exited 0. It closed celld, Caddy and SeaweedFS, each with its label
absent, and printed `"preservePreparation": "complete"`,
`"dataRetained": true` and `"storeStopped": true`. Hugh ran the start
lines at about 21:17 EST. Health then answered `"sessions":"ok"` and
register `ready`. The reads at 21:34 EST match the reads before the
restart.

The journals, the room proof and the stored packet survive a full stop
and start of the store, celld and Caddy. The installed kit predates
KD-1, so a reinstall would bring the fix to this fleet.
