// O-H2 evidence harness. Same workload as reviewer rollback-bench.mjs bench:
// fixed keys, O1 Sale listing, Bob joins, fill one journal to 100/400/1000
// entries and time 20 newly signed offers after each boundary. Storage files
// are isolated under the output directory. A moving-profile option reuses
// exactly that workload through o3-fixture.create. No runtime source edits.
import crypto from 'node:crypto';
import { syncBuiltinESMExports } from 'node:module';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import os from 'node:os';

const [sourceArg, outputArg, profile = 'fixed'] = process.argv.slice(2);
if (!sourceArg || !outputArg || !['fixed', 'moving'].includes(profile)) throw new Error('usage: node append-work.mjs <spike-root> <output-directory> [fixed|moving]');
const source = resolve(sourceArg), output = resolve(outputArg);
mkdirSync(output, { recursive: true });
let measuring = false;
const zero = () => ({ cryptoVerify: 0, cryptoSign: 0, entriesCalls: 0, entriesReturned: 0 });
let counts = zero();
const originalVerify = crypto.verify, originalSign = crypto.sign;
crypto.verify = function (...args) { if (measuring) counts.cryptoVerify++; return Reflect.apply(originalVerify, this, args); };
crypto.sign = function (...args) { if (measuring) counts.cryptoSign++; return Reflect.apply(originalSign, this, args); };
syncBuiltinESMExports();
const mod = p => import(pathToFileURL(join(source, p)).href);
const { O1_PROFILE_VERSION } = await mod('src/journal.ts');
const { SQLiteBackend } = await mod('src/sqlite.ts');
const { MemoryBackend } = await mod('src/append.ts');
const C = await mod('src/codec.ts');
const { SALE } = await mod('fixtures/sale.ts');
const { acceptance, createJournal, invite, keys, people } = await mod('test/fixtures/o1-fixture.ts');
const moving = profile === 'moving' ? await mod('test/fixtures/o3-fixture.ts') : undefined;
const storageProfile = moving ? (await mod('src/ordering.ts')).HANDOVER_PROFILE : O1_PROFILE_VERSION;
const sourceHead = readFileSync(join(source, '..', 'SOURCE'), 'utf8').trim();
const report = {
  sourceHead, source, profile: storageProfile,
  harnessSha256: crypto.createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),
  started: new Date().toISOString(), node: process.version,
  host: { hostname: os.hostname(), platform: os.platform(), release: os.release(), arch: os.arch(), logicalCpus: os.cpus().length, cpuModel: os.cpus()[0]?.model, totalMemory: os.totalmem(), load: os.loadavg() },
  instrumentation: 'crypto.verify/sign wrappers count calls; backend.entries wrapper counts calls and returned rows. Wrappers preserve results and count only the measured 20-offer windows. No process isolation or exclusive host reservation.',
  workload: 'Reviewer bench shape: one listing + Bob invite/accept; oN fill offers to 100,400,1000 entries; mN measured offers, 20 per boundary; each includes event construction, actor signing, Journal.submit and fold. Runtime generates fresh intent nonces.',
  windows: [],
};
const save = () => writeFileSync(join(output, 'result.json'), JSON.stringify(report, null, 2) + '\n');
save();
const offer = (j, id) => {
  const r = j.submit(C.envelopeBytes(C.signEvent(j.context.intent(people.bob, SALE + 'offer', { offer_id: id }, { action_id: id }), keys.bob)), j.context.credentialFor(people.bob));
  if ('refused' in r || r.replay || !r.verdict?.effective) throw new Error('benchmark offer did not append effectively: ' + JSON.stringify(r));
  return r;
};
for (const storage of ['memory', 'sqlite']) {
  const dir = mkdtempSync(join(output, storage + '-'));
  const backend = storage === 'memory' ? new MemoryBackend() : new SQLiteBackend(join(dir, 'journal.db'), { writer: people.writer, profile: storageProfile });
  const originalEntries = backend.entries;
  backend.entries = function (...args) {
    const entries = Reflect.apply(originalEntries, this, args);
    if (measuring) { counts.entriesCalls++; counts.entriesReturned += entries.length; }
    return entries;
  };
  const j = moving ? moving.create(backend) : createJournal(backend);
  const accepted = j.submit(C.envelopeBytes(acceptance(j, 'bob', invite(j, 'bob'))));
  if ('refused' in accepted || !accepted.verdict?.effective) throw new Error('benchmark join failed');
  let n = 0;
  for (const target of [100, 400, 1000]) {
    const warmStarted = performance.now();
    let filled = 0;
    while (j.context.entries.length < target) { offer(j, 'o' + n++); filled++; }
    const warmMs = performance.now() - warmStarted;
    const firstPosition = j.context.entries.length;
    counts = zero();
    const loadBefore = os.loadavg(), started = new Date().toISOString(), cpuStart = process.cpuUsage();
    const t0 = performance.now();
    measuring = true;
    for (let i = 0; i < 20; i++) offer(j, 'm' + n++);
    measuring = false;
    const elapsedMs = performance.now() - t0, cpu = process.cpuUsage(cpuStart);
    const row = { storage, target, firstPosition, samples: 20, filled, warmMs, started, elapsedMs, msPerAppend: elapsedMs / 20, processCpuMs: { user: cpu.user / 1000, system: cpu.system / 1000 }, loadBefore, loadAfter: os.loadavg(), counts: { ...counts }, perAppend: Object.fromEntries(Object.entries(counts).map(([k,v])=>[k,v/20])) };
    report.windows.push(row); save();
    console.log(JSON.stringify(row));
  }
  j.close();
}
report.finished = new Date().toISOString();
save();
