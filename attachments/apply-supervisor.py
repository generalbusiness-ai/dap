from pathlib import Path
import datetime, hashlib, json, os, re, resource, shutil, subprocess, threading, time

# PLAN ONLY. Root must review the complete file/hash and grant one invocation.
ROOT = Path('/Users/hughpyle/play/artroom/.builder-worktrees/nf5-browser-custody-20261113')
SEALED = Path('/Users/hughpyle/play/artroom-evidence/2026-11-14-nf5-identifiers-attempt2')
OUT = Path('/Users/hughpyle/play/artroom-evidence/2026-11-14-nf5-identifiers-apply-attempt1')
NODE = Path('/opt/homebrew/bin/node')
WRAPPER = Path('/tmp/artroom-nf5-execution-plan-20261114/refresh-identifiers.mjs')
HEAD = '37c1092133c2829a16688f1c595bb0983fc03b70'
TREE = 'dd944b1a3736177809d91cd3e4a8596c0d376095'
MAIN = '918ce5d73c215154d88005b74c2a97b58d61880a'
MAIN_TREE = '411d30aca4e08bbc587af5f66a808a7ffc55396f'
LOCK = 'f2885ca573c095141efbca99a7260d211beb9ae38a7f1b139ce234dc79568b54'
NODE_HASH = 'a56388d53be92f39c69f60e25f18ef2d6c84b9692c67ac03fe4f9f208c40c208'
WRAPPER_HASH = '80712e3e5dde832f2b75413f6d5ed7f213054842ff8d34998db89b7c76b4d7ac'
MANIFEST_HASH = '11f3f3381aa1df4b4f2be6e3d7fc9fb64d4585f159ab996c0464ba8d3ce1c18f'
SUMS_HASH = '4746b8d78256fa43b153e49d96dc0dd8f7ce2f554b405665dcf1ff2fde3c4ffd'
RECEIPT_HASH = 'd4d25b3f2129d3b441cd2e2549b7aa82ec7f55250364a6257c25961280215b2c'
TARGETS = ['examples/grow/release-identifiers.json', 'examples/lending/release-identifiers.json', 'apps/counter/release-identifiers.json']
CHANGED = set(TARGETS[1:])
NAMES = ['Grow', 'Lending', 'Counter']
VERSIONS = ['2.0.0', '0.2.0', '0.2.0']

def utc(): return datetime.datetime.now(datetime.timezone.utc).isoformat()
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def command(args): return subprocess.check_output(args, cwd=ROOT, text=True)
def save(name, value): (OUT/name).write_text(json.dumps(value, indent=2)+'\n')

def sealed_fence():
    paths = list(SEALED.rglob('*'))
    assert not any(path.is_symlink() for path in paths)
    assert all(path.stat().st_mode & 0o222 == 0 for path in [SEALED]+paths)
    assert sha(SEALED/'seal-manifest.json') == MANIFEST_HASH
    assert sha(SEALED/'SHA256SUMS') == SUMS_HASH
    receipt = SEALED.parent/(SEALED.name+'.seal-receipt.json')
    assert sha(receipt) == RECEIPT_HASH and receipt.stat().st_mode & 0o222 == 0
    entries = {}
    for line in (SEALED/'SHA256SUMS').read_text().splitlines():
        digest, name = line.split('  ', 1)
        assert name not in entries and (SEALED/name).resolve().is_relative_to(SEALED)
        assert sha(SEALED/name) == digest
        entries[name] = digest
    actual = {str(path.relative_to(SEALED)) for path in paths if path.is_file()}
    assert len(entries) == 32 and actual == set(entries)|{'SHA256SUMS'}
    manifest = json.loads((SEALED/'seal-manifest.json').read_text())
    assert len(manifest['files']) == 31
    for row in manifest['files']:
        path = SEALED/row['path']
        assert entries[row['path']] == row['sha256'] and path.stat().st_size == row['bytes']
    return {'entries':entries,'manifest':MANIFEST_HASH,'sums':SUMS_HASH,'receipt':RECEIPT_HASH}

def inventory(view):
    rows = {}
    for directory, dirs, files in os.walk(view, followlinks=False):
        for name in list(dirs)+files:
            path = Path(directory)/name; key = str(path.relative_to(ROOT))
            if path.is_symlink():
                assert path.resolve().is_relative_to(ROOT)
                rows[key] = {'link':os.readlink(path),'target':str(path.resolve())}
            elif path.is_file(): rows[key] = {'sha256':sha(path),'bytes':path.stat().st_size}
    return rows

