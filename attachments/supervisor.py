from pathlib import Path
import datetime, hashlib, json, os, re, resource, shutil, signal, subprocess, sys, threading, time

# FUTURE EXECUTION ONLY. Root reviews these bytes/hash and grants the sole slot.
ROOT = Path('/Users/hughpyle/play/artroom/.builder-worktrees/nf5-browser-custody-20261113')
PLAN = Path(__file__).resolve().parent
OUT = Path('/Users/hughpyle/play/artroom-evidence/2026-11-14-nf5-focused-attempt1')
FIXED = ['head','tree','main','mainTree','tracked','bindings','dependencyViews','immutableInstalledBytes','tools','versions']

def utc(): return datetime.datetime.now(datetime.timezone.utc).isoformat()
def sha(path):
    h=hashlib.sha256()
    with Path(path).open('rb') as stream:
        for block in iter(lambda:stream.read(1024*1024),b''): h.update(block)
    return h.hexdigest()
def save(name,value):
    with (OUT/name).open('x') as stream: json.dump(value,stream,indent=2); stream.write('\n')
def command(args): return subprocess.check_output(args,cwd=ROOT,text=True)

assert len(sys.argv)==2 and re.fullmatch('[a-f0-9]{64}',sys.argv[1]), 'Pass the reviewed approval-manifest SHA256'
assert sha(PLAN/'approval-manifest.json')==sys.argv[1]
manifest=json.loads((PLAN/'approval-manifest.json').read_text())
for name,entry in manifest['files'].items():
    assert Path(name).name==name and sha(PLAN/name)==entry['sha256'],name
plan=json.loads((PLAN/'focused-plan.json').read_text())
frozen=json.loads((PLAN/'frozen-inputs.json').read_text())
assert plan['root']==str(ROOT) and len(plan['compilers'])==8
assert len({row['config'] for row in plan['compilers']})==8
assert len(plan['body']['selection'])==9 and sum(len(row['cases']) for row in plan['body']['selection'])==83
assert all(row['project'] in ['client','lending'] for row in plan['body']['selection'])
NODE=Path(plan['node']['path'])

def inventory(view,excluded=()):
    rows={}
    if not view.exists(): assert not view.is_symlink(); return rows
    assert view.is_dir() and not view.is_symlink() and view.resolve().is_relative_to(ROOT)
    for directory,dirs,files in os.walk(view,followlinks=False):
        base=Path(directory); dirs[:]=[name for name in dirs if base/name not in excluded]
        for name in list(dirs)+files:
            path=base/name; key=str(path.relative_to(ROOT))
            if path.is_symlink():
                assert path.resolve().is_relative_to(ROOT)
                rows[key]={'link':os.readlink(path),'target':str(path.resolve())}
            elif path.is_file(): rows[key]={'sha256':sha(path),'bytes':path.stat().st_size}
    return rows

