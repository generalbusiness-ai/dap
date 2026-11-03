# Preserve child creation across register upgrades

Request: `579489e0`. Builder promise: `95f5bc73`.

## Operator record

Add `INSTALLED_REGISTER_SCOPES`, a nonsecret JSON array of scope IDs, to
Worker configuration. The operator records the array in the deployment's
configuration commit and names that commit in the deployment receipt.
Only the operator changes this setting. A request, a readable scope, or a
scope-index row cannot add a register to the array.

`REGISTER_SCOPE` continues to select the register for new rooms and the
single parentless register installation that the Worker admits. With no
array, child admission retains today's singleton set. An explicit array
contains between one and 32 distinct canonical scope IDs and includes the
current register. Invalid JSON, duplicates, extra whitespace inside an ID,
an absent current register, or a missing current entry closes creation.
The parser refuses more than 4,096 UTF-8 bytes before JSON decoding.

To upgrade, the operator retains every register that serves existing rooms,
adds the next register, changes `REGISTER_SCOPE`, and deploys that recorded
configuration. The new root must still complete its ordinary signed native
installation. Listing a root supplies admission policy, never a native
birth or authority. Removing a root deliberately stops its future child
creation and requires an operator record that identifies the affected
rooms. No automatic eviction removes an old root.

This design adds a configuration record form. It adds no native intent,
public write route, inferred registration, or mutable caller-owned list.
Existing single-register configurations keep their behavior.

## Admission

Child admission walks the existing checked native lineage. At its root,
it requires an admitted register scope instead of equality with only the
current register. Every existing signature, incarnation, applied genesis,
source-send, declared-definition, cohort, index, byte, visit, and deadline
check remains. An admitted root must already appear in the deployment's
index before its raw namespace lookup.

The index adapter snapshots the setting with its other policy values.
Changing the array replaces the adapter's policy identity. Neither the
caller nor a late asynchronous answer can change an in-flight attempt.
Parentless creation and new-room selection still use the current root.
Repository-host bindings keep their own exact register rules.

Health reports an invalid installed-register configuration as unavailable.
Its ordinary readiness probe still concerns the current register. Health
does not claim to audit every historical room or prove every listed root
exists. The security settings inventory describes the new value and bound.

## Witness and controls

Use one fresh local Worker with persistent owned storage and no live room
identity. Install an earlier register and create its room. Record the
operator configuration change to a newer supported register, retaining the
earlier root in the array. Install the new root. After the switch, the old
room creates a new Inbox and a lane through ordinary HTTP and native
operations. Retain the originals, answers, applied child births, configuration
commits, source hashes, and process closure.

A third root remains outside the array. Its otherwise valid native child
request refuses before target lookup. A control that restores the original
current-register equality must fail the older room's positive witness.
A control that accepts every checked root must fail the uninstalled-root
witness. Parser and adapter tests cover malformed configuration and a
changed array without repeating the whole native scene for each value.

Run the affected owning compilers and files, then one frozen full gate.
Seal the evidence, obtain exact-head review, check retirement coverage, and
land before any cohort deployment on a Worker with live rooms. The planner
owns deployments. The original G3 room and mixed-register unknown remain
untouched.
