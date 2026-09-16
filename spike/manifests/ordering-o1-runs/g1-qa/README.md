# Retained internal G1 QA

These are byte-identical records from `/tmp/dap-o1-g1-qa.W6WFtP/spike`,
measured at `10fa069b2e4b4089cbdaf7f577da0feb8db5f3c5`. Its runtime bytes
match focused source `81a95d09c0ffb8cf2e65565b05d451b939371290` and combined
source `2c727b7d8db28c17b51a0aaa34ea5151f2eb44a4`. The earlier archive has
seven freshness tests; source `81a95d0` adds two healthy raw-retry tests.
This is bounded internal QA, not independent workroom approval.

`qa-g1-summary.json` records commands, results and scope. The selected attack
script retains the reviewer's original L1/L1s/L5 blocks with only its output
directory redirected. Its `T` helper prints both observations and errors;
its exit status alone is not a verdict. The summary assesses those observed
refusals and replay outcomes. `qa-current-retry.mjs` uses assertions.

To rerun the current-retry probe, place its original bytes in the measured
archive's `spike` directory and run the command in the summary from there.
The selected attack probe takes the absolute `spike` directory as its argument
and uses the retained scratch directory for temporary databases. The scripts
were copied here as evidence, so their original relative imports/output path
have not been edited for this storage location.