def snapshot(clean):
    assert command(['git','rev-parse','HEAD']).strip() == HEAD
    assert command(['git','rev-parse','HEAD^{tree}']).strip() == TREE
    main = {ref:command(['git','rev-parse',ref]).strip() for ref in ['refs/heads/main','refs/remotes/origin/main']}
    assert all(value == MAIN for value in main.values())
    assert command(['git','rev-parse','refs/heads/main^{tree}']).strip() == MAIN_TREE
    status = command(['git','status','--porcelain','--untracked-files=all'])
    if clean: assert status.strip() == ''
    tracked = {}
    for name in filter(None, subprocess.check_output(['git','ls-files','-z'],cwd=ROOT).decode().split('\0')):
        path = ROOT/name
        tracked[name] = {'link':os.readlink(path)} if path.is_symlink() else {'sha256':sha(path),'bytes':path.stat().st_size}
    modules = ROOT/'node_modules'
    assert modules.is_dir() and not modules.is_symlink()
    assert sha(ROOT/'package-lock.json') == LOCK and (modules/'.artroom-lock-sha256').read_text().strip() == LOCK
    lock = json.loads((ROOT/'package-lock.json').read_text()); bindings = {}; views = {}; workspace = {}
    for key, entry in lock['packages'].items():
        if not key.startswith('node_modules/') or not entry.get('link'): continue
        path = ROOT/key; target = (ROOT/entry['resolved']).resolve()
        assert path.is_symlink() and path.resolve() == target and target.is_relative_to(ROOT)
        package = json.loads((path/'package.json').read_text())
        assert package['name'] == key[len('node_modules/'):]
        bindings[key] = {'link':os.readlink(path),'target':str(target),'name':package['name'],'exports':package.get('exports')}
        view = target/'node_modules'
        if view.exists() or view.is_symlink():
            assert view.resolve().is_relative_to(ROOT)
            views[str(view.relative_to(ROOT))] = {'target':str(view.resolve()),'link':os.readlink(view) if view.is_symlink() else None}
            workspace.update(inventory(view))
    assert len(bindings) == 15 and sha(NODE) == NODE_HASH and sha(WRAPPER) == WRAPPER_HASH
    return {'time':utc(),'head':HEAD,'tree':TREE,'main':main,'mainTree':MAIN_TREE,'status':status,'tracked':tracked,
      'dependencies':inventory(modules),'bindings':bindings,'workspaceViews':views,'workspaceDependencies':workspace,
      'tools':{'node':sha(NODE),'wrapper':sha(WRAPPER),'supervisor':sha(Path(__file__))},'sealedOriginal':sealed_fence()}

def active_ac_mode(custom):
    profiles = re.findall(r'(?m)^AC Power:[ \t]*\n((?:^[ \t].*(?:\n|$))*)', custom)
    if len(profiles) != 1: return {'ok':False,'reason':'Missing or duplicate AC profile'}
    fields = {'powermode':[], 'lowpowermode':[]}
    for line in profiles[0].splitlines():
        parts = line.split()
        if not parts or parts[0] not in fields: continue
        if len(parts) != 2 or not parts[1].isdigit(): return {'ok':False,'reason':'Malformed AC mode field'}
        fields[parts[0]].append(int(parts[1]))
    modern, legacy = fields['powermode'], fields['lowpowermode']
    if not modern and not legacy: return {'ok':False,'reason':'Missing AC mode field'}
    if len(set(modern+legacy)) != 1: return {'ok':False,'reason':'Conflicting AC mode values','fields':fields}
    field = 'powermode' if modern else 'lowpowermode'; value = fields[field][0]
    return {'ok':value == 0,'field':field,'value':value,'fields':fields}

OUT.mkdir(mode=0o700)
shutil.copy2(__file__,OUT/'supervisor.py')
save('supervisor-hash.json',{'sha256':sha(Path(__file__)),'time':utc()})
stop = threading.Event(); power_bad = threading.Event(); power_lock = threading.Lock()
def power(label):
    try:
        battery = command(['pmset','-g','batt']); custom = command(['pmset','-g','custom']); mode = active_ac_mode(custom)
        ok = "Now drawing from 'AC Power'" in battery and mode['ok']
        row = {'time':utc(),'label':label,'ok':ok,'activeAcMode':mode,'battery':battery,'custom':custom}
    except BaseException as error:
        ok = False; row = {'time':utc(),'label':label,'ok':False,'errorType':type(error).__name__,'error':str(error)}
    with power_lock:
        with (OUT/'power.jsonl').open('a') as stream: stream.write(json.dumps(row)+'\n')
    if not ok: power_bad.set()
def sampling():
    try:
        while not stop.wait(15): power('interval15s')
    except BaseException as error:
        power_bad.set(); save('monitor-failure.json',{'time':utc(),'type':type(error).__name__,'message':str(error)})

