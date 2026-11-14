from pathlib import Path
import subprocess, sys, os, json, hashlib, time, datetime, re, shutil, signal, shlex

# SOURCE ONLY: never run before sealed focused PASS/END and root's separate gate grant.
ROOT = Path('/Users/hughpyle/play/artroom/.builder-worktrees/cut-r-r2-preparation-20261114')
PLAN = Path('/private/tmp/artroom-r2-grow-full-gate-plan-v2-20261114')
OUT = Path('/Users/hughpyle/play/artroom-evidence/2026-11-14-r2-grow-gate-attempt1')
MAIN = '918ce5d73c215154d88005b74c2a97b58d61880a'
DEADLINE_SECONDS = 14400  # Outer safety bound only; no test deadline changes.
POWER_COMMAND_SECONDS = 10
TERM_GRACE_SECONDS = 30
KILL_REAP_SECONDS = 10
cancelled = None
GATE_STEPS = {'whitespace', 'commit-messages', 'commit-test', 'helpers', 'citations',
              'cite-test', 'doc-links', 'notes', 'format', 'typecheck', 'def-pins', 'test'}


def utc():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def sha(path):
    digest = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def save(path, value):
    with path.open('x') as stream:
        json.dump(value, stream, indent=2)
        stream.write('\n')


def command(argv, timeout=30):
    return subprocess.check_output(argv, cwd=ROOT, text=True, timeout=timeout)


def cancellation(signum, frame):
    global cancelled
    cancelled = {'signal': signum, 'time': utc()}


for watched in [signal.SIGINT, signal.SIGTERM]:
    signal.signal(watched, cancellation)


# Exact active-AC parser from root-reviewed NF5 reproduction supervisor f066ef91.
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



def power(label):
    try:
        battery = command(['pmset', '-g', 'batt'], POWER_COMMAND_SECONDS)
        custom = command(['pmset', '-g', 'custom'], POWER_COMMAND_SECONDS)
        mode = active_ac_mode(custom)
        ok = "Now drawing from 'AC Power'" in battery and mode['ok']
        row = {'time': utc(), 'label': label, 'ok': ok,
               'activeAcMode': mode, 'battery': battery, 'custom': custom}
    except BaseException as error:
        ok = False
        row = {'time': utc(), 'label': label, 'ok': False,
               'errorType': type(error).__name__, 'error': str(error)}
    # A write failure propagates to the phase's child-cleanup finally block.
    with (OUT / 'power.jsonl').open('a') as stream:
        stream.write(json.dumps(row) + '\n')
    return bool(ok)


def checked_manifest(directory, expected_hash=None):
    manifest_path = directory / 'plan-files.json'
    assert manifest_path.is_file() and not manifest_path.is_symlink()
    if expected_hash is not None:
        assert sha(manifest_path) == expected_hash, 'Plan manifest changed'
    manifest = json.loads(manifest_path.read_text())
    names = set()
    for row in manifest['files']:
        name = row['path']
        assert Path(name).name == name and name not in names
        names.add(name)
        path = directory / name
        assert path.is_file() and not path.is_symlink()
        assert path.stat().st_size == row['bytes'] and sha(path) == row['sha256'], name
    assert {'frozen-inputs.json', 'dependency-shape.json', 'gate-plan.json',
            'commands.json', 'gate-supervisor.py', 'RUNORDER.md'}.issubset(names)
    return manifest


def pinned_inputs():
    pins = json.loads((OUT / 'init-pins.json').read_text())
    expected = pins['plan_files_sha256']
    current = checked_manifest(PLAN, expected)
    retained = checked_manifest(OUT / 'reviewed-plan', expected)
    assert current == retained
    assert sha(Path(__file__)) == pins['supervisor_sha256']
    assert sha(PLAN / 'gate-supervisor.py') == pins['supervisor_sha256']
    assert sha(OUT / 'authority.json') == pins['authority_sha256']
    assert sha(OUT / 'focused-boundary.json') == pins['focused_boundary_sha256']
    gate = json.loads((OUT / 'reviewed-plan' / 'gate-plan.json').read_text())
    assert sha(OUT / 'reviewed-plan' / 'frozen-inputs.json') == gate['frozen_inputs_sha256']
    plan = json.loads((OUT / 'reviewed-plan' / 'frozen-inputs.json').read_text())
    assert plan['root'] == str(ROOT) and gate['root'] == str(ROOT)
    assert plan['head'] == gate['head'] and plan['tree'] == gate['tree']
    assert gate['main'] == MAIN and gate['deadline_seconds'] == DEADLINE_SECONDS
    assert plan['lock_sha256'] == gate['lock_sha256']
    commands = json.loads((OUT / 'reviewed-plan' / 'commands.json').read_text())['commands']
    assert len(commands) == 1 and commands[0]['argv'] == ['npm', 'run', 'gate']
    return plan, commands