def snapshot(label):
    assert sha(PLAN/'approval-manifest.json')==sys.argv[1]
    for name,entry in manifest['files'].items(): assert sha(PLAN/name)==entry['sha256'],name
    assert command(['git','rev-parse','HEAD']).strip()==plan['head']
    assert command(['git','rev-parse','HEAD^{tree}']).strip()==plan['tree']
    main={ref:command(['git','rev-parse',ref]).strip() for ref in ['refs/heads/main','refs/remotes/origin/main']}
    assert all(value==frozen['main'] for value in main.values())
    assert command(['git','rev-parse','main^{tree}']).strip()==frozen['mainTree']
    assert command(['git','status','--porcelain','--untracked-files=all']).strip()==''
    tracked={}
    for name in filter(None,subprocess.check_output(['git','ls-files','-z'],cwd=ROOT).decode().split('\0')):
        path=ROOT/name
        tracked[name]={'link':os.readlink(path)} if path.is_symlink() else {'sha256':sha(path),'bytes':path.stat().st_size}
    modules=ROOT/'node_modules'
    for part in ['node_modules','node_modules/@generalbusiness','node_modules/.bin','node_modules/.vite','node_modules/.vite-temp','node_modules/@cloudflare','node_modules/@cloudflare/vitest-pool-workers']:
        path=ROOT/part; assert path.is_dir() and not path.is_symlink(),part
    assert sha(ROOT/'package-lock.json')==(modules/'.artroom-lock-sha256').read_text().strip()==plan['lock_sha256']
    bindings={}; views=[modules]
    for key,entry in json.loads((ROOT/'package-lock.json').read_text())['packages'].items():
        if not key.startswith('node_modules/') or not entry.get('link'): continue
        path=ROOT/key; target=(ROOT/entry['resolved']).resolve()
        assert path.is_symlink() and path.resolve()==target and target.is_relative_to(ROOT)
        pkg=json.loads((path/'package.json').read_text()); assert pkg['name']==key[len('node_modules/'):]
        bindings[key]={'link':os.readlink(path),'target':str(target),'name':pkg['name'],'exports':pkg.get('exports')}
        views.append(target/'node_modules')
    assert len(bindings)==15
    assert sorted(path.name for path in (modules/'@generalbusiness').iterdir())==sorted(key.split('/')[-1] for key in bindings)
    caches={view/name for view in views for name in ['.vite','.vite-temp']}
    immutable={}; mutable={}
    for view in views: immutable.update(inventory(view,caches))
    for cache in sorted(caches):
        key=str(cache.relative_to(ROOT)); mutable[key]={'present':cache.exists(),'files':inventory(cache)}
        if cache.exists(): shutil.copytree(cache,OUT/('mutable-cache-'+label)/key)
    for entry in [plan['node'],plan['tsc'],plan['vitest'],*plan['tools'],*plan['inputs']]:
        assert sha(Path(entry['path']))==entry['sha256'],entry['path']
    versions={name:json.loads((modules/name/'package.json').read_text())['version'] for name in ['vitest','vite','tsx','esbuild','typescript']}
    return {'time':utc(),'head':plan['head'],'tree':plan['tree'],'main':frozen['main'],'mainRefs':main,'mainTree':frozen['mainTree'],
        'tracked':tracked,'bindings':bindings,'dependencyViews':[str(view.relative_to(ROOT)) for view in views],
        'immutableInstalledBytes':immutable,'mutableCaches':mutable,'versions':versions,
        'tools':{'node':{'path':str(NODE),'sha256':sha(NODE)},'python':{'path':str(Path(sys.executable).resolve()),'sha256':sha(Path(sys.executable).resolve())}}}

def assert_fences(value):
    assert all(value[key]==frozen[key] for key in FIXED), 'Source/tool/installed input changed'

def ac_mode(custom):
    profiles=re.findall(r'(?m)^AC Power:[ \t]*\n((?:^[ \t].*(?:\n|$))*)',custom)
    if len(profiles)!=1: return {'ok':False,'reason':'Missing or duplicate AC profile'}
    fields={'powermode':[],'lowpowermode':[]}
    for line in profiles[0].splitlines():
        parts=line.split()
        if not parts or parts[0] not in fields: continue
        if len(parts)!=2 or not parts[1].isdigit(): return {'ok':False,'reason':'Malformed AC mode field'}
        fields[parts[0]].append(int(parts[1]))
    values=fields['powermode']+fields['lowpowermode']
    if not values or any(len(items)>1 for items in fields.values()) or len(set(values))!=1:
        return {'ok':False,'reason':'Missing, duplicate or conflicting AC mode','fields':fields}
    return {'ok':values[0]==0,'fields':fields,'value':values[0]}

OUT.mkdir(mode=0o700,exist_ok=False)
shutil.copytree(PLAN,OUT/'reviewed-plan')
shutil.copy2(__file__,OUT/'supervisor.py')
temporary=OUT/'temp'; temporary.mkdir(mode=0o700)
stop=threading.Event(); power_bad=threading.Event(); power_lock=threading.Lock()
child=None; sampler=None; terminal_sampled=False
def power(label):
    try:
        batt=command(['pmset','-g','batt']); custom=command(['pmset','-g','custom']); mode=ac_mode(custom)
        ok="Now drawing from 'AC Power'" in batt and mode['ok']
        row={'time':utc(),'label':label,'ok':ok,'activeAcMode':mode,'battery':batt,'custom':custom}
    except BaseException as error: ok=False; row={'time':utc(),'label':label,'ok':False,'type':type(error).__name__,'error':str(error)}
    with power_lock:
        with (OUT/'power.jsonl').open('a') as stream: stream.write(json.dumps(row)+'\n')
    if not ok: power_bad.set()
