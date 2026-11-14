from pathlib import Path
import hashlib, json, os, shutil, subprocess, sys

ROOT = Path('/Users/hughpyle/play/artroom/.builder-worktrees/nf5-browser-custody-20261113')
PLAN = Path(__file__).resolve().parent
HEAD = '421b0931448d3b3d3c6dfa859139269218c0f006'
TREE = '8e92c5261d5a82c584aec993532cb73413a1cfb6'
MAIN = '918ce5d73c215154d88005b74c2a97b58d61880a'
MAIN_TREE = '411d30aca4e08bbc587af5f66a808a7ffc55396f'
LOCK = 'f2885ca573c095141efbca99a7260d211beb9ae38a7f1b139ce234dc79568b54'

def sha(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''): h.update(block)
    return h.hexdigest()

def git(*args): return subprocess.check_output(['git', *args], cwd=ROOT, text=True).strip()
def save(name, value):
    with (PLAN/name).open('x') as stream: json.dump(value, stream, indent=2); stream.write('\n')

assert ROOT.resolve() == ROOT
assert git('rev-parse', 'HEAD') == HEAD and git('rev-parse', 'HEAD^{tree}') == TREE
assert git('status', '--porcelain', '--untracked-files=all') == ''
assert git('rev-parse', 'main') == git('rev-parse', 'origin/main') == MAIN
assert git('rev-parse', 'main^{tree}') == MAIN_TREE
tracked = subprocess.check_output(['git','ls-files','-z'],cwd=ROOT).decode().split('\0')
sources = []; tracked_map = {}
for name in filter(None, tracked):
    path = ROOT/name
    assert path.resolve().is_relative_to(ROOT)
    sources.append({'path':name, 'sha256':sha(path)})
    tracked_map[name] = {'link':os.readlink(path)} if path.is_symlink() else {'sha256':sha(path),'bytes':path.stat().st_size}
modules = ROOT/'node_modules'
for part in ['node_modules','node_modules/@generalbusiness','node_modules/.bin','node_modules/.vite','node_modules/.vite-temp','node_modules/@cloudflare','node_modules/@cloudflare/vitest-pool-workers']:
    path=ROOT/part; assert path.is_dir() and not path.is_symlink(), part
assert sha(ROOT/'package-lock.json') == (modules/'.artroom-lock-sha256').read_text().strip() == LOCK
bindings={}; views=[modules]
for name, entry in json.loads((ROOT/'package-lock.json').read_text())['packages'].items():
    if not name.startswith('node_modules/') or not entry.get('link'): continue
    path=ROOT/name; target=(ROOT/entry['resolved']).resolve()
    assert path.is_symlink() and path.resolve()==target and target.is_relative_to(ROOT)
    pkg=json.loads((path/'package.json').read_text()); assert pkg['name']==name[len('node_modules/'):]
    bindings[name]={'link':os.readlink(path),'target':str(target),'name':pkg['name'],'exports':pkg.get('exports')}
    views.append(target/'node_modules')
assert len(bindings)==15
assert sorted(p.name for p in (modules/'@generalbusiness').iterdir())==sorted(n.split('/')[-1] for n in bindings)
caches={view/name for view in views for name in ['.vite','.vite-temp']}
immutable={}; mutable={}
def inventory(view, excluded=()):
    rows={}
    if not view.exists(): assert not view.is_symlink(); return rows
    assert view.is_dir() and not view.is_symlink() and view.resolve().is_relative_to(ROOT)
    for directory, dirs, files in os.walk(view,followlinks=False):
        base=Path(directory); dirs[:]=[name for name in dirs if base/name not in excluded]
        for name in list(dirs)+files:
            path=base/name; key=str(path.relative_to(ROOT))
            if path.is_symlink():
                assert path.resolve().is_relative_to(ROOT)
                rows[key]={'link':os.readlink(path),'target':str(path.resolve())}
            elif path.is_file(): rows[key]={'sha256':sha(path),'bytes':path.stat().st_size}
    return rows
for view in views: immutable.update(inventory(view,caches))
for cache in sorted(caches): mutable[str(cache.relative_to(ROOT))]={'present':cache.exists(),'files':inventory(cache)}
versions={name:json.loads((modules/name/'package.json').read_text())['version'] for name in ['vitest','vite','tsx','esbuild','typescript']}
assert versions['vitest']=='4.1.12' and versions['typescript']=='7.0.2'
compat=json.loads((ROOT/'scripts/cloudflare-pool-compat.json').read_text())
bundle=modules/compat['package']/compat['relative_bundle']
assert bundle.is_file() and not bundle.is_symlink() and sha(bundle)==compat['after_sha256']
workspaces=[]; aliases=[]
for name, binding in sorted(bindings.items()):
    directory=Path(binding['target']); pkg=json.loads((directory/'package.json').read_text())
    workspaces.append({'name':pkg['name'],'directory':str(directory),'package_json_sha256':sha(directory/'package.json')})
    for sub,target in pkg.get('exports',{}).items():
        if not isinstance(target,str): continue
        destination=(directory/target).resolve(); assert destination.is_relative_to(directory) and destination.is_file()
        aliases.append({'find':pkg['name']+('' if sub=='.' else sub[1:]),'replacement':str(destination)})
