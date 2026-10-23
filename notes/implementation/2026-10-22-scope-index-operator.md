# Scope index operator: source preparation

This continues R2 request `2694fd64`, promise `48fac5fd`, and rulings
`2c18d9be` and `9a583cfd`. Source starts at `1793ca7d` in a separate
operator worktree. It has not been compiled, tested, committed or deployed.
The index/ancestry source is held separately. No live keys, rooms or provider
state have been read. Timing ruling `14a5e292` resolves `a1abdbe0`;
the V3 runbook below incorporates its enforce verification and rollback.

## Commands and observations

The Node CLI adds these commands; the browser command surface and existing
`verify --all` behavior are unchanged:

```
dap scope-index inventory --out room-inventory.json
dap scope-index sweep --manifest room-inventory.json
dap scope-index verify --manifest room-inventory.json
```

Inventory follows only the configured Directory and its descendants. It
reads the Directory's exact applied genesis, its Register genesis and the
actual Register creation send. It does not follow that Register's other
rooms. Each child's observed genesis must match its parent's hash-checked
creation send, full creator reference, seed and send ordinal. Discovery
checks the hash-linked recorded history through its observed page head.
It refuses a missing, pruned, inconsistent, unfinished or overbound walk.

The v1 checker report `1a2e6724` found that the first source draft did not
compare the complete creation message. V2 uses the same edge checker for
Register-to-Directory, descendant and repeated-seed paths: the selected send
and recorded genesis must carry the same `request/create` message, exact seed,
source fact and send number. Seed ordinal is the rank among creation sends,
not that send number. `derive/src/sends.ts` counts creations separately from
all sends; `genesis.ts` reserves a child's result at send 0, so its first
creation can have ordinal 0 and send number 1. The positive fixture retains
that distinction instead of adopting the checker's proposed equality.

`genesis.ts` delegates an existing child to `judgeDelivery`; `delivery.ts`
answers a repeat only for the already decided source fact and send number.
A different creation request then refuses. A dispatch retry adds no second
creation entry to the source history. Capture does not silently ignore a
later entry that emits an existing seed: it checks the original genesis
edge again and conservatively reports an inconsistent later edge as incomplete.
This is an inventory qualification, not a new native rejection rule.

These are authenticated observations from the configured deployment, not
independent replay of its native judgments. The tool checks entry hashes,
seed-derived IDs, full references and recorded applied genesis decisions;
it does not make an untrusted service truthful merely by signing its reads.
No observed entry bytes are submitted as registration proof.

The manifest contains only version 1, canonical configured service, full
Directory reference and sorted full scope references with genesis hashes.
It contains no signing keys, session tokens or intent bodies. One manifest
belongs to one configured room. The planner repeats capture for its known
root inventory and records the union's listed counts; this is not a global
index listing or proof that no other rooms exist.

Limits are 4,096 scopes, 4,096 discovery pages in total, 1,000 pages per
scope and 16 MiB per manifest. Existing HTTP reply byte/deadline bounds
remain. A complete capture is published owner-only without replacing an
existing file. Loading uses one opened regular descriptor, bounded reads
including an EOF sentinel, and a before/after descriptor metadata check.
It never follows a manifest symlink or trusts a pathname stat followed by
an unrestricted read. All schema, row, service and configured-root checks
finish before lazy authentication can access the network.

Sweep and verify read exactly the saved IDs, serially, and compare each
observed full genesis and hash. They do not rediscover scopes or make native
mutation requests. Their report retains each unavailable or mismatched row,
prints listed/verified/unavailable/mismatch counts and exits unsuccessfully
if any listed row fails. A successful report says only that the listed
observations match. It does not infer deployment mode or index contents.

## Rollout and limits

The planner runs the approved sequence separately on `artroom-scope`,
`dap-grow` and `dap-lending` after review:

1. Against the pre-index deployment, capture the authenticated known-root
   inventory and save its manifest. This is the no-registration dry run.
2. Deploy the reviewed index head in register mode. Record its exact version
   and configuration as the rollback target.
3. Sweep exactly the saved manifests using ordinary authenticated reads and
   read back each genesis. These GETs can register unknown legacy scopes,
   so this step is write-bearing. Retain failed IDs and qualified counts.
   Successful readback proves only the listed genesis observations, not
   index membership: contained registration failure can preserve a successful
   genesis answer.
4. Deploy enforce and record the exact reviewed version and configuration.
5. Repeat ordinary reads of the exact saved manifests under that recorded
   enforce deployment. Compare every full genesis and hash. A listed scope
   that answers under enforce is indexed; report indexed reachability only
   for the listed set, with no claim of global completeness. The ordinary API
   does not expose mode, and the command does not guess it.
6. If any listed scope is missing or mismatched at step 5, the planner must
   immediately redeploy the recorded step-2 register version. Record the IDs
   and the failure as an operator rollout failure; do not discard those rows.
   Sweep each affected scope again with ordinary authenticated reads, then
   repeat steps 4 and 5. The resweep is write-bearing too.

No global index query, new public/admin route, provider write, third mode or
per-request bypass is added. No unavailable row is dropped to make a report
successful. A failed file publication may have left the complete final file
published (for example if directory sync failed); inspect it rather than
replacing it or claiming that nothing was written.

Prepared Node witnesses use typed transport/history stand-ins, real hashing
and signing, and actual temporary files. They distinguish a wrong child seed
or Register creation send, changed/non-create messages and creation rank on
both edges, an inconsistent repeated seed, incomplete/archived history, locally invalid
manifests with zero authentication/network, exact listed reads, unavailable
and wrong-incarnation results, exclusive output, symlinks and oversized
opened input. They are unrun and prove no native admission or hosted storage
behavior. Integration must preserve the R1 repairs, R2 ancestry gate, R8
signer custody, original D1 owners and all existing CLI behavior. Owning
source review, compilers, focused checks and the final gate remain pending.
