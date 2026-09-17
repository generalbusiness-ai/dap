from pathlib import Path
import hashlib, json, shutil, subprocess

wt = Path('/tmp/dap-o4-transfer-lifecycle')
raw = Path('/tmp/dap-o4-m1-run10')
source = '79cd00029504deb92c121dbf12859680dfe78358'
prefix = 'spike/manifests/ordering-o4-runs/run-10'
target = wt / prefix
def git(*args):
    return subprocess.check_output(['git', *args], cwd=wt, text=True).strip()
def write(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n')
assert git('rev-parse', 'HEAD') == source
assert not git('status', '--porcelain')
r = json.loads((raw / 'result.json').read_text())
s = json.loads((raw / 'source.json').read_text())
assert r['wrapper'] == {'status': 'completed', 'exitCode': 0}
assert [c['exitCode'] for c in r['commands']] == [0, 0]
assert r['commands'][0]['totals']['tests'] == 512 and r['commands'][0]['totals']['pass'] == 508
assert r['commands'][0]['totals']['todo'] == 4 and r['commands'][0]['totals']['fail'] == 0
assert len(s['blobs']) == 98 and len(r['observations']) == 106

# Freeze every pre-run corpus and run record; raw evidence cannot be rewritten.
preserved = []
for line in git('ls-tree', '-r', source, '--', 'spike/corpus/ordering-o4', 'spike/manifests/ordering-o4-runs').splitlines():
    meta, path = line.split('\t', 1)
    preserved.append({'path': path, 'blob': meta.split()[2],
                      'sha256': hashlib.sha256((wt / path).read_bytes()).hexdigest(),
                      'appendOnlyCorrectionAllowed': path.endswith('.md')})
shutil.copytree(raw, target)
shutil.copyfile('/tmp/dap-o4-m1-summary.mjs', target / 'summary.mjs')
shutil.copyfile('/tmp/dap-o4-m1-runner-parser-check.json', target / 'runner-parser-check.json')
shutil.copyfile('/tmp/dap-o4-15b-preserved-evidence.json', target / 'preserved-15b-evidence.json')
write(target / 'preserved-pre-run-evidence.json', {'source': source, 'count': len(preserved), 'files': preserved})
actual_before = (target / 'actual.json').read_bytes()
with (target / 'summary-output.txt').open('w') as output:
    summary = subprocess.run(['node', str(target / 'summary.mjs'), str(wt), str(target)], stdout=output, stderr=subprocess.STDOUT)
assert summary.returncode == 0 and (target / 'actual.json').read_bytes() == actual_before
a = json.loads(actual_before)
assert a['backendIdentityAgreement']

def compact_command(c):
    return {k: v for k, v in c.items() if k not in ['diagnostics', 'unparsedDiagnostics', 'lookupDiagnostics', 'diagnosticNote']}

index = {
    'source': source, 'stage': 'combined M1 noncampaign and typecheck complete',
    'rawResult': prefix + '/result.json', 'sourceIndex': prefix + '/source.json',
    'actualObservations': prefix + '/actual.json', 'identities': r['identities'],
    'commands': [compact_command(c) for c in r['commands']],
    'wrapper': r['wrapper'], 'campaignsRepeated': False,
    'scope': '187 O4 checks are part of the single 512-test invocation, not a separate run. Four executing Club negative TODOs remain by user choice.',
    'diagnostics': {'parsed': len(r['commands'][0]['diagnostics']),
                    'retainedVerbatim': len(r['commands'][0]['unparsedDiagnostics']),
                    'verbatimLines': [d['line'] for d in r['commands'][0]['unparsedDiagnostics']],
                    'note': 'Actual child exits were persisted before diagnostic parsing. The raw TAP and unparsed diagnostic are retained; no wrapper recovery or test rerun was required.'},
    'observations': r['observations'], 'observationFiles': len(r['observations']),
    'actual': a['actual'], 'proofIdentityDefinition': a['proofIdentityDefinition'],
    'backendIdentityAgreement': a['backendIdentityAgreement'],
    'componentMeasurements': {
        'ownEntries': {'source': '8e854c26b30de7a376dc71f5e0e8bf24160aaefa', 'candidate': '4710d3e65b1dbeba16af7b358998c546e967747d', 'focusedPass': 11, 'typecheckExit': 0},
        'docsAndCounts': {'source': 'a9d27c3d0dc15c924bbcc5865ca07e7201d06b4f', 'candidate': 'c14e671ae6e432ed7120b8752248dc5e7856e04a', 'focusedPass': 3, 'typecheckExit': 0},
        'faultRepair': {'runtimeSource': '57745b99b7908ee499426ce4553484dfde572b9d', 'testSource': '37a3e12178923b8198950a332b76c7503fc13c15', 'candidate': '32b69bc8ab9dc150ea6e68198e8871b74dcb9a6e', 'focusedPassAtEach': 41, 'typecheckExitAtEach': 0, 'beforeSeconds': 56.7204088330036, 'afterSeconds': 18.31503258300654, 'diagnosticObjectsExactlyEqual': 11, 'note': 'Single observed pair, not a controlled benchmark or a full-suite speedup claim. Runtime bytes unchanged by test-hook optimization.'},
    },
    'audit': {'sourceConfigurationAndContractBlobs': len(s['blobs']),
              'preRunEvidenceFiles': len(preserved),
              'preRunImmutableRawFiles': sum(not f['appendOnlyCorrectionAllowed'] for f in preserved),
              'historical15bFiles': 680, 'historical15bImmutableRawFiles': 674,
              'catchInventory': 23, 'convertingBodies': 12,
              'faultRowsPerStore': 72, 'sampledStacksPerStore': 12,
              'summaryReproducedFromSavedObservations': True},
    'completedUtc': r['completedUtc'],
}
write(wt / (prefix + '.json'), index)

readme = '''# Combined O4 M1 run 10

Measured source: `79cd00029504deb92c121dbf12859680dfe78358`.

One noncampaign invocation passed 508 of 512 tests, with the four retained
executing Club negatives marked TODO and no failures. All 187 O4 checks are
included in that invocation. Node, typecheck and the recording wrapper each
exited zero. No campaign or repeat full invocation was run.

`runner.py` saves each actual child exit before interpreting TAP diagnostics.
`result.json` was created by that successful runner. It retains 45 parsed JSON
diagnostics and one TAP-escaped diagnostic verbatim; `noncampaign.txt` is the
complete raw output. No repair or recovery of this run was needed. The separate
parser-only check uses historical run 9 output and synthetic input and runs no
repository tests. Run 9's missing child status remains unknown at its source.

`source.json` pins 98 source, fixture, test, contract and configuration blobs;
this broader measurement is distinct from the explicit 16-file runtime id.
All 106 observation files were captured by the tests. `summary.mjs` reads them
without executing a lifecycle or test, reproducing `actual.json` byte for byte.
The preservation indexes retain original evidence boundaries and permit only
explicit append-only Markdown corrections. `record-files.json` hashes this
directory except itself. The adjacent `run-10.json` is a derived index.

M1 catch coverage samples every converting try body on both stores, not every
operation within each body. Nominal SyntaxError, typed Scope errors and the
exact wire-message allowlist remain declared conversion limits. SQLite-only
cleanup cases are not memory cases; a failed rollback or native close is not
guaranteed to release resources. Main approval and landing remain separate.
'''
(target / 'README.md').write_text(readme)
record_files = {str(p.relative_to(target)): 'sha256:' + hashlib.sha256(p.read_bytes()).hexdigest()
                for p in sorted(target.rglob('*')) if p.is_file()}
write(target / 'record-files.json', {'source': source, 'files': record_files})

ledger = wt / 'spike/manifests/ordering-o4.ledger.md'
text = ledger.read_text()
start = text.index('The latest combined measured contract')
end = text.index('\nThe historical combined K1–K4', start)
text = text[:start] + '''The current combined measured contract is run 10 at source
`79cd00029504deb92c121dbf12859680dfe78358`: lifecycle manifest
`sha256:00bdb77671000310c01a1761364285c6e0b1a643b1dc300ab9f419dc82b4988a`
and opening rule `/3`
`sha256:9e9bcbdd74fe244fb63c5e339256ab508b2b3251d2e8fa642b3309cd1f1049e6`.
Run 9 (`f8987d22`, candidate `15b660ca`) remains historical evidence with
manifest `sha256:92ad0023e387cd4a6305d074ab99f7a29cbcc1699cd88b8dcf439a446ef58828`.
Independent approval of the repaired candidate remains pending.
''' + text[end:]
text += '''

## M1 combined run 10: repaired catches, own entries and measured limits

Review `66effd75`, ratification `919baa74` and adoption `739b7bf7` retain the
original request and promise. Source `79cd00029504deb92c121dbf12859680dfe78358`
integrates the own-entry component `4710d3e6`, documentation/count component
`c14e671a` and runtime/test component `32b69bc8`, then pins the measured catch
catalogue before the combined run. These are implementation repairs and
evidence, not an independent approval or a main merge.

[Run 10](ordering-o4-runs/run-10.json) records **512 tests, 508 passes, zero
failures and four retained Club TODOs**, with all **187 O4 checks** in that same
invocation. The actual Node exit is 0, typecheck exit is 0 and wrapper exit is
0. The noncampaign child took 46.517 seconds; no campaign or second combined
invocation ran. Its runner saves child exits before JSON interpretation, keeps
the full raw TAP, parses 45 diagnostics and retains one TAP-escaped diagnostic
verbatim. Run 9's lost child status stays unknown; the earlier recovery files
are not rewritten or retrospectively repaired.

The run pins 98 source/configuration/contract blobs and captures 106 actual
observations. The saved-data summary reproduces the exact backend-agreeing
context/proof identities. Per backend it retains 20 healthy boundaries,
29 adverse cases with 43 steps, and the asserted 209 mutations: 30 destination
mismatches, five unauthorized, 154 invalid genesis, 18 malformed envelopes and
two unsupported profiles. The 55/100/143 historical question counts overlap;
they are not additive scenarios. The new own-entry cases preserve legitimate
property-name facts/packages and still reject altered source bindings.

| Current identity | Value |
| --- | --- |
| Scope implementation | `sha256:96619acc4777bd2f95859901d7f993d75ab1db485f7a49af2da89040c81f1af1` |
| Scope package | `sha256:2f32c21e7336da17596fd86af75a863d2de79651cd050100e19b3958042bba61` |
| Public-opening rule /3 | `sha256:9e9bcbdd74fe244fb63c5e339256ab508b2b3251d2e8fa642b3309cd1f1049e6` |
| Lifecycle manifest | `sha256:00bdb77671000310c01a1761364285c6e0b1a643b1dc300ab9f419dc82b4988a` |
| Inspection package | `sha256:18a886c149b383b8630836307195c1a89b90c463e7e32df6e0663b5d4ecc3030` |
| Sale package | `sha256:cd32a3f52b025b04a885280cebf3078689d505a67d2168dcf6c5f899a51e8a85` |
| Join policy | `sha256:ac852ebab4f55816e55cd0fd71b7280267bffaca097046d4880b24ac63b01455` |

The [catch catalogue](../ordering-catch-boundary.md) accounts for 23 runtime
catches and all 12 converting try bodies, with six unexpected values per body
per store. The combined output retains all 144 converter outcomes and 24
sampled stacks, plus the cold, constructor, policy, inspection, SQL cleanup and
saved-retry controls. Every catch body is sampled; not every operation within
it. The independent component audit is a source-and-record check, not another
test execution or the required workroom review.

The test-only hook refinement was recorded by workroom assertion `a4e55ca2`.
It discards irrelevant operation kinds before constructing a stack. The same
41-check component command took 56.7204 seconds before and 18.3150 seconds
after, with all 11 diagnostic objects exactly equal and runtime bytes unchanged.
This one observed pair supports the bounded test-harness improvement; it is
not a controlled benchmark, general runtime optimization or full-suite speedup.
Both original runs remain retained at their actual source commits.

Nominal parser SyntaxError, exported Scope policy types, exact wire-message
allowlisting and the two precommit verification refusals remain explicit
classification limits. Failed native cleanup is not guaranteed to recover a
resource: the double-fault close mocks perform the real close before throwing,
and failed transaction rollback requires caller disposal. Postfault proof/view
reads, standalone interpretation/export errors and final verification retain
their documented boundaries. Proof-size stranding, deep-input stack exhaustion,
privileged Club standing behavior, refused Inspection audience disclosure,
unexercised real model-unavailability and overlapping guards remain limitations.
The negative Club outcome and Sale repair-budget result are unchanged.

All earlier raw evidence is preserved. The run directory carries the 680-file
15b baseline (674 immutable raw files) and a complete pre-run evidence index.
The only prior corpus correction at this stage is an explicit append to its
README; current ledger headings distinguish current and historical identities.
The final records-only tail must retain every one of the 98 measured blobs and
all 106 observation hashes. Independent exact-head approval and landing remain
pending under the standing authorization.
'''
ledger.write_text(text)
corpus = wt / 'spike/corpus/ordering-o4/README.md'
with corpus.open('a') as stream:
    stream.write('''

## M1 combined run 10

The combined source `79cd00029504deb92c121dbf12859680dfe78358` is recorded in
[run 10](../../manifests/ordering-o4-runs/run-10.json): 512 tests, 508 passes,
four retained Club TODOs, zero failures; all 187 O4 checks are included. Actual
Node, typecheck and wrapper exits are zero. Its 106 observations and 98 source
blobs belong to the new runtime/Scope and manifest identities in that record.
The robust runner retained the TAP-escaped diagnostic without losing child
status. Run 9's original failure/recovery history remains unchanged. The M1
component records retain both the 56.7204- and 18.3150-second focused runs and
their exactly equal diagnostics; this is one observed test-hook comparison.
''')
print(json.dumps({'source': source, 'runDirectory': str(target), 'runFiles': len(record_files) + 1,
                  'preservedPreRunFiles': len(preserved), 'immutablePreRunRawFiles': index['audit']['preRunImmutableRawFiles'],
                  'observations': len(r['observations']), 'sourceBlobs': len(s['blobs'])}, indent=2))