def sampling():
    try:
        while not stop.wait(15): power('interval15s')
    except BaseException as error:
        power_bad.set(); save('monitor-failure.json',{'time':utc(),'type':type(error).__name__,'error':str(error)})
def terminate_child():
    if child is not None and child.poll() is None:
        os.killpg(child.pid,signal.SIGTERM)
        try: child.wait(timeout=15)
        except subprocess.TimeoutExpired: os.killpg(child.pid,signal.SIGKILL); child.wait()
def interrupted(signum,_frame):
    terminate_child(); raise RuntimeError('Supervisor interrupted by signal '+str(signum))
signal.signal(signal.SIGINT,interrupted); signal.signal(signal.SIGTERM,interrupted)
env=os.environ.copy()
cleared=[key for key in env if key.startswith(('ARTROOM_TEST_','ARTROOM_FOCUSED_','VITEST_')) or key in ['ARTROOM_SCALE_MODE','NODE_OPTIONS','NODE_PATH','NODE_TEST_CONTEXT']]
for key in cleared: env.pop(key,None)
env.update({'TMPDIR':str(temporary),'NODE_COMPILE_CACHE':str(temporary/'node-compile-cache'),'npm_config_offline':'true','npm_config_yes':'false'})
save('environment.json',{'clearedKeys':cleared,'overrides':{key:env[key] for key in ['TMPDIR','NODE_COMPILE_CACHE','npm_config_offline','npm_config_yes']}})
def run(label,argv,timeout):
    global child
    phase=OUT/label; phase.mkdir(mode=0o700)
    actual=['/usr/bin/time','-p','-o',str(phase/'time.txt'),*argv]
    save(label+'/command.json',{'time':utc(),'argv':argv,'actualArgv':actual,'cwd':str(ROOT)})
    power(label+'-before'); assert not power_bad.is_set()
    started=time.monotonic(); usage=resource.getrusage(resource.RUSAGE_CHILDREN)
    with (phase/'stdout.log').open('xb') as stdout,(phase/'stderr.log').open('xb') as stderr:
        child=subprocess.Popen(actual,cwd=ROOT,env=env,stdout=stdout,stderr=stderr,start_new_session=True)
        save(label+'/process.json',{'pid':child.pid,'supervisorPid':os.getpid(),'time':utc()})
        print(json.dumps({'phase':label,'pid':child.pid,'evidence':str(OUT)}),flush=True)
        while child.poll() is None:
            if power_bad.is_set() or time.monotonic()-started>timeout:
                terminate_child(); raise RuntimeError('Power/monitor drift or '+label+' timeout; no later phase')
            time.sleep(0.25)
    used=resource.getrusage(resource.RUSAGE_CHILDREN)
    result={'time':utc(),'exitCode':child.returncode,'signal':-child.returncode if child.returncode<0 else None,
        'wallSeconds':time.monotonic()-started,'userSeconds':used.ru_utime-usage.ru_utime,'systemSeconds':used.ru_stime-usage.ru_stime}
    save(label+'/result.json',result); power(label+'-after')
    assert child.returncode==0 and not power_bad.is_set(), label+' failed; no later phase'
    return result

