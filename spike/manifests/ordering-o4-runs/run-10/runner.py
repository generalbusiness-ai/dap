#!/usr/bin/env python3
"""Measure a frozen O4 source once; persist child status before TAP parsing."""
from pathlib import Path
import datetime
import hashlib
import json
import os
import re
import subprocess
import sys
import time
import traceback


def parse_tap(raw):
    diagnostics, unparsed = [], []
    for number, line in enumerate(raw.splitlines(), 1):
        if not line.startswith('# {') or not line.endswith('}'):
            continue
        candidate = line[2:]
        try:
            diagnostics.append(json.loads(candidate))
        except json.JSONDecodeError as error:
            unparsed.append({'line': number, 'raw': candidate, 'parseError': str(error)})
    o4 = re.findall(r'^(ok|not ok) \d+ - (O4[^\n]+)$', raw, re.M)
    return {
        'totals': {key: float(value) if key == 'duration_ms' else int(value)
                   for key, value in re.findall(r'^# (tests|suites|pass|fail|cancelled|skipped|todo|duration_ms) ([0-9.]+)$', raw, re.M)},
        'o4Subset': {'tests': len(o4), 'pass': sum(status == 'ok' for status, _ in o4),
                     'fail': sum(status != 'ok' for status, _ in o4), 'separateInvocation': False},
        'lookupDiagnostics': [item for item in diagnostics if isinstance(item, dict) and 'totalLookups' in item],
        'diagnostics': diagnostics,
        'unparsedDiagnostics': unparsed,
        'diagnosticNote': 'Only valid JSON diagnostics are parsed. TAP-escaped or other invalid JSON remains verbatim here and in the complete raw TAP; diagnostic parsing never substitutes for the child exit status.',
    }


