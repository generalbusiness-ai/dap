import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const duration = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
const text = value => typeof value === 'string' ? value : null;
const number = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
const projects = ['bytes','derive','platform','git','checkers','replay','client','scope','scope-denial','lanes','cli','page','mcp','counting','lending','grow'];
const phases = ['kernel','node','counting','plain','native'];
const vitestKey = row => JSON.stringify([row.phase,row.project,row.file,row.id]);
const nodeKey = row => row.entryFile !== null && row.testId !== null ? JSON.stringify([row.phase,row.entryFile,row.testId]) : null;

// Public Node TestEvent fields only. Error messages, logs and stdout are not
// needed for timing. The child status remains the authority for failure.
export default async function* nodeReporter(source) {
  const phase = process.env.ARTROOM_TEST_PHASE;
  if (phase !== 'node' && phase !== 'counting') throw new Error('Unknown Node observation phase');
  for await (const { type, data } of source) {
    if (!['test:enqueue','test:dequeue','test:complete','test:pass','test:fail','test:summary','test:interrupted'].includes(type)) continue;
    const row = { version:1, record:'node-event', runner:'node', phase, event:type };
    if (type === 'test:summary') {
      Object.assign(row, { file:text(data.file), success:data.success === true, durationMs:duration(data.duration_ms),
        counts:Object.fromEntries(['tests','suites','topLevel','cancelled','skipped','todo','passed'].map(key => [key,number(data.counts?.[key])])) });
    } else if (type === 'test:interrupted') {
      row.interrupted = (data.tests ?? []).map(test => ({ entryFile:text(test.entryFile),file:text(test.file),testId:number(test.testId),name:text(test.name) }));
    } else {
      Object.assign(row, { entryFile:text(data.entryFile), file:text(data.file), testId:number(data.testId),parentId:number(data.parentId),
        name:text(data.name),nesting:number(data.nesting),testNumber:number(data.testNumber),line:number(data.line),column:number(data.column),
        classification: data.type ?? data.details?.type ?? null, durationMs:duration(data.details?.duration_ms),
        state:data.skip ? 'skipped' : data.todo ? 'todo' : type === 'test:fail' ? 'failed' : type === 'test:pass' ? 'passed'
          : type === 'test:complete' ? (data.details?.passed ? 'passed' : 'failed') : null });
    }
    yield JSON.stringify(row) + '\n';
  }
}

/** Retain all inputs. Reconcile identities, never display names. Durations
 * are observations, not elapsed wall time, CPU or teardown completion. */
export function summarize({ stages, observations, mappings = [] }) {
  const issues = [], cases = [], modules = [], unknown = [], groups = new Map(), moduleGroups = new Map(), nodeGroups = new Map();
  const mapped = new Map();
  for (const pair of mappings) {
    if (mapped.has(pair.generated) && mapped.get(pair.generated) !== pair.source) issues.push('Conflicting Counting source mapping');
    mapped.set(pair.generated,pair.source);
  }
  for (const row of observations) {
    if (row.runner === 'vitest' && row.record === 'case') {
      if (typeof row.id !== 'string' || !row.project || !row.file) { unknown.push(row); continue; }
      const key = vitestKey(row); if (!groups.has(key)) groups.set(key,[]); groups.get(key).push(row);
    } else if (row.runner === 'vitest' && row.record === 'module') {
      const key = JSON.stringify([row.phase,row.project,row.file]); if (!moduleGroups.has(key)) moduleGroups.set(key,[]); moduleGroups.get(key).push(row);
    } else if (row.record === 'node-event' && !['test:summary','test:interrupted'].includes(row.event)) {
      const key = nodeKey(row); if (key === null) { unknown.push(row); continue; }
      if (!nodeGroups.has(key)) nodeGroups.set(key,[]); nodeGroups.get(key).push(row);
    }
  }
  function reconcile(rows, label) {
    const terminal = rows.filter(row => row.state !== null && row.state !== undefined);
    if (!terminal.length) return null;
    if (new Set(terminal.map(row => row.state)).size > 1) issues.push('Conflicting terminal state: ' + label);
    return terminal.findLast(row => row.source === 'final') ?? terminal.findLast(row => ['test:pass','test:fail'].includes(row.event)) ?? terminal.at(-1);
  }
  for (const [key,rows] of groups) {
    const final = reconcile(rows,key); if (!final) { unknown.push(...rows); continue; }
    cases.push({ ...final, durationMs:duration(final.durationMs), identity:key });
  }
  for (const [key,rows] of moduleGroups) {
    const final = reconcile(rows,key); if (final) modules.push({ ...final,durationMs:duration(final.durationMs) });
  }
  for (const [key,rows] of nodeGroups) {
    const final = reconcile(rows,key); if (!final) continue;
    const kinds = new Set(rows.map(row => row.classification).filter(Boolean));
    if (kinds.size !== 1 || !kinds.has('test')) { unknown.push(...rows); continue; }
    // In isolated mode wrappers/load failures lacking a real test identity
    // remain unknown above. Suites never enter the case ranking.
    cases.push({ ...final, identity:key, mappedSource:mapped.get(final.file) ?? null, durationMs:duration(final.durationMs) });
  }
  const stageRows = phases.map(name => stages.find(stage => stage.name === name) ?? { name,status:'unreached',exitCode:null,signal:null,wallMs:null,userMs:null,systemMs:null });
  const completeness = ['node','counting','plain','native'].map(phase => {
    const stage = stageRows.find(row => row.name === phase);
    const endings = observations.filter(row => row.phase === phase && (row.record === 'end' || row.event === 'test:summary'));
    const interrupted = observations.some(row => row.phase === phase && row.event === 'test:interrupted');
    const terminalOK = endings.length > 0 && !interrupted && endings.every(row => row.runner === 'vitest'
      ? row.reason === 'passed' && row.unhandledErrors === 0 : row.success === true);
    if (stage.status === 'passed' && !terminalOK) issues.push('Incomplete or unsuccessful terminal reporting: '+phase);
    return {phase,terminal:endings.length > 0,interrupted,status:stage.status === 'unreached' ? 'unreached'
      : stage.status === 'passed' && terminalOK ? 'complete' : 'partial'};
  });
  const projectRows = projects.map(project => {
    const phase = ['scope','scope-denial'].includes(project) ? 'native' : 'plain';
    const phaseState = completeness.find(row => row.phase === phase).status;
    const reached = phaseState !== 'unreached';
    const rows = modules.filter(row => row.project === project), valid = rows.filter(row => row.durationMs !== null);
    return { project, phase, modules:rows.length, durationMs:valid.reduce((sum,row) => sum+row.durationMs,0),
      status:!reached ? 'unreached' : !rows.length ? 'missing' : phaseState !== 'complete' || valid.length !== rows.length ? 'partial' : 'observed' };
  });
  const top = cases.filter(row => row.durationMs !== null).sort((a,b) => b.durationMs-a.durationMs || a.identity.localeCompare(b.identity)).slice(0,10);
  for (const stage of stageRows) {
    if (stage.status !== 'unreached' && stage.name !== 'kernel' && !observations.some(row => row.phase === stage.name)) issues.push('Missing observations: '+stage.name);
  }
  const nodeSummaries = observations.filter(row => row.event === 'test:summary');
  return { version:1, observations, stages:stageRows, cases, projects:projectRows, unknown, nodeSummaries, completeness, issues, top,
    qualification:'Observed case and module durations are concurrent sums, not wall time or CPU. Missing observations remain unknown.' };
}

