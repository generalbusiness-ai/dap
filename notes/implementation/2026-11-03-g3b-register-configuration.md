# Prepare a new G3b register without stranding earlier rooms

Request `05c380ce6b5b5a6baf2400ea91f034d97ee7aa36` and promise
`67c9eb5fbfc5e1213732fe367217234b9f342217` own this configuration child.
Ratified planner ruling `c324ad65` requires a new register and client home.
This packet creates no live register or room. G3 acceptance stays open.

## Exact source and public inputs

The [source record](2026-11-03-g3b-register-configuration/source-export.json)
pins actual main `9c7ae712d6281a1f32bbbf180e70cfa4329d6e7c`, tree
`3b5af4b5513fe576143cd3b9b7afd168472bf175`. That main contains both the
registration switch and approved Mac installed-root support. Dynamic
registration stays off by default. The public archive retains exactly
3,946 tracked files, with every Git blob hash and executable mode verified.
It includes no local dependency directory, client home, or private input.
Its SHA-256 is
`72f84d06863c2bcf72cfb5824703de15b8874fa779723392d38795188503737f`.

[github-app.json](2026-11-03-g3b-register-configuration/github-app.json)
retains the earlier App account, installation, private-repository policy,
installation reads, and 8 MiB bound. Only `registerScope` changes, to
`PLANNED_G3B_REGISTER_SCOPE`.
[installed-register-scopes.json](2026-11-03-g3b-register-configuration/installed-register-scopes.json)
contains H3's root, the first G3 root, and that same placeholder. The
planner fills both occurrences with the identical planned root.
The production parsers refuse both unfilled templates. A synthetic root
substitution passes syntax only and proves no real installation.

[bindings.json](2026-11-03-g3b-register-configuration/bindings.json)
matches the entire first G3 binding file byte for byte. Its SHA-256 is
`234755b04a7411602c42a7390e2e7146b6e91671a4260d231eec4918728bbfdc`.
That row still names the first Destination, repository `1442980126`, and
branch `main`. No new Destination or branch authorization enters this packet.

## New home and later deployment

The new client home is `/Users/inguz/dap-host-g3b-20261103/client`.
[The procedure](2026-11-03-g3b-register-configuration/deploy-g3b.md)
keeps the existing fleet identity and old roots, adds the root-list string
before GitHub staging, and leaves private App-key work to the planner.
Both failed fresh-owner roots and recovery custody stay retained and unused.
The original G3 home and uncertain Git operation remain frozen.

[Self-hosting](../../docs/self-host.md) now states that each planned
register's client home creates one room. Another room requires another
plan and home. A previously claimed home cannot create a second room.

After this head lands, the planner runs the bounded plan, deployment, and
installation window. The planner records four served-bundle readings and
an actual H3 Inbox birth before handing readiness to the builder.
The builder then creates one fresh room on branch `g3-witness-2` and writes
its content. A separate reviewed binding-row head adds its actual
Destination. The planner deploys that row before the builder binds once
and runs the preservation witness. No configuration result closes G3.

## Validation before review

The public-template check uses unchanged production GitHub and register
parsers. It verifies both placeholder refusals, one synthetic substitution,
unchanged App fields, all three root positions, unchanged binding bytes,
and the maintained Worker identity. The source check compares all archive
files with the exact Git inventory and confirms both required ancestors.
These checks run offline and read no real key or client home.

The packet's one frozen gate, its actual exit, and the final evidence
record follow these focused checks. No gate pass, deployment result,
App authentication, rollback execution, or G3 acceptance is claimed here.