def guard(label):
    plan, _ = pinned_inputs()
    assert command(['git', 'rev-parse', 'HEAD']).strip() == plan['head']
    assert command(['git', 'rev-parse', 'HEAD^{tree}']).strip() == plan['tree']
    assert command(['git', 'status', '--porcelain', '--untracked-files=all']) == ''
    assert command(['git', 'rev-parse', 'main']).strip() == MAIN
    assert command(['git', 'rev-parse', 'origin/main']).strip() == MAIN
    assert Path(shutil.which('node')).resolve() == Path(plan['node']['path'])
    assert Path(shutil.which('npm')).resolve() == Path(plan['npm']['path'])
    for row in plan['sources']:
        assert sha(ROOT / row['path']) == row['sha256'], row['path']
    for row in [*plan['inputs'], plan['node'], plan['tsc'], plan['vitest'],
                plan['npm'], *plan['tools']]:
        assert sha(row['path']) == row['sha256'], row['path']
    assert sha(ROOT / 'package-lock.json') == plan['lock_sha256']
    assert (ROOT / 'node_modules/.artroom-lock-sha256').read_text().strip() == plan['lock_sha256']
    for part in ['node_modules', 'node_modules/@generalbusiness', 'node_modules/.bin',
                 'node_modules/.vite', 'node_modules/.vite-temp']:
        path = ROOT / part
        assert path.is_dir() and not path.is_symlink(), part
    namespace = ROOT / 'node_modules/@generalbusiness'
    assert len(plan['workspaces']) == 15 and len(plan['aliases']) == 55
    assert sorted(path.name for path in namespace.iterdir()) == sorted(
        row['name'].split('/')[1] for row in plan['workspaces'])
    for row in plan['workspaces']:
        target = ROOT / 'node_modules' / row['name']
        assert target.is_symlink() and not Path(os.readlink(target)).is_absolute()
        assert os.readlink(target) == row['donor_relative_link']
        assert str(target.resolve()) == row['directory']
        package = Path(row['directory']) / 'package.json'
        assert sha(package) == row['package_json_sha256']
        assert json.loads(package.read_text()).get('exports', {}) == row['package_exports']
        view = Path(row['directory']) / 'node_modules'
        if view.exists() or view.is_symlink():
            assert view.is_dir() and not view.is_symlink(), str(view)
            assert all(path.name in ['.vite', '.vite-temp'] for path in view.iterdir()), str(view)
            assert all(path.is_dir() and not path.is_symlink() for path in view.iterdir()), str(view)
    for view in owned_views(plan):
        if view == ROOT / 'node_modules' or not view.exists():
            continue
        assert view.is_dir() and not view.is_symlink(), str(view)
        assert all(path.name in ['.vite', '.vite-temp'] for path in view.iterdir()), str(view)
        assert all(path.is_dir() and not path.is_symlink() for path in view.iterdir()), str(view)
    for row in plan['aliases']:
        assert sha(row['replacement']) == row['sha256']
    dependency_shape()
    pinned_inputs()
    with (OUT / 'guards.jsonl').open('a') as stream:
        stream.write(json.dumps({'time': utc(), 'label': label, 'head': plan['head'],
                                 'tree': plan['tree'], 'sources': len(plan['sources']),
                                 'tools': len(plan['tools']), 'all15bindings': True,
                                 'plan_pins': True, 'passed': True}) + '\n')
    return plan


