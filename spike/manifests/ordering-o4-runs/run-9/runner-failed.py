#!/usr/bin/env python3
"""Execute only after root supplies the final frozen combined source SHA."""
from pathlib import Path
import datetime, hashlib, json, os, re, subprocess, sys, time

wt = Path(sys.argv[1]).resolve()
expected = sys.argv[2]
out = Path(sys.argv[3]).resolve()
def git(*args):
    return subprocess.check_output(['git', *args], cwd=wt, text=True).strip()
def unchanged():
    assert git('rev-parse', 'HEAD') == expected, 'source HEAD changed'
    assert not git('status', '--porcelain'), 'source worktree is not clean'
unchanged()
out.mkdir(parents=True, exist_ok=False)
obs = out / 'observations'
obs.mkdir()
source = {'source': expected, 'tree': git('rev-parse', 'HEAD^{tree}'), 'node': subprocess.check_output(['node','--version'], text=True).strip(), 'startedUtc': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'blobs': {}}
for line in git('ls-tree', '-r', 'HEAD', '--', 'spike/src', 'spike/fixtures', 'spike/test', 'spike/manifests/ordering-lifecycle.ts', 'spike/manifests/ordering-lifecycle.md', 'spike/ordering-profile.md', 'spike/package.json', 'spike/package-lock.json', 'spike/tsconfig.json').splitlines():
    metadata, name = line.split('\t',1)
    source['blobs'][name] = metadata.split()[2]
(out/'source.json').write_text(json.dumps(source,indent=2)+'\n')
identity_script = r'''
import { pathToFileURL } from 'node:url';
const base = pathToFileURL(process.env.O4_SOURCE + '/spike/');
const load = name => import(new URL(name, base));
const [{scopeImplementationId,SCOPE_PROFILE,JOIN_POLICY_ID},{scopePackage},{inspectionPackage},{salePackage},{PUBLIC_PROOF_RULE_ID},{ORDERING_LIFECYCLE_MANIFEST_ID,PUBLIC_OPENING_RULE_ID},{HANDOVER_PROFILE}] = await Promise.all(['src/scope-profile.ts','src/scope-package.ts','fixtures/inspection.ts','fixtures/sale.ts','src/scope-proof.ts','manifests/ordering-lifecycle.ts','src/ordering.ts'].map(load));
console.log(JSON.stringify({scopeImplementation:scopeImplementationId(),scopeProfile:SCOPE_PROFILE,scopePackage:scopePackage.id,inspectionPackage:inspectionPackage.id,salePackage:salePackage.id,publicProofRule:PUBLIC_PROOF_RULE_ID,manifestPublicRule:PUBLIC_OPENING_RULE_ID,manifest:ORDERING_LIFECYCLE_MANIFEST_ID,joinPolicy:JOIN_POLICY_ID,movableWriterProfile:HANDOVER_PROFILE},null,2));
'''
env = dict(os.environ, O4_SOURCE=str(wt), DAP_O4_RECORD_DIR=str(obs))
ident = subprocess.check_output(['node','--input-type=module','-'],input=identity_script,text=True,env=env,cwd=wt)
(out/'identities.json').write_text(ident)
assert json.loads(ident)['publicProofRule'] == json.loads(ident)['manifestPublicRule'], 'manifest and runtime rule differ'
result = {'source':expected,'identities':json.loads(ident),'commands':[], 'campaignsRepeated':False}
commands = [
 ('noncampaign',['node','--test','--test-reporter=tap','--test-skip-pattern=case [57], the campaign:','spike/test/**/*.test.ts']),
 ('typecheck',['npm','run','typecheck','--prefix','spike']),
]
for name, argv in commands:
    unchanged()
    started=time.monotonic()
    with (out/(name+'.txt')).open('w') as output:
        process=subprocess.run(argv,cwd=wt,env=env,stdout=output,stderr=subprocess.STDOUT)
    record={'name':name,'argv':argv,'cwd':str(wt),'environment':{'DAP_O4_RECORD_DIR':str(obs)},'exitCode':process.returncode,'seconds':time.monotonic()-started}
    if name == 'noncampaign':
        raw=(out/(name+'.txt')).read_text()
        record['totals']={key:int(value) if key!='duration_ms' else float(value) for key,value in re.findall(r'^# (tests|suites|pass|fail|cancelled|skipped|todo|duration_ms) ([0-9.]+)$',raw,re.M)}
        o4=re.findall(r'^(ok|not ok) \d+ - (O4[^\n]+)$',raw,re.M)
        record['o4Subset']={'tests':len(o4),'pass':sum(status=='ok' for status,_ in o4),'fail':sum(status!='ok' for status,_ in o4),'separateInvocation':False}
        record['lookupDiagnostics']=[json.loads(match) for match in re.findall(r'^# (\{.*"totalLookups".*\})$',raw,re.M)]
        record['diagnostics']=[json.loads(match) for match in re.findall(r'^# (\{.*\})$',raw,re.M)]
    result['commands'].append(record)
    (out/'result.json').write_text(json.dumps(result,indent=2)+'\n')
    print(name,process.returncode,round(record['seconds'],3),flush=True)
    unchanged()
result['observations']={path.name:'sha256:'+hashlib.sha256(path.read_bytes()).hexdigest() for path in sorted(obs.glob('*.json'))}
result['completedUtc']=datetime.datetime.now(datetime.timezone.utc).isoformat()
(out/'result.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'source':expected,'observations':len(result['observations']),'commands':result['commands']},indent=2),flush=True)
sys.exit(0 if all(c['exitCode']==0 for c in result['commands']) else 1)
