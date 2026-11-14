from pathlib import Path
import datetime, hashlib, json, os, re, resource, shutil, signal, subprocess, threading, time

# Unexecuted plan. Root must review this exact file/hash before granting it.
ROOT = Path('/Users/hughpyle/play/artroom/.builder-worktrees/nf5-browser-custody-20261113')
OUT = Path('/Users/hughpyle/play/artroom-evidence/2026-11-14-nf5-reproduction-attempt1')
NODE = Path('/opt/homebrew/bin/node')
HEAD = '0012cdf93d4bc8d7b3a0212f5ec9c74cbaa33f87'
TREE = '009a3609359a809013967225f0f5e470375d13d6'
MAIN = '918ce5d73c215154d88005b74c2a97b58d61880a'
MAIN_TREE = '411d30aca4e08bbc587af5f66a808a7ffc55396f'
LOCK = 'f2885ca573c095141efbca99a7260d211beb9ae38a7f1b139ce234dc79568b54'
NODE_HASH = 'a56388d53be92f39c69f60e25f18ef2d6c84b9692c67ac03fe4f9f208c40c208'
OWNER = 'packages/cli/test/application-release-reproduction.test.ts'
TITLE = 'Grow, Lending and Counter reproduce their reviewed definition and presentation identifiers from canonical sources'

def utc(): return datetime.datetime.now(datetime.timezone.utc).isoformat()
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def command(args): return subprocess.check_output(args,cwd=ROOT,text=True)
def save(name,value): (OUT/name).write_text(json.dumps(value,indent=2)+'\n')

def inventory(view, excluded=()):
    rows = {}
    if not view.exists():
        assert not view.is_symlink()
        return rows
    assert view.is_dir() and not view.is_symlink() and view.resolve().is_relative_to(ROOT)
    for directory, dirs, files in os.walk(view,followlinks=False):
        base = Path(directory)
        dirs[:] = [name for name in dirs if base/name not in excluded]
        for name in list(dirs)+files:
            path = base/name; key = str(path.relative_to(ROOT))
            if path.is_symlink():
                assert path.resolve().is_relative_to(ROOT)
                rows[key] = {'link':os.readlink(path),'target':str(path.resolve())}
            elif path.is_file(): rows[key] = {'sha256':sha(path),'bytes':path.stat().st_size}
    return rows

def snapshot(label):
    assert command(['git','rev-parse','HEAD']).strip() == HEAD
    assert command(['git','rev-parse','HEAD^{tree}']).strip() == TREE
    main = {ref:command(['git','rev-parse',ref]).strip() for ref in ['refs/heads/main','refs/remotes/origin/main']}
    assert all(value == MAIN for value in main.values())
    assert command(['git','rev-parse','refs/heads/main^{tree}']).strip() == MAIN_TREE
    assert command(['git','status','--porcelain','--untracked-files=all']).strip() == ''
    tracked = {}
    for name in filter(None,subprocess.check_output(['git','ls-files','-z'],cwd=ROOT).decode().split('\0')):
        path = ROOT/name
        tracked[name] = {'link':os.readlink(path)} if path.is_symlink() else {'sha256':sha(path),'bytes':path.stat().st_size}
    modules = ROOT/'node_modules'
    assert modules.is_dir() and not modules.is_symlink()
    assert sha(ROOT/'package-lock.json') == LOCK and (modules/'.artroom-lock-sha256').read_text().strip() == LOCK
    bindings = {}; views = [modules]
    for key, entry in json.loads((ROOT/'package-lock.json').read_text())['packages'].items():
        if not key.startswith('node_modules/') or not entry.get('link'): continue
        path = ROOT/key; target = (ROOT/entry['resolved']).resolve()
        assert path.is_symlink() and path.resolve() == target and target.is_relative_to(ROOT)
        package = json.loads((path/'package.json').read_text())
        assert package['name'] == key[len('node_modules/'):]
        bindings[key] = {'link':os.readlink(path),'target':str(target),'name':package['name'],'exports':package.get('exports')}
        views.append(target/'node_modules')
    assert len(bindings) == 15
    assert sorted(path.name for path in (modules/'@generalbusiness').iterdir()) == sorted(name.split('/')[-1] for name in bindings)
    cache_roots = {view/name for view in views for name in ['.vite','.vite-temp']}
    immutable = {}; mutable = {}
    for view in views: immutable.update(inventory(view,cache_roots))
    for cache in sorted(cache_roots):
        key = str(cache.relative_to(ROOT))
        mutable[key] = {'present':cache.exists(),'files':inventory(cache)}
        if cache.exists(): shutil.copytree(cache,OUT/('mutable-cache-'+label)/key)
    assert sha(NODE) == NODE_HASH
    versions = {name:json.loads((modules/name/'package.json').read_text())['version'] for name in ['vitest','vite','tsx','esbuild','typescript']}
    assert versions['vitest'] == '4.1.12'
    return {'time':utc(),'head':HEAD,'tree':TREE,'main':main,'mainTree':MAIN_TREE,'tracked':tracked,'bindings':bindings,
      'dependencyViews':[str(view.relative_to(ROOT)) for view in views],'immutableInstalledBytes':immutable,'mutableCaches':mutable,
      'tools':{'node':{'path':str(NODE),'resolved':str(NODE.resolve()),'sha256':sha(NODE)},'supervisor':sha(Path(__file__))},'versions':versions}

