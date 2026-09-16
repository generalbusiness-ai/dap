# O4 K2 nested exception repair

This isolated repair starts at `edacc32db1495504d10ae7a92f02af272e49e9f2`
under O4 request `1b6384e27d6dbfd5a22da3330378776d32ad23ab` and promise
`18ba74b01cbbea27e2d8c18b063ff482428c95aa`. Ratified review
`10521cbe` requires every activation registry lookup to preserve unexpected
exceptions on both backends. The original O4 source, published observations
and prior logs remain unchanged. K1, K3 and K4 are separate repairs.

## Before the repair

The checker's byte-identical `fault-sweep.mjs` ran at the original source on
memory. Its 120 lookups reproduced 107 original exceptions, 11 swallowed
faults returning effective, one replacement exception at lookup 40, and one
ordinary ineffective_release verdict at lookup 112. Every cold activation and
exact retry was effective. The probe exits zero even when it observes these
defects; the captured result is failure evidence, not a passing test.
[Original probe](ordering-o4-runs/k2/checker-fault-sweep.mjs),
[source/command](ordering-o4-runs/k2/before-memory.json), and
[output](ordering-o4-runs/k2/before-memory.txt) are retained.

A separate cold-open probe ran in an isolated archive of the same original
source. The third of three source-registry lookups was swallowed into a
fold_error verdict, and ScopeJournal.open returned an incomplete fold.
[Probe](ordering-o4-runs/k2/cold-open-probe.mjs),
[source/command](ordering-o4-runs/k2/before-cold-open.json), and
[output](ordering-o4-runs/k2/before-cold-open.txt) retain that boundary.

## Repair boundary

Foundation folding and view interpretation gain an opt-in strict mode. It
rethrows the original value at the existing system, model and audience error
catches; it does not infer failures by scanning reason strings. Legacy callers
keep their ordinary error-verdict behavior. Every scope/public-proof
interpretView call selects strict mode, including nested export reconstruction.
ScopeJournal.create/open also select strict base folding through JournalOptions
and Context.restore, so a transient cold-start fault cannot disappear before
a later scope replay. Genuine policy refusal verdicts are unchanged.

A failed accepted submission closes the scope facade and its held Journal and
Context, retaining the original exception. Durable entries are not rewritten.
After a transient fault, healthy reopen and exact retry recover the one saved
activation. A deterministic faulty handler still fails on strict cold open;
ordinary Journal retains the historical error verdict. interpret() and export()
check the unavailable flag before reading their default frontier, while
ordinary read-policy refusals retain their prior behavior.

The GenesisPayload sequencing union now contains legacy raw `single-writer`,
authenticated fixed `/1` and movable `/3`. Historical `/2` is not supported
by the current authenticated boundary and is removed from this type union.

Focused validation will sweep every registry lookup of one activation on
memory and SQLite, requiring original identity, disabled retained writers,
unchanged committed bytes, and exact effective retry after cold reopen. It
also covers cold-open absorption, non-Error registry faults throughout export
and proof interpretation, unavailable reads, unlisted wireInput errors,
ordinary policy refusals and throwing application handlers. No broad suite,
full lifecycle record regeneration or 600-seed campaign is claimed here.