began=time.monotonic()
try:
    power('before-preflight'); assert not power_bad.is_set()
    sampler=threading.Thread(target=sampling,daemon=True); sampler.start()
    processes=command(['ps','-axo','pid=,ppid=,comm=,args=']); (OUT/'processes-before.txt').write_text(processes)
    pattern=r'(?:^|/)(?:workerd|vitest|tsc|tsgo|esbuild|wrangler)(?:\s|$)|/scripts/(?:focused-check|gate|test-changed)\.mjs(?:\s|$)'
    suspects=[line for line in processes.splitlines() if re.search(pattern,line)]
    save('idle-check.json',{'time':utc(),'suspects':suspects}); assert not suspects,suspects
    before=snapshot('before'); save('before-inputs.json',before); assert_fences(before)
    compat=run('compat',[str(NODE),str(ROOT/'scripts/cloudflare-pool-compat.mjs')],60)
    reported=json.loads((OUT/'compat/stdout.log').read_text())
    expected=frozen['compatibility']
    assert reported['copied'] is False and reported['before']==reported['after']==expected['after_sha256']
    assert reported['package']==expected['package'] and reported['version']==expected['version']
    assert Path(reported['packageRoot']).resolve()==(ROOT/'node_modules'/expected['package']).resolve()
    after_compat=snapshot('after-compat'); save('after-compat-inputs.json',after_compat); assert_fences(after_compat)
    save('compat-fence.json',{'copied':False,'beforeEqualsAfter':True,'allImmutableFencesEqual':True,'compilersNotStarted':True,'time':utc()})
    pipeline=run('pipeline',[str(NODE),str(ROOT/'scripts/focused-check.mjs'),str(PLAN/'focused-plan.json'),str(OUT/'focused-owners')],1800)
    after=snapshot('after'); save('after-inputs.json',after); assert_fences(after)
    result=json.loads((OUT/'focused-owners/result.json').read_text())
    coverage=json.loads((OUT/'focused-owners/coverage-ledger.json').read_text())
    assert result['verificationExitCode']==0 and result['verificationStatus']=='passed'
    assert len(result['commandLedger'])==9 and all(row['status']=='passed' for row in result['commandLedger'])
    assert [row['name'] for row in result['commandLedger']]==[row['name'] for row in plan['compilers']]+['body']
    assert coverage['passed'] is True and not coverage['issues'] and not coverage['unexpectedCases'] and len(coverage['cases'])==83
    # Built-in JSON supplies duration; public structured reporter supplies project/fullName identity.
    report=json.loads((OUT/'focused-owners/vitest.json').read_text())
    expected={(str((ROOT/owner['path']).resolve()),title):owner['project'] for owner in plan['body']['selection'] for title in owner['cases']}
    timings=[]
    for module in report['testResults']:
        file=str(Path(module['name']).resolve())
        for case in module['assertionResults']:
            assert isinstance(case['ancestorTitles'],list) and all(isinstance(s,str) for s in case['ancestorTitles'])
            full=' > '.join([*case['ancestorTitles'],case['title']]); key=(file,full)
            assert key in expected and case['status']=='passed' and not case['failureMessages']
            duration=case['duration']; assert isinstance(duration,(int,float)) and not isinstance(duration,bool) and 0<=duration<float('inf')
            timings.append({'project':expected[key],'file':file,'fullName':full,'durationMilliseconds':duration,'source':'built-in JSON duration; public reporter identity/coverage remains authority'})
    assert len(timings)==83 and len({(row['project'],row['file'],row['fullName']) for row in timings})==83
    save('case-timings.json',{'cases':timings,'qualification':'Per-case observations are not wall time, CPU or teardown completion.'})
    save('cache-deltas.json',{'qualification':'Only declared .vite/.vite-temp roots are mutable; complete inventories and copies retained','before':before['mutableCaches'],'afterCompatibility':after_compat['mutableCaches'],'after':after['mutableCaches']})
    (OUT/'processes-after.txt').write_text(command(['ps','-axo','pid=,ppid=,comm=,args=']))
    stop.set(); sampler.join(timeout=2)
    if sampler.is_alive(): power_bad.set()
    power('terminal'); terminal_sampled=True; assert not power_bad.is_set()
    save('fence-result.json',{'time':utc(),'immutableFencesEqual':True,'requiredCompatibilityUnchanged':True,'powerStayedACMode0':True,
        'maintainedDriverPassed':True,'compilerRoots':8,'wholeFiles':9,'passedCases':83,'R1Repeated':False,'monitorStopped':True,'elapsedToResultSeconds':time.monotonic()-began})
    print(json.dumps({'terminal':True,'exitCode':0,'evidence':str(OUT)}),flush=True)
except BaseException as error:
    terminate_child()
    save('supervisor-failure.json',{'time':utc(),'type':type(error).__name__,'error':str(error),'elapsedSeconds':time.monotonic()-began})
    try:
        failed=snapshot('failure'); save('failure-inputs.json',failed); assert_fences(failed)
        save('failure-fence.json',{'immutableFencesEqual':True,'time':utc()})
    except BaseException as fence_error:
        save('failure-fence-error.json',{'time':utc(),'type':type(fence_error).__name__,'error':str(fence_error)})
    raise
finally:
    stop.set()
    if sampler is not None: sampler.join(timeout=2)
    if not terminal_sampled: power('terminal-after-failure')