def dependency_shape():
    # Retain every stable cloned file/link/directory; only Vite cache contents may grow.
    expected = json.loads((OUT / 'reviewed-plan' / 'dependency-shape.json').read_text())['rows']
    expected = {row['path']: row for row in expected
                if row['path'].split('/')[0] not in ['.vite', '.vite-temp']}
    actual = {}
    base = ROOT / 'node_modules'
    for directory, dirs, files in os.walk(base, followlinks=False):
        folder = Path(directory)
        if folder == base:
            dirs[:] = [name for name in dirs if name not in ['.vite', '.vite-temp']]
        for name in sorted(dirs + files):
            path = folder / name
            key = str(path.relative_to(base))
            if path.is_symlink():
                actual[key] = {'path': key, 'kind': 'symlink', 'target': os.readlink(path)}
            elif path.is_dir():
                actual[key] = {'path': key, 'kind': 'directory'}
            elif path.is_file():
                actual[key] = {'path': key, 'kind': 'file', 'bytes': path.stat().st_size,
                               'sha256': sha(path)}
            else:
                raise RuntimeError('Unsupported dependency object: ' + key)
    assert actual == expected, 'Stable owned dependency namespace drift'


def inventory(view):
    rows = {}
    if not view.exists():
        assert not view.is_symlink()
        return rows
    assert view.is_dir() and not view.is_symlink()
    for directory, dirs, files in os.walk(view, followlinks=False):
        base = Path(directory)
        for name in sorted(dirs + files):
            path = base / name
            key = str(path.relative_to(view))
            if path.is_symlink():
                rows[key] = {'link': os.readlink(path)}
            elif path.is_dir():
                rows[key] = {'directory': True}
            elif path.is_file():
                rows[key] = {'sha256': sha(path), 'bytes': path.stat().st_size}
            else:
                raise RuntimeError('Unsupported mutable-cache object: ' + str(path))
    return rows


def owned_views(plan):
    views = {ROOT / 'node_modules', *[Path(row['directory']) / 'node_modules'
                                     for row in plan['workspaces']]}
    for directory, dirs, files in os.walk(ROOT, followlinks=False):
        folder = Path(directory)
        dirs[:] = [name for name in dirs if name != '.git']
        if 'node_modules' in files:
            raise RuntimeError('A dependency/cache view is not a directory: ' + str(folder))
        if 'node_modules' in dirs:
            views.add(folder / 'node_modules')
            dirs.remove('node_modules')
    return sorted(views)


def snapshot_caches(label, directory, plan):
    views = owned_views(plan)
    roots = [('source/' + str((view / name).relative_to(ROOT)), view / name)
             for view in views for name in ['.vite', '.vite-temp']]
    roots += [('external/runtime-tmp', OUT / 'runtime-tmp')]
    rows = {}
    for key, path in roots:
        before = inventory(path)
        row = {'path': str(path), 'present': path.exists(), 'inventory': before}
        if path.exists():
            copy = directory / ('mutable-cache-' + label) / key
            shutil.copytree(path, copy, symlinks=True)
            assert inventory(copy) == before == inventory(path), 'Cache changed during capture: ' + str(path)
            row['copy'] = str(copy.relative_to(OUT))
        rows[key] = row
    save(directory / ('mutable-caches-' + label + '.json'), rows)
    return rows


def group_alive(pgid):
    try:
        os.killpg(pgid, 0)
        return True
    except ProcessLookupError:
        return False


def stop_owned_group(child, pgid, reason):
    # pgid always comes from this phase's Popen(start_new_session=True).
    record = {'time': utc(), 'pgid': pgid, 'reason': reason,
              'exit_before_cleanup': child.poll(), 'actions': []}
    if group_alive(pgid):
        try:
            os.killpg(pgid, signal.SIGTERM)
            record['actions'].append({'signal': 'TERM', 'time': utc()})
        except ProcessLookupError:
            pass
        deadline = time.monotonic() + TERM_GRACE_SECONDS
        while time.monotonic() < deadline:
            child.poll()
            if not group_alive(pgid):
                break
            time.sleep(0.1)
        if group_alive(pgid):
            try:
                os.killpg(pgid, signal.SIGKILL)
                record['actions'].append({'signal': 'KILL', 'time': utc()})
            except ProcessLookupError:
                pass
    try:
        child.wait(timeout=KILL_REAP_SECONDS)
    except subprocess.TimeoutExpired:
        record['direct_child_reap_timeout'] = True
    record['actual_exit_after_cleanup'] = child.poll()
    record['group_still_present'] = group_alive(pgid)
    record['time_finished'] = utc()
    return record