power('before-preflight'); sampler = threading.Thread(target=sampling,daemon=True); sampler.start()
child = None; terminal_sampled = False
try:
    before = snapshot(True); save('before-inputs.json',before)
    record = json.loads((SEALED/'comparison/comparison.json').read_text())
    assert record['head'] == HEAD and record['tree'] == TREE and len(record['records']) == 3
    copy = OUT/'comparison-copy'; copy.mkdir(mode=0o700); copied = []
    for name in ['comparison.json']+[kind+'.'+suffix+'.json' for kind in ['grow','lending','counter'] for suffix in ['original','candidate']]:
        relative = 'comparison/'+name; original = SEALED/relative
        assert sha(original) == before['sealedOriginal']['entries'][relative]
        with (copy/name).open('xb') as stream: stream.write(original.read_bytes())
        assert sha(copy/name) == sha(original)
        copied.append({'source':str(original),'copy':str(copy/name),'sha256':sha(original)})
    for index, row in enumerate(record['records']):
        assert row['name'] == NAMES[index] and row['version'] == VERSIONS[index] and row['path'] == TARGETS[index]
        assert row['originalFile'] == NAMES[index].lower()+'.original.json' and row['candidateFile'] == NAMES[index].lower()+'.candidate.json'
        assert sha(copy/row['originalFile']) == row['originalSha256'] and sha(copy/row['candidateFile']) == row['candidateSha256']
        old = json.loads((copy/row['originalFile']).read_text()); new = json.loads((copy/row['candidateFile']).read_text())
        delta = {key for key in set(old)|set(new) if old.get(key) != new.get(key)}
        assert delta == (set() if index == 0 else {'presentation'})
        assert row['identifiersChanged'] is (index != 0)
        assert sha(ROOT/row['path']) == row['originalSha256']
    save('copy-provenance.json',copied)
    (OUT/'processes-before.txt').write_text(command(['ps','-axo','pid=,ppid=,args=']))
    power('before-invocation'); assert not power_bad.is_set()
    argv = [str(NODE),str(WRAPPER),'apply',str(ROOT),str(copy),HEAD,TREE]
    save('command.json',{'time':utc(),'cwd':str(ROOT),'argv':argv,'qualification':'Apply retained identifiers only; no import loader, pack, public packet, test or compiler'})
    started = time.monotonic(); usage = resource.getrusage(resource.RUSAGE_CHILDREN)
    with (OUT/'stdout.log').open('wb') as stdout, (OUT/'stderr.log').open('wb') as stderr:
        child = subprocess.Popen(argv,cwd=ROOT,stdout=stdout,stderr=stderr)
        save('process.json',{'time':utc(),'pid':child.pid,'supervisorPid':os.getpid()})
        print(json.dumps({'pid':child.pid,'supervisorPid':os.getpid(),'evidence':str(OUT)}),flush=True)
        while child.poll() is None:
            if power_bad.is_set() or time.monotonic()-started > 60:
                child.terminate(); child.wait(timeout=30); raise RuntimeError('Power drift or bounded apply timeout; no retry or rollback')
            time.sleep(0.1)
    used = resource.getrusage(resource.RUSAGE_CHILDREN)
    save('result.json',{'time':utc(),'exitCode':child.returncode,'wallSeconds':time.monotonic()-started,'userSeconds':used.ru_utime-usage.ru_utime,'systemSeconds':used.ru_stime-usage.ru_stime})
    (OUT/'status-after.txt').write_text(command(['git','status','--porcelain','--untracked-files=all']))
    (OUT/'diff-after.patch').write_text(command(['git','diff','--no-ext-diff','--binary','HEAD','--']))
    power('after-invocation'); after = snapshot(False); save('after-inputs.json',after)
    actual_changed = {key for key in set(before['tracked'])|set(after['tracked']) if before['tracked'].get(key) != after['tracked'].get(key)}
    unchanged = all(before[key] == after[key] for key in ['head','tree','main','mainTree','dependencies','bindings','workspaceViews','workspaceDependencies','tools','sealedOriginal'])
    unstaged = set(filter(None,command(['git','diff','--name-only','HEAD','--']).splitlines()))
    no_staged = not command(['git','diff','--cached','--name-only']).strip()
    no_untracked = not command(['git','ls-files','--others','--exclude-standard']).strip()
    expected_bytes = all(sha(ROOT/row['path']) == row['candidateSha256'] for row in record['records'])
    applied = json.loads((copy/'applied.json').read_text())
    assert applied['head'] == HEAD and applied['tree'] == TREE and set(applied['changed']) == CHANGED
    (OUT/'processes-after.txt').write_text(command(['ps','-axo','pid=,ppid=,args=']))
    stop.set(); sampler.join(timeout=2)
    if sampler.is_alive(): power_bad.set()
    power('terminal'); terminal_sampled = True
    verdict = {'time':utc(),'expectedPaths':sorted(CHANGED),'actualChangedPaths':sorted(actual_changed),'otherFencesEqual':unchanged,'candidateBytesMatch':expected_bytes,'noStagedChanges':no_staged,'noUntrackedFiles':no_untracked,'powerStayedACMode0':not power_bad.is_set(),'monitorStopped':not sampler.is_alive()}
    save('mutation-fence-result.json',verdict)
    assert child.returncode == 0 and actual_changed == CHANGED and unstaged == CHANGED and unchanged and expected_bytes and no_staged and no_untracked and not power_bad.is_set()
    print(json.dumps({'terminal':True,'exitCode':child.returncode,'expectedTwoPathDiff':True,'evidence':str(OUT)}),flush=True)
except BaseException as error:
    save('supervisor-failure.json',{'time':utc(),'type':type(error).__name__,'message':str(error)})
    raise
finally:
    stop.set(); sampler.join(timeout=2)
    if not terminal_sampled: power('terminal-after-failure')
