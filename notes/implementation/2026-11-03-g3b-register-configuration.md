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

The one frozen gate passes at `b6e7134a920f4e580f2f8e65101a235f5251b0bc`,
tree `50dd7e0a51ac3875f305b16b45b29301b9a30b92`. The actual `gate.exit`
reads `exit 0`. Head, tree, clean status, lockfile, and workspace bindings
match before and after. All five stages pass, all four reporting phases
complete, and the structured summary reports no contradictory record or
report error. Terminal totals are 133 Node, 56 Counting, 3,601 plain with
one skip, and 1,065 Native with two skips. Mac children separately pass
15 Node and 18 Python tests. The outer run takes 1,237.708 seconds on this
Mac, with focused bridge and browser work during part of the run.

The first focused policy assertion named a nonexistent
`MCP_DYNAMIC_REGISTRATION` field. The initial output remains in evidence.
The corrected check reads `OAUTH_DYNAMIC_REGISTRATION` and calls the actual
production `oauthPolicy`, which reports registration disabled. The
source-export metadata now names that actual field. This correction
changes only documentation metadata and adds no runtime setting.

The final evidence record changes only documents over that frozen gate.
Product source, tests, configuration, and dependencies stay unchanged.
The final review names its separate record tree. No full gate repeats.

The source archive remains selected main `9c7ae712`, from before the later
stream-close landing. It includes the registration switch and Mac root
support, and does not claim the later stream fix. The planner's separate
stream ruling makes that fix no G3b prerequisite. This packet proves no
deployment result, App authentication, rollback execution, or G3 acceptance.

## Sealed evidence

The [configuration manifest](evidence/2026-11-03-g3b-register-configuration.manifest.json)
indexes 22 public files, including the exact source archive and Git inventory.
Its SHA-256 is
`9975e05c18bdeedbcadf0b26832746d650ca4c1187ea3bcf1040ff7ee69b7599`.
The [gate manifest](evidence/2026-11-03-g3b-register-configuration-gate.manifest.json)
indexes 10 public files and hashes 34 private raw gate files.
Its SHA-256 is
`b42bcaa5fe9509691097479059b5024dce5da32a6afd4ede5415e38c29eba980`.
Both units have verified checksums and read-only modes. Retain them and
the private raw files for at least 30 days after landing.