def active_ac_mode(custom):
    profiles = re.findall(r'(?m)^AC Power:[ \t]*\n((?:^[ \t].*(?:\n|$))*)',custom)
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
temporary = OUT/'temp'; temporary.mkdir(mode=0o700)
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
    before = snapshot('before'); save('before-inputs.json',before)
    save('case-plan.json',{'wholeOwner':OWNER,'project':'cli','pool':'threads','cases':[TITLE],'expectedTests':1,'compilers':[],'collectionRuns':0})
    argv = [str(NODE),str(ROOT/'node_modules/vitest/vitest.mjs'),'run','--config','vitest.plain.config.ts','--project','cli',OWNER,
      '--allowOnly=false','--passWithNoTests=false','--reporter=verbose','--reporter=json','--outputFile.json='+str(OUT/'vitest.json')]
    env = os.environ.copy()
    cleared = [key for key in env if key.startswith('ARTROOM_TEST_') or key in ['ARTROOM_SCALE_MODE','VITEST_MAX_WORKERS','NODE_OPTIONS','NODE_TEST_CONTEXT']]
    for key in cleared: env.pop(key,None)
    env.update({'TMPDIR':str(temporary),'NODE_COMPILE_CACHE':str(temporary/'node-compile-cache'),'npm_config_offline':'true','npm_config_yes':'false'})
    save('command.json',{'time':utc(),'cwd':str(ROOT),'argv':argv,'clearedEnvironmentKeys':cleared,'environmentOverrides':{key:env[key] for key in ['TMPDIR','NODE_COMPILE_CACHE','npm_config_offline','npm_config_yes']},'qualification':'One normal R1 whole owner; no compiler, collection or separate pack'})
    (OUT/'processes-before.txt').write_text(command(['ps','-axo','pid=,ppid=,args=']))
    power('before-invocation'); assert not power_bad.is_set()
    started = time.monotonic(); usage = resource.getrusage(resource.RUSAGE_CHILDREN)
    with (OUT/'stdout.log').open('wb') as stdout,(OUT/'stderr.log').open('wb') as stderr:
        child = subprocess.Popen(argv,cwd=ROOT,env=env,stdout=stdout,stderr=stderr,start_new_session=True)
        save('process.json',{'time':utc(),'pid':child.pid,'supervisorPid':os.getpid()})
        print(json.dumps({'pid':child.pid,'supervisorPid':os.getpid(),'evidence':str(OUT)}),flush=True)
        while child.poll() is None:
            if power_bad.is_set() or time.monotonic()-started > 600:
                os.killpg(child.pid,signal.SIGTERM)
                try: child.wait(timeout=30)
                except subprocess.TimeoutExpired: os.killpg(child.pid,signal.SIGKILL); child.wait()
                raise RuntimeError('Power drift or bounded reproduction timeout; no retry')
            time.sleep(0.25)
    used = resource.getrusage(resource.RUSAGE_CHILDREN)
    save('result.json',{'time':utc(),'exitCode':child.returncode,'signal':-child.returncode if child.returncode < 0 else None,'wallSeconds':time.monotonic()-started,'userSeconds':used.ru_utime-usage.ru_utime,'systemSeconds':used.ru_stime-usage.ru_stime})
    power('after-invocation'); after = snapshot('after'); save('after-inputs.json',after)
    fixed = ['head','tree','main','mainTree','tracked','bindings','dependencyViews','immutableInstalledBytes','tools','versions']
    equal = all(before[key] == after[key] for key in fixed)
    report_check = {'passed':False}
    try:
        report_file = OUT/'vitest.json'; assert report_file.stat().st_size <= 32*1024*1024
        report = json.loads(report_file.read_text()); modules = report['testResults']; cases = [case for module in modules for case in module['assertionResults']]
        assert report['success'] is True and report['numTotalTests'] == report['numPassedTests'] == 1
        assert all(report[key] == 0 for key in ['numFailedTests','numPendingTests','numTodoTests','numFailedTestSuites','numPendingTestSuites'])
        assert len(modules) == 1 and Path(modules[0]['name']).resolve() == ROOT/OWNER and modules[0]['status'] == 'passed'
        assert len(cases) == 1 and cases[0]['fullName'] == TITLE and cases[0]['status'] == 'passed' and not cases[0].get('failureMessages')
        report_check = {'passed':True,'counts':{key:value for key,value in report.items() if key.startswith('num')},'owner':modules[0]['name'],'cases':cases}
    except BaseException as error: report_check = {'passed':False,'errorType':type(error).__name__,'error':str(error)}
    save('report-check.json',report_check)
    save('cache-deltas.json',{'qualification':'Only declared .vite/.vite-temp roots are mutable; complete inventories and cache copies retained','before':before['mutableCaches'],'after':after['mutableCaches']})
    (OUT/'processes-after.txt').write_text(command(['ps','-axo','pid=,ppid=,args=']))
    stop.set(); sampler.join(timeout=2)
    if sampler.is_alive(): power_bad.set()
    power('terminal'); terminal_sampled = True
    save('fence-result.json',{'time':utc(),'immutableFencesEqual':equal,'realJsonOwnerPassed':report_check['passed'],'powerStayedACMode0':not power_bad.is_set(),'monitorStopped':not sampler.is_alive()})
    assert child.returncode == 0 and equal and report_check['passed'] and not power_bad.is_set()
    print(json.dumps({'terminal':True,'exitCode':0,'wholeOwnerPassed':True,'passedTests':1,'evidence':str(OUT)}),flush=True)
except BaseException as error:
    save('supervisor-failure.json',{'time':utc(),'type':type(error).__name__,'message':str(error)})
    raise
finally:
    stop.set(); sampler.join(timeout=2)
    if not terminal_sampled: power('terminal-after-failure')