export function formatSummary(summary) {
  const ms = value => duration(value) === null ? 'unknown' : value.toFixed(2) + ' ms';
  const lines = ['Test observations', summary.qualification];
  for (const stage of summary.stages) lines.push(`${stage.name}: ${stage.status}; wall ${ms(stage.wallMs)}; user ${ms(stage.userMs)}; system ${ms(stage.systemMs)}`);
  lines.push(`Slowest observed cases (${summary.top.length})`);
  for (const row of summary.top) lines.push(`${ms(row.durationMs)} ${row.runner}/${row.phase}${row.project ? '/'+row.project : ''} ${row.file ?? 'unknown source'}${row.mappedSource ? ' → '+row.mappedSource : ''} :: ${row.name} [${row.state}]`);
  if (!summary.cases.length) lines.push('No observed cases.');
  for (const project of summary.projects) lines.push(`Vitest ${project.project}: ${project.status}; ${project.modules} observed modules; test-and-hook duration sum ${project.status === 'unreached' || project.status === 'missing' ? 'unknown' : ms(project.durationMs)}`);
  for (const phase of ['node','counting']) {
    const rows = summary.cases.filter(row => row.runner === 'node' && row.phase === phase), known = rows.filter(row => row.durationMs !== null);
    lines.push(`${phase} observed cases: ${rows.length}; duration sum ${known.length ? ms(known.reduce((sum,row) => sum+row.durationMs,0)) : 'unknown'}; missing durations ${rows.length-known.length}`);
  }
  for (const phase of summary.completeness) lines.push(`${phase.phase} terminal evidence: ${phase.status}; ${phase.terminal ? 'observed' : 'missing or unreached'}${phase.interrupted ? '; interrupted' : ''}`);
  lines.push(`Unknown/suite observations: ${summary.unknown.length}; contradictory records: ${summary.issues.length}`);
  for (const issue of summary.issues) lines.push(issue);
  return lines.join('\n') + '\n';
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const directory = process.argv[2];
  if (!directory || process.argv.length !== 3) throw new Error('Usage: test-summary.mjs EVIDENCE_DIR');
  let stages = {version:1,stages:[]};
  try { stages = JSON.parse(readFileSync(resolve(directory,'stages.json'),'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const observations = [];
  for (const name of ['node','counting','plain','native']) {
    const stage = stages.stages.find(stage => stage.name === name);
    if (!stage || stage.status === 'unreached') continue;
    try { for (const line of readFileSync(resolve(directory,name+'.jsonl'),'utf8').split('\n').filter(Boolean)) observations.push(JSON.parse(line)); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  let mappings = [];
  try { mappings = JSON.parse(readFileSync(resolve(directory,'counting-sources.json'),'utf8')).mappings; }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const summary = summarize({stages:stages.stages,observations,mappings});
  process.stdout.write(formatSummary(summary));
  if (summary.issues.length || stages.reportErrors?.length) process.exitCode = 1;
}
