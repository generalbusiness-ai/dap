/** DX-TR source metrics. Run from any cwd; JSON goes only to stdout. */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { API } from 'typescript/unstable/sync';
import { SyntaxKind as K, createScanner } from 'typescript/unstable/ast';
import { tsImport } from 'tsx/esm/api';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const rel = p => relative(root, p).replaceAll('\\', '/');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const before = resolve(root, 'spikes/typed-surface-before');
const names = ['lending', 'counter', 'grow-room', 'grow-site', 'change-slice'];
const entries = ['lending.ts', 'commitments.ts', 'grow-room.ts', 'grow-site.ts', 'lanes.ts'];
const originalFiles = [
  ['examples/lending/definition.ts'], ['apps/counter/commitments.ts'],
  ['examples/grow/room.ts', 'examples/grow/zone.ts', 'examples/grow/device.ts', 'examples/grow/work.ts', 'examples/grow/watering.ts', 'examples/grow/presence.ts'],
  ['examples/grow/site.ts', 'examples/grow/presence.ts'],
  ['apps/room/lanes/definitions/change.json'],
];
const shared = new Set(['lib.ts', 'package.ts', 'story.ts']);
const sourceText = p => readFileSync(p, 'utf8');
const baseline = JSON.parse(sourceText(resolve(here, 'baseline.json')));
if (baseline.commit !== 'f77e454a84fca21e22eec7fe6d7eed16d7cf08e1' || baseline.files.length !== 15) throw new Error('Unexpected historical baseline identity');
for (const f of baseline.files) {
  const retained = resolve(before, f.path.slice(baseline.originalDirectory.length + 1));
  const bytes = readFileSync(retained);
  if (bytes.length !== f.bytes || sha(bytes) !== f.sha256) throw new Error(`Historical source changed: ${rel(retained)}`);
}
const api = new API({ cwd: root });
let snapshot;
try {
  snapshot = api.updateSnapshot({ openProjects: [resolve(before, 'tsconfig.json'), resolve(here, 'tsconfig.json')], openFiles: originalFiles.flat().filter(f => f.endsWith('.ts')).map(f => resolve(root, f)) });
  const fileCache = new Map(), inputHashes = new Map();
  const sourceOf = p => {
    if (fileCache.has(p)) return fileCache.get(p);
    const project = snapshot.getDefaultProjectForFile(p) ?? snapshot.getProjects().find(pj => pj.program.getSourceFile(p));
    const sf = project?.program.getSourceFile(p);
    if (!sf) throw new Error(`No TypeScript AST for ${rel(p)}`);
    fileCache.set(p, sf); return sf;
  };
  const walk = (n, f) => { f(n); n.forEachChild(c => { walk(c, f); }); };
  const literal = n => n && (n.kind === K.StringLiteral || n.kind === K.NoSubstitutionTemplateLiteral) ? n.text : null;
  const location = (sf, n) => { const p = sf.getLineAndCharacterOfPosition(n.getStart(sf)); return { line: p.line + 1, column: p.character + 1 }; };
  const scannerLines = sf => {
    const text = sf.text, protectedTokens = new Map();
    walk(sf, node => { if ([K.RegularExpressionLiteral, K.NoSubstitutionTemplateLiteral, K.TemplateHead, K.TemplateMiddle, K.TemplateTail].includes(node.kind)) protectedTokens.set(node.getStart(sf), node.end); });
    const scanner = createScanner(true, undefined, text), lines = new Set();
    const starts = [0]; for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
    const lineAt = pos => { let lo = 0, hi = starts.length; while (lo + 1 < hi) { const m = (lo + hi) >>> 1; if (starts[m] <= pos) lo = m; else hi = m; } return lo; };
    while (scanner.scan() !== K.EndOfFile) {
      const start = scanner.getTokenStart(), end = protectedTokens.get(start) ?? scanner.getTokenEnd();
      const a = lineAt(start), b = lineAt(Math.max(start, end - 1));
      for (let line = a; line <= b; line++) lines.add(line);
      if (protectedTokens.has(start)) scanner.resetTokenState(end);
    }
    return lines.size;
  };
  const metrics = p => {
    const bytes = readFileSync(p), text = bytes.toString('utf8');
    if (inputHashes.has(p) && inputHashes.get(p) !== sha(bytes)) throw new Error(`Measurement input changed: ${rel(p)}`);
    inputHashes.set(p, sha(bytes));
    if (!p.endsWith('.ts')) return { path: rel(p), bytes: bytes.length, sha256: sha(bytes), codeLines: null, qualification: 'JSON data; no TypeScript source-line metric' };
    const sf = sourceOf(p), bindings = new Map(), imports = [], typeImports = [], references = [], strings = [];
    if (sf.text !== text) throw new Error(`AST/source bytes differ: ${rel(p)}`);
    const leaves = { constant: 0, nothing: 0, part: 0, el: 0 };
    const declarations = { functions: 0, classes: 0, variables: 0, types: 0, callSites: 0 };
    for (const s of sf.statements) if (s.kind === K.ImportDeclaration && literal(s.moduleSpecifier)) {
      const module = literal(s.moduleSpecifier), clause = s.importClause;
      const add = (local, imported, onlyType) => { (onlyType ? typeImports : imports).push({ module, imported, local }); if (!onlyType) bindings.set(local, { module, imported }); };
      if (clause?.name) add(clause.name.text, 'default', clause.isTypeOnly);
      const b = clause?.namedBindings;
      if (b?.kind === K.NamedImports) for (const e of b.elements) add(e.name.text, e.propertyName?.text ?? e.name.text, clause.isTypeOnly || e.isTypeOnly);
      if (b?.kind === K.NamespaceImport) add(b.name.text, '*', clause.isTypeOnly);
    }
    const callable = e => {
      if (e?.kind === K.Identifier) return bindings.get(e.text)?.imported ?? e.text;
      if (e?.kind === K.PropertyAccessExpression) return e.name.text;
      return '';
    };
    const importedLeaf = n => {
      const b = bindings.get(n.text);
      return b?.module.endsWith('/lib.ts') || b?.module === './lib.ts' ? b.imported : null;
    };
    const helpers = [], stringSites = new Set();
    walk(sf, n => {
      const functionLike = [K.FunctionDeclaration, K.FunctionExpression, K.ArrowFunction].includes(n.kind);
      const name = n.kind === K.FunctionDeclaration ? n.name?.text : n.parent?.kind === K.VariableDeclaration && n.parent.name.kind === K.Identifier ? n.parent.name.text : null;
      if (!functionLike || !name) return;
      let scope = n.parent; while (scope && ![K.Block, K.SourceFile].includes(scope.kind)) scope = scope.parent;
      helpers.push({ node: n, name, scope: scope ?? sf, parameters: new Map() });
    });
    let propagationChanged = false;
    const addString = (category, n, use) => {
      const value = literal(n), site = `${category}:${n?.pos}`;
      if (value !== null && !stringSites.has(site)) { stringSites.add(site); strings.push({ category, value, use, ...location(sf, n) }); }
      if (n?.kind !== K.Identifier) return;
      for (let parent = n.parent; parent; parent = parent.parent) {
        if (!parent.parameters) continue;
        const index = parent.parameters.findIndex(p => p.name.kind === K.Identifier && p.name.text === n.text);
        if (index < 0) continue;
        const helper = helpers.find(h => h.node === parent);
        if (helper) { const categories = helper.parameters.get(index) ?? new Set(); if (!categories.has(category)) { categories.add(category); helper.parameters.set(index, categories); propagationChanged = true; } }
        break;
      }
    };
    const typeAncestor = n => { for (let a = n.parent; a; a = a.parent) if ([K.TypeAliasDeclaration, K.InterfaceDeclaration, K.TypeReference, K.TypeQuery, K.ImportType, K.LiteralType].includes(a.kind)) return true; return false; };
    walk(sf, n => {
      if (n.kind === K.FunctionDeclaration) declarations.functions++;
      if (n.kind === K.ClassDeclaration) declarations.classes++;
      if (n.kind === K.VariableDeclaration) declarations.variables++;
      if (n.kind === K.TypeAliasDeclaration || n.kind === K.InterfaceDeclaration) declarations.types++;
      if (n.kind === K.Identifier && importedLeaf(n) === 'nothing' && !typeAncestor(n)) {
        const parent = n.parent;
        if (parent?.kind !== K.ImportSpecifier && !(parent?.name === n && [K.PropertyAssignment, K.PropertyAccessExpression, K.VariableDeclaration, K.Parameter].includes(parent.kind))) {
          leaves.nothing++; references.push({ name: 'nothing', kind: 'value-reference', ...location(sf, n) });
        }
      }
      if (n.kind === K.CallExpression) {
        declarations.callSites++;
        const call = callable(n.expression), args = n.arguments;
        const leaf = n.expression.kind === K.Identifier ? importedLeaf(n.expression) : null;
        if (['constant', 'part', 'el'].includes(leaf)) { leaves[leaf]++; references.push({ name: leaf, kind: 'call', ...location(sf, n) }); }
        if (['open', 'transition', 'comment'].includes(call)) addString('grantUse', args[1], call);
        if (call === 'refuse') addString('reasonUse', args[0], call);
        if (call === 'require') addString('reasonUse', args[1], call);
        if (call === 'notify') addString('reasonUse', args[2], call);
        if (call === 'via') addString('subjectUse', args[1], call);
        if (['each', 'has', 'distinct', 'eachOf', 'authorsIn', 'sameSet'].includes(call)) addString('subjectUse', args[1], call);
        if (call === 'el') addString('subjectUse', args[0], call);
        if (call === 'itemOf') addString('itemTypeUse', args[0], call);
        if (call === 'grants' || call === 'reasons') {
          const obj = args[0]; if (obj?.kind === K.ObjectLiteralExpression) for (const prop of obj.properties) if (prop.kind === K.PropertyAssignment) addString(call === 'grants' ? 'grantDeclaration' : 'reasonDeclaration', prop.initializer, call);
        }
      }
      if (n.kind === K.PropertyAssignment) {
        const key = n.name?.text;
        if (key === 'grant') addString('grantUse', n.initializer, 'data.grant');
        if (key === 'reason') addString('reasonUse', n.initializer, 'data.reason');
        if (key === 'of') {
          const obj = n.parent;
          const type = obj?.properties?.find(p => p.kind === K.PropertyAssignment && p.name?.text === 'type');
          if (literal(type?.initializer) === 'item') addString('itemTypeUse', n.initializer, 'data.item.of');
          else if (literal(n.initializer) === 'on' || literal(n.initializer)?.startsWith('also.') || literal(n.initializer) === 'each') addString('subjectUse', n.initializer, 'data.of');
        }
      }
    });
    // Follow local helper parameters into these same syntactic positions. No text-name guessing.
    for (let round = 0; round <= helpers.length; round++) {
      propagationChanged = false;
      walk(sf, n => {
        if (n.kind !== K.CallExpression || n.expression.kind !== K.Identifier) return;
        const helper = helpers.filter(h => h.name === n.expression.text && h.scope.pos <= n.pos && h.scope.end >= n.end).sort((a, b) => (a.scope.end - a.scope.pos) - (b.scope.end - b.scope.pos))[0];
        if (helper) for (const [index, categories] of helper.parameters) for (const category of categories) addString(category, n.arguments[index], `helper ${helper.name} argument ${index + 1}`);
      });
      if (!propagationChanged) break;
      if (round === helpers.length) throw new Error(`Name-argument propagation did not converge: ${rel(p)}`);
    }
    const nameStrings = Object.fromEntries(['grantDeclaration', 'grantUse', 'reasonDeclaration', 'reasonUse', 'subjectUse', 'itemTypeUse'].map(k => [k, strings.filter(s => s.category === k).length]));
    return { path: rel(p), bytes: bytes.length, sha256: sha(bytes), codeLines: scannerLines(sf), declarations, leaves, nameStrings, occurrences: { leaves: references, names: strings.sort((a, b) => a.line - b.line || a.column - b.column) }, helperNameParameters: helpers.filter(h => h.parameters.size).map(h => ({ name: h.name, ...location(sf, h.node), parameters: [...h.parameters].map(([index, categories]) => ({ index, categories: [...categories].sort() })) })), imports, typeImports };
  };
  const authoredGraph = (dir, entry) => {
    const visited = new Set();
    const visit = p => {
      if (visited.has(p)) return; visited.add(p);
      const sf = sourceOf(p);
      for (const s of sf.statements) if (s.kind === K.ImportDeclaration && !s.importClause?.isTypeOnly) {
        const spec = literal(s.moduleSpecifier);
        if (spec?.startsWith('./') && spec.endsWith('.ts') && !shared.has(spec.slice(2))) visit(resolve(dirname(p), spec));
      }
    };
    visit(resolve(dir, entry)); return [...visited].sort();
  };
  const aggregate = files => {
    const ms = files.map(metrics), totals = { bytes: 0, codeLines: 0, leaves: {}, nameStrings: {}, declarations: {} };
    for (const m of ms) {
      totals.bytes += m.bytes; totals.codeLines += m.codeLines ?? 0;
      for (const key of ['leaves', 'nameStrings', 'declarations']) for (const [k, n] of Object.entries(m[key] ?? {})) totals[key][k] = (totals[key][k] ?? 0) + n;
    }
    const vocabulary = [...new Set(ms.flatMap(m => (m.imports ?? []).filter(i => i.module === './lib.ts').map(i => i.imported)))].sort();
    return { files: ms, totals, vocabulary, vocabularyCount: vocabulary.length };
  };
  const sides = [before, here].map(dir => {
    const graphs = entries.map(e => authoredGraph(dir, e));
    return { directory: rel(dir), definitions: names.map((name, i) => ({ name, entry: rel(resolve(dir, entries[i])), ...aggregate(graphs[i]) })), growAuthoringUnion: aggregate([...new Set([...graphs[2], ...graphs[3]])].sort()), growSharedFiles: graphs[2].filter(file => graphs[3].includes(file)).map(rel), uniqueAuthoringUnion: aggregate([...new Set(graphs.flat())].sort()), sharedImplementation: aggregate([...shared].map(f => resolve(dir, f))) };
  });
  const imports = async dir => {
    const load = f => tsImport(pathToFileURL(resolve(dir, f)).href, { parentURL: import.meta.url, tsconfig: resolve(dir, 'tsconfig.json') });
    const lib = await load('lib.ts'), lending = await load('lending.ts'), counter = await load('commitments.ts'), room = await load('grow-room.ts'), site = await load('grow-site.ts'), lane = await load('lanes.ts');
    const originalRoom = await tsImport(pathToFileURL(resolve(root, 'examples/grow/room.ts')).href, { parentURL: import.meta.url, tsconfig: resolve(dir, 'tsconfig.json') });
    const bytes = await tsImport('@generalbusiness/dap-bytes', { parentURL: pathToFileURL(resolve(dir, 'lib.ts')).href, tsconfig: resolve(dir, 'tsconfig.json') });
    const slice = lib.define({ name: 'change', genesis: 'accept', items: lane.items, acts: lane.acts, receives: lane.receives, capabilities: [{ name: 'hold', version: 1 }, { name: 'git-read', version: 1 }] });
    return { lib, bytes, values: [lending.lending, counter.countingCommitments, room.room, site.growSite(bytes.definitionDigest(originalRoom.room)), slice] };
  };
  const dataMetrics = (value, lib, bytes) => {
    const data = lib.normalize(value), text = bytes.canonicalize(data), forms = { guards: 0, effects: 0, sends: 0 };
    const scan = v => { if (!v || typeof v !== 'object') return; for (const [k, x] of Object.entries(v)) { if (k in forms && Array.isArray(x)) forms[k] += x.length; if (Array.isArray(x)) x.forEach(scan); else scan(x); } }; scan(data);
    return { definitionDigest: bytes.definitionDigest(data), canonicalBytes: Buffer.byteLength(text), canonicalSha256: sha(text), items: Object.keys(data.items).length, acts: Object.keys(data.acts).length, receives: Object.keys(data.receives).length, ...forms };
  };
  const built = await Promise.all([imports(before), imports(here)]);
  const data = names.map((name, i) => {
    const b = dataMetrics(built[0].values[i], built[0].lib, built[0].bytes), a = dataMetrics(built[1].values[i], built[1].lib, built[1].bytes);
    return { name, before: b, after: a, canonicalEqual: b.canonicalSha256 === a.canonicalSha256, qualification: name === 'change-slice' ? 'Seven items/five acts/two handlers only; this is not whole Change validation' : ['grow-room'].includes(name) ? 'Canonical spelling comparison; pinned original spelling differs' : 'Canonical definition data' };
  });
  const originalLoad = file => tsImport(pathToFileURL(resolve(root, file)).href, { parentURL: import.meta.url, tsconfig: resolve(here, 'tsconfig.json') });
  const originalValues = [(await originalLoad('examples/lending/definition.ts')).lending, (await originalLoad('apps/counter/commitments.ts')).countingCommitments, (await originalLoad('examples/grow/room.ts')).room, (await originalLoad('examples/grow/site.ts')).site, JSON.parse(sourceText(resolve(root, 'apps/room/lanes/definitions/change.json')))];
  const currentOriginalData = originalValues.map((value, i) => ({ name: i === 4 ? 'whole-change-original' : names[i], rawDefinitionDigest: built[1].bytes.definitionDigest(value), ...dataMetrics(value, built[0].lib, built[1].bytes), qualification: i === 4 ? 'Whole current original Change data, not the authoring slice; not compared as a whole with that slice' : 'Fresh current original data normalized by historical canonical spelling; raw pin digest remains separate' }));
  const report = sourceText(resolve(before, 'REPORT.md'));
  const start = report.indexOf('| Source | Code lines | Bytes |'), end = report.indexOf('\n\n', start);
  if (start < 0 || end < 0) throw new Error('Historical REPORT table is missing');
  const result = {
    schema: 'artroom-dxtr-measurements@1', tools: { node: process.version, typescript: JSON.parse(sourceText(resolve(root, 'node_modules/typescript/package.json'))).version, tsx: JSON.parse(sourceText(resolve(root, 'node_modules/tsx/package.json'))).version }, historical: { commit: baseline.commit, baselineSha256: sha(sourceText(resolve(here, 'baseline.json'))), reportSha256: sha(report), table: report.slice(start, end), method: 'Historical wc and blank/comment-line grep; historical observations only' },
    method: { parser: 'Pinned TypeScript 7 native AST API; scanner code-token physical lines', bytes: 'Exact full-file UTF-8 bytes including comments and imports', leaves: 'Imported constant/part/el call sites; imported nothing expression references; declarations/import specifiers/type references excluded', strings: 'Syntactic literal occurrences at named API/data positions and local helper parameters forwarded into those positions; declarations and uses separate; cross-module forwarding and expression text not guessed', vocabulary: 'Distinct non-type imported lib.ts exports, object builders counted once; local helper imports retained per file', attribution: 'Full reachable authoring modules excluding lib/package/story. Shared grow modules appear in each inclusive definition row; uniqueAuthoringUnion counts each physical file once. Grow site imports grow-room constants, so its full-file graph also includes room code; this is not a claim that every declaration contributes to site data.', canonical: 'Production bytes.canonicalize after each side normalize; source-only structural counts do not execute judges', editor: 'Not measured' },
    sides, currentOriginalSources: { qualification: 'Fresh measurements of current checkout originals, not the historical REPORT observations. Grow shared presence counted in each inclusive row and once in union.', definitions: names.map((name, i) => ({ name, ...aggregate(originalFiles[i].map(f => resolve(root, f))) })), uniqueUnion: aggregate([...new Set(originalFiles.flat())].sort().map(f => resolve(root, f))) }, currentOriginalData, data,
  };
  for (const [file, hash] of inputHashes) if (sha(readFileSync(file)) !== hash) throw new Error(`Measurement input changed before completion: ${rel(file)}`);
  result.sourceInputsStable = true;
  console.log(JSON.stringify(result, null, 2));
  if (data.some(row => !row.canonicalEqual)) process.exitCode = 1;
} finally { snapshot?.dispose(); api.close(); }
