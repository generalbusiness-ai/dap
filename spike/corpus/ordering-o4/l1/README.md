# L1 property-name registry repair

Original checker scripts are retained unchanged. `before.json` pins the
clean source and arguments; the four before outputs reproduce poisoned
application-kind and role replay on memory and SQLite. These scripts catch
failures, so their zero exits do not establish passing tests. The separate
path-typo output records a command that never reached the script.

Run the scripts with `WT` pointing to a checkout of the recorded source and
the arguments in `before.json`. They are historical reproductions, not proof
of the later repair. The original O4 candidate and K1–K4 records remain intact.
