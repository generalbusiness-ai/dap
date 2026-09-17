from pathlib import Path
import datetime, hashlib, json, os, re, subprocess, time

out = Path(__file__).resolve().parent
wt = Path('/tmp/dap-o4-transfer-lifecycle').resolve()
expected = 'f8987d22890e7cf2471d7124544c539d69c0a835'
def git(*args):
    return subprocess.check_output(['git', *args], cwd=wt, text=True).strip()
def unchanged():
    assert git('rev-parse', 'HEAD') == expected
    assert not git('status', '--porcelain')
unchanged()
raw = (out/'noncampaign.txt').read_text()
totals = {key: int(value) if key != 'duration_ms' else float(value) for key, value in re.findall(r'^# (tests|suites|pass|fail|cancelled|skipped|todo|duration_ms) ([0-9.]+)$', raw, re.M)}
assert totals == {'tests':492,'suites':0,'pass':488,'fail':0,'cancelled':0,'skipped':0,'todo':4,'duration_ms':42880.439375}, totals
diagnostics, unparsed = [], []
for match in re.finditer(r'^# (\{.*\})$', raw, re.M):
    try: diagnostics.append(json.loads(match[1]))
    except json.JSONDecodeError as error:
        unparsed.append({'line': raw[:match.start()].count('\n')+1, 'raw': match[1], 'parseError': str(error)})
o4 = re.findall(r'^(ok|not ok) \d+ - (O4[^\n]+)$',raw,re.M)
result = {
    'source':expected, 'identities':json.loads((out/'identities.json').read_text()),
    'commands':[{
        'name':'noncampaign', 'argv':['node','--test','--test-reporter=tap','--test-skip-pattern=case [57], the campaign:','spike/test/**/*.test.ts'],
        'cwd':str(wt), 'environment':{'DAP_O4_RECORD_DIR':str(out/'observations')},
        'exitCode':None, 'exitCodeNote':'The original wrapper failed during diagnostic parsing after this child completed, before persisting its exit status. Outcomes are established by the complete terminal TAP summary; no child exit code is claimed.',
        'totals':totals, 'o4Subset':{'tests':len(o4),'pass':sum(status=='ok' for status,_ in o4),'fail':sum(status!='ok' for status,_ in o4),'separateInvocation':False},
        'lookupDiagnostics':[d for d in diagnostics if 'totalLookups' in d], 'diagnostics':diagnostics,'unparsedDiagnostics':unparsed,
    }],
    'wrapper':{'exitCode':1,'failedScript':'runner-failed.py','errorRecord':'wrapper-error.txt','failedAfter':'noncampaign completed','recoveryScript':'resume.py','noncampaignRepeated':False},
    'campaignsRepeated':False,
}
(out/'result.json').write_text(json.dumps(result,indent=2)+'\n')
argv = ['npm','run','typecheck','--prefix','spike']
started=time.monotonic()
with (out/'typecheck.txt').open('w') as output:
    process=subprocess.run(argv,cwd=wt,stdout=output,stderr=subprocess.STDOUT)
result['commands'].append({'name':'typecheck','argv':argv,'cwd':str(wt),'exitCode':process.returncode,'seconds':time.monotonic()-started,'recoveryInvocation':True})
unchanged()
result['observations']={path.name:'sha256:'+hashlib.sha256(path.read_bytes()).hexdigest() for path in sorted((out/'observations').glob('*.json'))}
result['completedUtc']=datetime.datetime.now(datetime.timezone.utc).isoformat()
(out/'result.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'source':expected,'totals':totals,'o4Subset':result['commands'][0]['o4Subset'],'typecheckExit':process.returncode,'observations':len(result['observations']),'parsedDiagnostics':len(diagnostics),'unparsedDiagnostics':len(unparsed),'testExitCodeRecorded':False},indent=2))
raise SystemExit(process.returncode)
