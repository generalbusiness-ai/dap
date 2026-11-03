# Keep existing rooms able to create children after a register change

Request: `579489e0`. Builder promise: `95f5bc73`. Planner ruling
`3ec3e26c` accepts the [design](../2026-11-03-installed-registers-design.md).
The planner owns deployments. This record establishes source and a fresh
local HTTP witness. It does not establish a deployed-host outcome.

## Admission follows the operator's recorded roots

`INSTALLED_REGISTER_SCOPES` records the registers whose existing rooms may
create children. The optional setting accepts a JSON array of one to 32
distinct canonical scope IDs, bounded to 4,096 UTF-8 bytes. It must include
the current `REGISTER_SCOPE`. Malformed or inconsistent settings close
creation. An absent array preserves the current singleton behavior.

The current register still selects new rooms and the only parentless
register installation. The child admission walk retains its signature,
incarnation, applied genesis, source-send, declaration, cohort, index,
byte, visit, and deadline checks. At the root, it checks membership in the
recorded array. Listing a root supplies admission policy, not a Native
birth or authority. The index must already know the root before lookup.

The index adapter snapshots the array with its other settings. A changed
array replaces the adapter policy; an in-flight operation keeps its prior
snapshot. Invalid settings close health without a readiness probe. Valid
health still probes only the current root, not every historical room.

[Deploy instructions](../../docs/deploy.md) require the operator to commit
the array and cite that configuration in the deployment receipt. Removing
a root requires a record that identifies the affected rooms. The security
inventory records the setting, bounds, and three owning readers. Existing
hosted Wrangler files still select one root and need no array yet. A
future hosted register change must retain the roots that serve its rooms.
O4 still requires its dedicated Worker.

## Owning checks distinguish both admission faults

The incremental focused unit records the production and Native owning
compilers, pool compatibility, and 15 cases across the existing policy,
lineage, and health files. The cases retain the earlier checks and cover
malformed arrays, bounds, current-root installation, older-root children,
and unlisted-root refusal.

Restoring the old singleton comparison makes the older-root witness fail.
Accepting every checked root makes the unlisted-root witness fail. Both
controls restore exact source. Shared helpers and source inventory pass.
The inventory adopts only five reviewed owner seals; routes and admission
classes stay unchanged.

The first combined security/settings command exits 1: the source inventory
passes, but two settings assertions expose a missing canonical JSON row.
The corrected documentation passes the complete settings owner. Both runs
remain in the record. These incremental checks are not one frozen run.

## The old room creates children after the switch

A fresh local Worker at `http://127.0.0.1:18845` uses owned persistent
storage and fixed source `c3995f85`. The bootstrap installs an old R21
register and creates its room. A separate R21 control root and room exist
only through the explicit local/test creation escape.

The Worker stops before the configuration switch. The next process keeps
the same storage and Worker name, selects a new R27 root, records only the
old and new roots in the array, and removes the escape. Installing the new
root, inviting and joining a person in the old room, and opening an issue
there all return exit 0. Actual HTTP reads verify the new Inbox and lane
hashes, scope identities, applied genesis, and exact old-room creators.
The Inbox uses `platform:inbox@1`; the lane uses
`sha256:325cb4f33da9deb1a31d85ba0f1456068d4d9d08009978b779aed70cb08e00ad`.

The unlisted control room accepts its genuine person join in Native, but
its new Inbox receives three `not-found` delivery answers and a terminal
`undelivered` diagnosis. A direct child read also returns `not-found`.
The CLI finishes its bounded wait with exit 1 and retains the original.
No retry, replacement, or continuation repeats that producer. This control
root exists physically from bootstrap; the switched operator record never
admits it.

Two inspection mistakes remain visible. The positive producer treats
`Read<Sealed>` as `Read<Entry>` after its four successful commands. A
separate two-GET read-only phase checks the actual entry shape. The
negative inspection first uses admin history, which omits the joining
key's own signed entry. A separate three-GET phase uses that joining key
and checks the exact retained origin and diagnosis. Neither correction
repeats a Native operation. Both Worker processes stop, and the port
closes. Keys, custody, raw HTTP output, and persistence remain private.

## One frozen full gate passes

The required gate runs once at `8cdd44cdcabdafead3bb418de25127ce31943fe0`,
tree `fa3e9257aa1a49012bafd9bbd802aa2506218d51`, after integration with
the preceding registration-recovery source. The actual `gate.exit` reads
`exit 0`. The checkout stays clean at that exact head and tree. The outer
run takes 1,599.700524 seconds on this Mac with owned dependency clones.

All prechecks, compilers, and kernel checks pass. Node passes 133 cases;
Counting passes 56. Plain Vitest passes 3,601 cases and skips one across
361 passed files. Native passes 1,061 cases and skips two across 281
passed files and one skipped file. Every phase has complete terminal
evidence, with zero failed cases and zero unhandled errors.

This distinct candidate's successful gate does not change the earlier
failed flush or registration-recovery gate records. Registration recovery
still needs its own ruling, independent review, and prior landing. No
source, tests, configuration, or dependencies change for this record.

## Sealed evidence

The three manifests index 47 public files and 525 private files. Every
public file verifies its exact size, SHA-256, and read-only mode. The
external units retain their `SHA256SUMS`; private indexes retain complete
raw outputs without publishing their contents.

| Unit | Public files | Private files | Manifest SHA-256 |
|---|---:|---:|---|
| [Focused](evidence/2026-11-03-installed-registers-focused.manifest.json) | 16 | 18 | `a70e685cdf4279022c0674e8b7c67aa765199b53d0b4845e59ea2678f902e4ca` |
| [Local Worker](evidence/2026-11-03-installed-registers-local-worker.manifest.json) | 23 | 478 | `7739195031edac411b84a22a0dc7d3c80ec16170ba8ebaf2b41977bc2550712c` |
| [Gate](evidence/2026-11-03-installed-registers-gate.manifest.json) | 8 | 29 | `518830e64a949212ed98d4b1bd3527ea71e98f494b50818974b79f59b350fc23` |

The local scene does not inspect or continue the original G3 operation.
The planner may deploy the reviewed configuration only after the required
source review and landing. The mini's later H3 Inbox check remains a
deployment obligation.