def focused_boundary():
    gate = json.loads((PLAN / 'gate-plan.json').read_text())
    authority_path = Path(gate['authority_path'])
    assert authority_path.is_file() and not authority_path.is_symlink()
    authority = json.loads(authority_path.read_text())
    canonical = r'git:sha1:[0-9a-f]{40}#git:sha1:[0-9a-f]{40}'
    for key in ['focused_end', 'root_gate_grant', 'fresh_planner_poll']:
        assert re.fullmatch(canonical, authority[key]), key
    assert authority['head'] == gate['head'] and authority['tree'] == gate['tree']
    assert authority['main'] == MAIN
    assert authority['development_pass_confirmed'] is True
    focused = Path(gate['focused_root'])
    assert focused.is_dir() and not focused.is_symlink()
    manifest = focused / 'interval.manifest.json'
    sums = focused / 'SHA256SUMS'
    assert sha(manifest) == authority['focused_manifest_sha256']
    assert sha(sums) == authority['focused_sums_sha256']
    reviewed = focused / 'reviewed-plan/focused-plan.json'
    assert sha(reviewed) == authority['focused_plan_sha256']
    actual_inputs = json.loads(reviewed.read_text())
    expected_inputs = json.loads((PLAN / 'frozen-inputs.json').read_text())
    for key in ['root', 'head', 'tree', 'lock_sha256', 'sources', 'tools', 'workspaces',
                'aliases', 'node', 'npm', 'tsc', 'vitest']:
        assert actual_inputs[key] == expected_inputs[key], 'Focused/gate input mismatch: ' + key
    # Verify the sealed sums without executing another reporter, helper or owner.
    for line in sums.read_text().splitlines():
        digest, name = line.split('  ', 1)
        relative = Path(name)
        assert re.fullmatch(r'[0-9a-f]{64}', digest)
        assert not relative.is_absolute() and '..' not in relative.parts
        path = focused / relative
        assert path.is_file() and not path.is_symlink()
        assert path.stat().st_mode & 0o222 == 0 and sha(path) == digest, name
    phases = ['00-compatibility', '01-focused-owners', '02-node-security']
    observed = []
    for name in phases:
        row = json.loads((focused / name / 'result.json').read_text())
        assert row['actual_exit'] == row['verification_exit'] == 0, name
        assert all(row[key] is True for key in ['actual_ac_mode0', 'terminal_power_passed',
                   'source_tool_plan_fence', 'mutable_cache_captured']), name
        assert row['owned_group_still_present'] is False
        assert row['failure'] is None and row['cancelled'] is None
        observed.append(row)
    result = json.loads((focused / 'focused-owners/result.json').read_text())
    source = json.loads((focused / 'focused-owners/plan.json').read_text())
    assert source['head'] == gate['head'] and source['tree'] == gate['tree']
    assert result['verificationExitCode'] == 0 and result['verificationStatus'] == 'passed'
    assert [row['name'] for row in result['commandLedger']] == [
        'cli-test', 'lanes-test', 'grow', 'scope-test', 'body']
    assert all(row['status'] == 'passed' for row in result['commandLedger'])
    assert json.loads((focused / 'focused-owners/coverage-ledger.json').read_text())['passed'] is True
    assert json.loads((focused / '02-node-security/node-case-check.json').read_text())['passed'] is True
    # Root checks the effective workroom acts and interval-result semantics. These
    # pins bind that review; this local file is not an authorization engine.
    terminal = focused / 'interval-result.json'
    assert sha(terminal) == authority['focused_interval_result_sha256']
    return authority_path, {'authority': authority, 'phase_results': observed,
                            'interval_result': json.loads(terminal.read_text())}


def gate_path(path):
    path = Path(path).resolve()
    allowed = (OUT / 'runtime-tmp').resolve() in path.parents
    allowed = allowed or (str(path).startswith('/private/var/folders/')
                          and path.parent.name == 'T')
    allowed = allowed or path.parent == Path('/private/tmp')
    assert allowed and re.fullmatch(r'tmp\.[A-Za-z0-9]+', path.name), str(path)
    assert path.is_dir() and not path.is_symlink()
    return path