def main():
    wt, expected, out = Path(sys.argv[1]).resolve(), sys.argv[2], Path(sys.argv[3]).resolve()

    def git(*args):
        return subprocess.check_output(['git', *args], cwd=wt, text=True).strip()

    def unchanged():
        assert git('rev-parse', 'HEAD') == expected, 'source HEAD changed'
        assert not git('status', '--porcelain'), 'source worktree is not clean'

    unchanged()
    out.mkdir(parents=True, exist_ok=False)
    obs = out / 'observations'
    obs.mkdir()
    source = {'source': expected, 'tree': git('rev-parse', 'HEAD^{tree}'),
              'node': subprocess.check_output(['node', '--version'], text=True).strip(),
              'startedUtc': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'blobs': {}}
    for line in git('ls-tree', '-r', 'HEAD', '--', 'spike/src', 'spike/fixtures', 'spike/test',
                    'spike/manifests/ordering-lifecycle.ts', 'spike/manifests/ordering-lifecycle.md',
                    'spike/ordering-profile.md', 'spike/ordering-catch-boundary.md',
                    'spike/package.json', 'spike/package-lock.json', 'spike/tsconfig.json').splitlines():
        metadata, name = line.split('\t', 1)
        source['blobs'][name] = metadata.split()[2]
    (out / 'source.json').write_text(json.dumps(source, indent=2) + '\n')
    (out / 'runner.py').write_bytes(Path(__file__).read_bytes())
    result = {'source': expected, 'commands': [], 'campaignsRepeated': False, 'wrapper': {'status': 'running'}}

    def persist():
        temp = out / 'result.json.tmp'
        with temp.open('w') as stream:
            stream.write(json.dumps(result, indent=2) + '\n')
            stream.flush()
            os.fsync(stream.fileno())
        temp.replace(out / 'result.json')

    persist()
    try:
        identity_script = r'''
import { pathToFileURL } from 'node:url';
const base = pathToFileURL(process.env.O4_SOURCE + '/spike/');
const load = name => import(new URL(name, base));
const [{scopeImplementationId,SCOPE_PROFILE,JOIN_POLICY_ID},{scopePackage},{inspectionPackage},{salePackage},{PUBLIC_PROOF_RULE_ID},{ORDERING_LIFECYCLE_MANIFEST_ID,PUBLIC_OPENING_RULE_ID},{HANDOVER_PROFILE}] = await Promise.all(['src/scope-profile.ts','src/scope-package.ts','fixtures/inspection.ts','fixtures/sale.ts','src/scope-proof.ts','manifests/ordering-lifecycle.ts','src/ordering.ts'].map(load));
console.log(JSON.stringify({scopeImplementation:scopeImplementationId(),scopeProfile:SCOPE_PROFILE,scopePackage:scopePackage.id,inspectionPackage:inspectionPackage.id,salePackage:salePackage.id,publicProofRule:PUBLIC_PROOF_RULE_ID,manifestPublicRule:PUBLIC_OPENING_RULE_ID,manifest:ORDERING_LIFECYCLE_MANIFEST_ID,joinPolicy:JOIN_POLICY_ID,movableWriterProfile:HANDOVER_PROFILE},null,2));
'''
        env = dict(os.environ, O4_SOURCE=str(wt), DAP_O4_RECORD_DIR=str(obs))
        ident = subprocess.check_output(['node', '--input-type=module', '-'], input=identity_script, text=True, env=env, cwd=wt)
        (out / 'identities.json').write_text(ident)
        result['identities'] = json.loads(ident)
        assert result['identities']['publicProofRule'] == result['identities']['manifestPublicRule'], 'manifest and runtime rule differ'
        persist()
        commands = [
            ('noncampaign', ['node', '--test', '--test-reporter=tap', '--test-skip-pattern=case [57], the campaign:', 'spike/test/**/*.test.ts']),
            ('typecheck', ['npm', 'run', 'typecheck', '--prefix', 'spike']),
        ]
        for name, argv in commands:
            unchanged()
            record = {'name': name, 'argv': argv, 'cwd': str(wt),
                      'environment': {'DAP_O4_RECORD_DIR': str(obs)}, 'status': 'running', 'exitCode': None}
            result['commands'].append(record)
            persist()
            started = time.monotonic()
            output_path = out / (name + '.txt')
            with output_path.open('w') as output:
                process = subprocess.run(argv, cwd=wt, env=env, stdout=output, stderr=subprocess.STDOUT)
            record.update(status='completed', exitCode=process.returncode, seconds=time.monotonic() - started)
            # Persist the actual child status before any diagnostic interpretation.
            persist()
            record['outputSha256'] = 'sha256:' + hashlib.sha256(output_path.read_bytes()).hexdigest()
            if name == 'noncampaign':
                record.update(parse_tap(output_path.read_text()))
                assert all(key in record['totals'] for key in ['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo']), 'terminal TAP summary incomplete'
            persist()
            print(name, process.returncode, round(record['seconds'], 3), flush=True)
            unchanged()
        result['observations'] = {path.name: 'sha256:' + hashlib.sha256(path.read_bytes()).hexdigest() for path in sorted(obs.glob('*.json'))}
        exit_code = 0 if all(record['exitCode'] == 0 for record in result['commands']) else 1
        result['completedUtc'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        result['wrapper'] = {'status': 'completed', 'exitCode': exit_code}
        persist()
        print(json.dumps({'source': expected, 'sourceBlobCount': len(source['blobs']), 'observations': len(result['observations']),
                          'commands': [{key: record[key] for key in ['name', 'exitCode', 'seconds']} for record in result['commands']],
                          'totals': result['commands'][0]['totals'], 'o4Subset': result['commands'][0]['o4Subset'],
                          'unparsedDiagnostics': len(result['commands'][0]['unparsedDiagnostics'])}, indent=2), flush=True)
        return exit_code
    except BaseException as error:
        result['wrapper'] = {'status': 'failed', 'exitCode': 1, 'exceptionType': type(error).__name__, 'error': str(error)}
        (out / 'wrapper-error.txt').write_text(traceback.format_exc())
        persist()
        raise


if __name__ == '__main__':
    raise SystemExit(main())
