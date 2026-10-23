# Rename workspace references

The seven former workspace names now use the `@generalbusiness/dap-` prefix:
bytes, checkers, client, git, package-graph, replay and scope. Published package
names, versions and executable names stay the same.

Run the repeatable source transformation from the checkout:

```sh
node scripts/rename-workspaces.mjs --write --report=/tmp/workspace-rename.json
```

The report path must be new. The normal pass also works before a preservation
inventory exists. An existing inventory must be a valid regular file; malformed,
aliased or unreadable inventory files fail. Without `--write`, the script reports the proposed
changes. A second run reports zero changes. The same script applies the reviewed publication changes through unique, ordered
context replacements. It refuses ambiguous or partially conflicting anchors.

The script changes module imports, package and compiler configuration, current
documentation, and explicitly identified executable test bindings and package
policy expressions. It refuses unclassified references. It preserves historical
notes, protocol names, environment variables, executable aliases and recorded
fixtures. It does not install dependencies, build assets or run tests.

Check the recorded preservation inventory with:

```sh
node scripts/rename-workspaces.mjs --check-preservation
```

That check compares 22 protected files by SHA-256, replays the transformation
against the recorded Git basis, and compares the exact resulting source hashes.
The check also replays all six publication files from the corrected K9 basis.
Two representative controls check already-applied idempotence and refusal of an
extra external old block: an ordinary replacement and an insertion that retains
old text inside its new block. The full file replay covers all 44 actual anchors.
The inventory records the unchanged bytes outside each approved edit span
and the literal digest spellings in each file. Literal digest equality is not an
independent recalculation of semantic definition digests. Preserving declaration
and journal bytes preserves their existing digest inputs.

## Adopt reviewed source-seal values

After the final rename, a reviewed owning wrapper calls the maintained
`sourceSeal(file)` function for each of the 54 exact owners. That function returns
one hex string. The wrapper writes the actual `[{path, sourceSeal}]` JSON artifact
in first-occurrence order across `seals`, `pendingArchiveSeals`, and
`pendingR8Seals`. Review that run and its finite metadata record before adoption.
The rename script does not run the parser or infer new seal values.

With the prepared preservation inventory present, adopt the reviewed record:

```sh
node scripts/rename-workspaces.mjs --write \
  --source-seal-metadata=/absolute/path/to/reviewed-record.json \
  --source-seal-sha256=REVIEWED_RECORD_SHA256 \
  --report=/tmp/workspace-seal-adoption.json
```

These paired flags accept only the 55 value interiors in the three known maps of
`scripts/security-entry-points.test.mjs`. The script binds the exact base file,
ordered keys, final owner source hashes and actual parser output. It validates all
inputs before writing the map file and adding the record to the inventory. A
fully adopted file is a no-op. A mixed or otherwise changed file refuses.

Later normal runs and `--check-preservation` reuse the inventory's record. They
never follow its descriptive output path or rerun the parser. Changed owner
bytes require fresh parser evidence and a reviewed replacement inventory. The
actual D1 owning check still recomputes source seals independently.

The metadata verifier also changes one owner key in an in-memory copy and
requires refusal. All 22 protected files, ordinary digest literals, mechanical
spans and publication replacements retain their original checks.