def observe_owned_paths(pgid, directory, candidates):
    # Capture only this launched group; do not inspect other lanes' command args.
    rows = command(['ps', '-axo', 'pid=,ppid=,pgid=,comm='], 5)
    owned = [line for line in rows.splitlines() if len(line.split(None, 3)) == 4
             and line.split(None, 3)[2] == str(pgid)]
    with (directory / 'owned-processes.jsonl').open('a') as stream:
        stream.write(json.dumps({'time': utc(), 'pgid': pgid, 'rows': owned}) + '\n')
    for row in owned:
        pieces = row.split(None, 3)
        if pieces[3].split('/')[-1] != 'time':
            continue
        try:
            args = shlex.split(command(['ps', '-p', pieces[0], '-o', 'command='], 5))
        except subprocess.CalledProcessError:
            continue  # The sampled child may have ended before this read.
        if '-o' in args:
            output = Path(args[args.index('-o') + 1])
            if output.suffix == '.time' and output.stem in GATE_STEPS:
                candidates.add(str(gate_path(output.parent)))
    with (directory / 'gate-candidates.jsonl').open('a') as stream:
        stream.write(json.dumps({'time': utc(), 'candidates': sorted(candidates)}) + '\n')


def capture_gate(directory, candidates, actual_exit):
    text = (directory / 'stdout.log').read_text(errors='replace')
    matches = re.findall(r'(?m)^gate (?:passed|FAILED); logs in (.+)$', text)
    for name in matches:
        candidates.add(str(gate_path(name)))
    assert len(candidates) == 1, 'Actual gate mktemp root missing or ambiguous: ' + repr(candidates)
    origin = gate_path(next(iter(candidates)))
    before = inventory(origin)
    assert before, 'Actual gate directory has no retained evidence'
    destination = OUT / 'maintained-gate'
    shutil.copytree(origin, destination, symlinks=True)
    assert inventory(destination) == before == inventory(origin), 'Gate evidence changed during capture'
    save(OUT / 'origin-copy.json', {'time': utc(), 'actual_gate_tree': str(origin),
         'passed_TMPDIR': str(OUT / 'runtime-tmp'), 'copy': str(destination),
         'original_preserved': True, 'copy_equal_before_after': True, 'inventory': before})
    if actual_exit == 0:
        assert len(matches) == 1 and 'gate passed; logs in ' in text
        assert not re.search(r'(?m)^install\s+exit\s', text), 'Unexpected install path'
        assert 'install    skipped: dependency view was verified' in text
        # The gate owns case/module/skip totals. Retain its actual selection and
        # terminal ledgers without another test/collection/reporter invocation.
        evidence = destination / 'test-evidence'
        assert (evidence / 'stages.json').is_file()
        selected = json.loads((evidence / 'scale-selection.json').read_text())
        assert isinstance(selected['include'], bool)
        save(OUT / 'actual-scale-selection.json', selected)
    return {'original': str(origin), 'retained': str(destination), 'objects': len(before)}


def init():
    checked_manifest(PLAN)
    authority_path, focused = focused_boundary()
    OUT.mkdir(exist_ok=False)
    shutil.copytree(PLAN, OUT / 'reviewed-plan')
    pins = {'time': utc(), 'plan_files_sha256': sha(PLAN / 'plan-files.json'),
            'supervisor_sha256': sha(Path(__file__))}
    shutil.copy2(authority_path, OUT / 'authority.json')
    save(OUT / 'focused-boundary.json', focused)
    pins['authority_sha256'] = sha(OUT / 'authority.json')
    pins['focused_boundary_sha256'] = sha(OUT / 'focused-boundary.json')
    save(OUT / 'init-pins.json', pins)
    for path in (OUT / 'reviewed-plan').iterdir():
        path.chmod(path.stat().st_mode & ~0o222)
    (OUT / 'reviewed-plan').chmod(0o500)
    (OUT / 'init-pins.json').chmod(0o400)
    (OUT / 'authority.json').chmod(0o400)
    (OUT / 'focused-boundary.json').chmod(0o400)
    (OUT / 'runtime-tmp').mkdir()
    shutil.copy2(__file__, OUT / 'supervisor.py')
    idle = command(['ps', '-axo', 'pid=,ppid=,comm='])
    (OUT / 'idle-before.txt').write_text(idle)
    suspects = [line for line in idle.splitlines() if re.search(
        r'(?i)(?:^|/|\s)(?:workerd|vitest|tsc|esbuild|wrangler)(?:\s|$)', line)]
    assert not suspects, suspects
    assert not cancelled and power('init-before-guard')
    plan = guard('init')
    snapshot_caches('init', OUT, plan)
    assert not cancelled and power('init-terminal')
    save(OUT / 'init.json', {'time': utc(), 'pid': os.getpid(), 'pins': pins,
                             'named_validation_processes': suspects, 'passed': True})
    print(json.dumps({'initialized': str(OUT), 'pins': pins, 'power': 'AC/mode0'}), flush=True)