assert len(aliases)==55
reproduction=Path('/Users/hughpyle/play/artroom-evidence/2026-11-14-nf5-reproduction-attempt1/after-inputs.json')
prior=json.loads(reproduction.read_text())
assert prior['head']=='0012cdf93d4bc8d7b3a0212f5ec9c74cbaa33f87' and prior['tree']=='009a3609359a809013967225f0f5e470375d13d6'
changed='packages/client/test/browser-request.test.ts'
delta=sorted(name for name in set(prior['tracked'])|set(tracked_map) if prior['tracked'].get(name)!=tracked_map.get(name))
assert delta==[changed]
correspondence=json.loads((PLAN/'continuation-correspondence.json').read_text())
assert prior['tracked'][changed]['sha256']==correspondence['oldTestSha256'] and tracked_map[changed]['sha256']==correspondence['newTestSha256']
assert all(prior[key]==value for key,value in [('bindings',bindings),('dependencyViews',[str(v.relative_to(ROOT)) for v in views]),('immutableInstalledBytes',immutable),('versions',versions)])
selection=json.loads((PLAN/'source-selection.json').read_text())['selection']
selection=[row for row in selection if row['project'] in ['client','lending']]
assert len(selection)==9 and sum(len(row['cases']) for row in selection)==83
case_keys=[(row['project'],row['path'],title) for row in selection for title in row['cases']]
assert len(case_keys)==len(set(case_keys))
for row in selection:
    assert row['pool']=='threads'
    expected=json.loads((PLAN/'source-cases.json').read_text())
    owner=next(o for o in expected['owners'] if o['path']==row['path'])
    assert sha(ROOT/row['path'])==owner['sourceSha256']
node=Path('/opt/homebrew/bin/node').resolve()
tsc=(modules/'typescript/bin/tsc').resolve(); vitest=(modules/'vitest/vitest.mjs').resolve()
tools=[{'path':str((ROOT/name).resolve()),'sha256':row['sha256']} for name,row in sorted(immutable.items()) if 'sha256' in row]
tools.extend({'path':str(path.resolve()),'sha256':sha(path.resolve())} for path in [Path(sys.executable),Path('/usr/bin/time'),Path('/bin/ps'),Path('/usr/bin/pmset'),Path(shutil.which('git'))])
assert len({row['path'] for row in tools})==len(tools)
save('frozen-inputs.json',{'head':HEAD,'tree':TREE,'main':MAIN,'mainTree':MAIN_TREE,'tracked':tracked_map,'bindings':bindings,'dependencyViews':[str(v.relative_to(ROOT)) for v in views],
    'immutableInstalledBytes':immutable,'mutableCaches':mutable,'versions':versions,'tools':{'node':{'path':str(node),'sha256':sha(node)},'python':{'path':str(Path(sys.executable).resolve()),'sha256':sha(Path(sys.executable).resolve())}},
    'compatibility':{'package':compat['package'],'version':compat['version'],'bundle':str(bundle),'after_sha256':compat['after_sha256'],'required':'Run once; copied false, identical before/after and all immutable fences equal, else stop before compilers.'}})
labels=['client-test','counter-browser','lending-browser','page-test','cli-test','lending-owners']
configs=['packages/client/tsconfig.test.json','apps/counter/browser/tsconfig.json','examples/lending/browser/tsconfig.json','apps/room/page/tsconfig.test.json','packages/cli/tsconfig.test.json','examples/lending/tsconfig.json']
inputs=[{'path':str(p.resolve()),'sha256':sha(p)} for p in sorted(PLAN.iterdir()) if p.is_file() and p.name not in ['focused-plan.json','approval-manifest.json','SHA256SUMS']]
inputs.append({'path':str(reproduction),'sha256':sha(reproduction)})
save('focused-plan.json',{'root':str(ROOT),'head':HEAD,'tree':TREE,'sources':sources,'inputs':inputs,'lock_sha256':LOCK,'workspaces':workspaces,'aliases':aliases,
    'node':{'path':str(node),'sha256':sha(node)},'tsc':{'path':str(tsc),'sha256':sha(tsc)},'vitest':{'path':str(vitest),'sha256':sha(vitest)},'tools':tools,
    'compilers':[{'name':name,'config':config,'cwd':'.'} for name,config in zip(labels,configs)],'body':{'cwd':'.','config':'vitest.plain.config.ts','selection':selection}})
manifest={p.name:{'sha256':sha(p),'bytes':p.stat().st_size} for p in sorted(PLAN.iterdir()) if p.is_file() and p.name not in ['approval-manifest.json','SHA256SUMS']}
save('approval-manifest.json',{'qualification':'SOURCE/METADATA FREEZE ONLY; no project execution. Root must review exact bytes before grant.','files':manifest})
print(json.dumps({'plan':str(PLAN),'head':HEAD,'tree':TREE,'sources':len(sources),'immutableInstalledEntries':len(immutable),'workspaces':len(workspaces),'aliases':len(aliases),'compilerRoots':len(configs),'selectedFiles':len(selection),'staticCases':len(case_keys),'approvalManifestSha256':sha(PLAN/'approval-manifest.json')}))