def run_phase(index):
    plan, commands = pinned_inputs()
    assert 0 <= index < len(commands)
    assert json.loads((OUT / 'init.json').read_text())['passed']
    for previous in range(index):
        prior = commands[previous]
        name = '%02d-%s' % (previous, prior['name'])
        assert json.loads((OUT / name / 'result.json').read_text())['verification_exit'] == 0
    chosen = commands[index]
    assert chosen['deadline_seconds'] == DEADLINE_SECONDS
    label = '%02d-%s' % (index, chosen['name'])
    directory = OUT / label
    directory.mkdir(exist_ok=False)
    child = None
    pgid = None
    error = None
    lifecycle = None
    source_fence = False
    cache_capture = False
    final_power = False
    all_power = True
    gate_copy = None
    gate_candidates = set()
    phase_started = time.monotonic()
    started = None
    command_wall_seconds = None
    try:
        assert not cancelled
        all_power = power(label + '-before-guard') and all_power
        assert all_power
        guard(label + '-before')
        snapshot_caches('before', directory, plan)
        all_power = power(label + '-before-launch') and all_power
        assert all_power and not cancelled
        replace = lambda value: value.replace('<DURABLE_ROOT>', str(OUT))
        requested = [replace(value) for value in chosen['argv']]
        assert chosen['name'] == 'full-gate' and requested == ['npm', 'run', 'gate']
        resolved = [plan['node']['path'], *requested[1:]] if requested[0] == 'node' else requested
        actual = ['/usr/bin/time', '-p', '-o', str(directory / 'time.txt'), *resolved]
        env = os.environ.copy()
        cleared = [key for key in env if key.startswith(('ARTROOM_TEST_', 'ARTROOM_FOCUSED_')) or key in [
            'ARTROOM_SCALE_MODE', 'VITEST_MAX_WORKERS', 'NODE_OPTIONS', 'NODE_TEST_CONTEXT']]
        for key in cleared:
            env.pop(key, None)
        overrides = {key: replace(value) for key, value in chosen.get('env', {}).items()}
        assert overrides == {}, 'The maintained gate owns its phases and scale selection'
        env.update(overrides)
        env.update({'TMPDIR': str(OUT / 'runtime-tmp'),
                    'NODE_COMPILE_CACHE': str(OUT / 'runtime-tmp/node-compile-cache'),
                    'npm_config_offline': 'true', 'npm_config_yes': 'false'})
        save(directory / 'command.json', {'requested_argv': requested, 'actual_argv': actual,
             'cwd': str(ROOT), 'time': utc(), 'deadline_seconds': DEADLINE_SECONDS,
             'cleared_environment_keys': cleared,
             'environment_overrides': {key: env[key] for key in [
                 'PATH', 'TMPDIR', 'NODE_COMPILE_CACHE', 'npm_config_offline', 'npm_config_yes', *overrides]}})
        started = time.monotonic()
        next_power = started + 15
        next_paths = started
        with (directory / 'stdout.log').open('xb') as stdout, (directory / 'stderr.log').open('xb') as stderr:
            child = subprocess.Popen(actual, cwd=ROOT, env=env, stdout=stdout,
                                     stderr=stderr, start_new_session=True)
            pgid = child.pid
            save(directory / 'process.json', {'time': utc(), 'child_pid': child.pid,
                                              'owned_pgid': pgid, 'supervisor_pid': os.getpid()})
            print(json.dumps({'phase': label, 'child_pid': child.pid,
                              'owned_pgid': pgid, 'supervisor_pid': os.getpid()}), flush=True)
            while child.poll() is None:
                if cancelled:
                    raise RuntimeError('Supervisor received cancellation signal')
                if time.monotonic() - started >= DEADLINE_SECONDS:
                    raise TimeoutError('Outer four-hour gate safety bound')
                if time.monotonic() >= next_power:
                    all_power = power(label + '-during') and all_power
                    if not all_power:
                        raise RuntimeError('Power/monitor read failed during child execution')
                    next_power = time.monotonic() + 15
                if time.monotonic() >= next_paths:
                    observe_owned_paths(pgid, directory, gate_candidates)
                    next_paths = time.monotonic() + 1
                try:
                    child.wait(timeout=0.25)
                except subprocess.TimeoutExpired:
                    pass
            if group_alive(pgid):
                raise RuntimeError('Owned child exited with process-group members still present')
    except BaseException as failure:
        error = {'time': utc(), 'type': type(failure).__name__, 'message': str(failure)}
    finally:
        # Cleanup precedes any fallible result/cache/power write after launch.
        if child is not None and (error is not None or child.poll() is None or group_alive(pgid)):
            try:
                observe_owned_paths(pgid, directory, gate_candidates)
            except BaseException as failure:
                error = error or {'operation': 'pre-cleanup-owned-path-capture',
                                  'type': type(failure).__name__, 'message': str(failure)}
            try:
                lifecycle = stop_owned_group(child, pgid, 'failure/cancellation/timeout/orphan cleanup')
            except BaseException as failure:
                lifecycle = {'cleanup_error_type': type(failure).__name__, 'cleanup_error': str(failure)}
                error = error or {'type': type(failure).__name__, 'message': str(failure)}
        actual_exit = child.poll() if child is not None else None
        if child is not None and started is not None:
            command_wall_seconds = time.monotonic() - started
    # The child is terminal or cleanup has failed closed; never start another phase on this verdict.
    for operation in ['power', 'source', 'cache', 'gate-copy', 'pins']:
        try:
            if operation == 'power':
                all_power = power(label + '-after-child') and all_power
            elif operation == 'source':
                guard(label + '-after')
                source_fence = True
            elif operation == 'cache':
                snapshot_caches('after', directory, plan)
                cache_capture = True
            elif operation == 'gate-copy' and child is not None:
                gate_copy = capture_gate(directory, gate_candidates, actual_exit)
            elif operation == 'pins':
                pinned_inputs()
        except BaseException as failure:
            error = error or {'time': utc(), 'operation': operation,
                              'type': type(failure).__name__, 'message': str(failure)}
    try:
        final_power = power(label + '-terminal')
    except BaseException as failure:
        error = error or {'operation': 'terminal-power', 'type': type(failure).__name__,
                          'message': str(failure)}
    alive = child is not None and group_alive(pgid)
    clean_lifecycle = not alive and (lifecycle is None or not lifecycle.get('cleanup_error'))
    verification_exit = 0 if (actual_exit == 0 and error is None and all_power and final_power
                              and source_fence and cache_capture and clean_lifecycle and not cancelled
                              and gate_copy is not None) else 1
    result = {'name': label, 'actual_exit': actual_exit,
              'signal': -actual_exit if actual_exit is not None and actual_exit < 0 else None,
              'verification_exit': verification_exit,
              'command_wall_seconds': command_wall_seconds,
              'phase_wall_seconds': time.monotonic() - phase_started,
              'actual_ac_mode0': all_power and final_power, 'terminal_power_passed': final_power,
              'source_tool_plan_fence': source_fence, 'mutable_cache_captured': cache_capture,
              'owned_group_still_present': alive, 'lifecycle': lifecycle, 'failure': error,
              'cancelled': cancelled, 'actual_gate_copy': gate_copy,
              'observed_gate_candidates': sorted(gate_candidates),
              'time': utc(), 'supervisor_sha256': sha(Path(__file__))}
    save(directory / 'result.json', result)
    print(json.dumps(result), flush=True)
    return verification_exit


if __name__ == '__main__':
    try:
        assert len(sys.argv) == 2
        if sys.argv[1] == 'init':
            init()
            code = 0
        else:
            code = run_phase(int(sys.argv[1]))
    except BaseException as failure:
        # run_phase owns any launched group and completes cleanup before it returns/raises.
        print(json.dumps({'supervisor_failure': type(failure).__name__, 'message': str(failure)}),
              file=sys.stderr, flush=True)
        code = 1
    sys.exit(code)
