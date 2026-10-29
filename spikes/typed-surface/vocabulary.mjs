/** Generate the six-pattern reference from lib.ts JSDoc tags. */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getLeadingCommentRanges } from 'typescript/unstable/ast';
import { API } from 'typescript/unstable/sync';
import { dirname, resolve } from 'node:path';
const source = new URL('./lib.ts', import.meta.url), target = new URL('./VOCABULARY.md', import.meta.url);
const args = process.argv.slice(2);
if (args.some(a => a !== '--check') || args.length > 1) throw new Error('Usage: node spikes/typed-surface/vocabulary.mjs [--check]');
const text = readFileSync(source, 'utf8'), api = new API({ cwd: resolve(dirname(fileURLToPath(source)), '../..') });
let snapshot;
const comments = new Map();
try {
  snapshot = api.updateSnapshot({ openProjects: [fileURLToPath(new URL('./tsconfig.json', import.meta.url))] });
  const sf = snapshot.getProjects()[0]?.program.getSourceFile(fileURLToPath(source));
  if (!sf) throw new Error('No TypeScript AST for lib.ts');
  const walk = node => { for (const c of getLeadingCommentRanges(text, node.pos) ?? []) comments.set(c.pos, text.slice(c.pos, c.end)); node.forEachChild(child => { walk(child); }); };
  walk(sf);
} finally { snapshot?.dispose(); api.close(); }
const rows = [];
for (const raw of comments.values()) {
  if (!raw.startsWith('/**') || !raw.includes('@pattern')) continue;
  const comment = raw.slice(3, -2).split('\n').map(s => s.replace(/^\s*\* ?/, '').trimEnd()).join('\n').trim();
  const pattern = comment.match(/(?:^|\n)@pattern ([1-6]) ([^\n]+)(?:\n|$)/);
  const exampleAt = comment.indexOf('@example');
  if (!pattern || exampleAt < 0 || (comment.match(/@pattern/g) ?? []).length !== 1 || (comment.match(/@example/g) ?? []).length !== 1) throw new Error('Each pattern needs one @pattern and one @example');
  const description = [comment.slice(0, pattern.index), comment.slice(pattern.index + pattern[0].length, exampleAt)].join('\n').trim();
  let example = comment.slice(exampleAt + '@example'.length).trim();
  if (example.startsWith('```')) example = example.replace(/^```(?:ts|typescript)?\s*\n/, '').replace(/\n```$/, '');
  if (!description || !example || /\n@\w/.test(example)) throw new Error(`Incomplete pattern ${pattern[1]}`);
  rows.push({ id: Number(pattern[1]), name: pattern[2].trim(), description: description.replace(/\s+/g, ' '), example: example.replace(/\s+/g, ' ') });
}
rows.sort((a, b) => a.id - b.id);
if (rows.length !== 6 || rows.some((r, i) => r.id !== i + 1)) throw new Error('lib.ts must document exactly patterns 1–6');
const cell = text => text.replaceAll('|', '\\|').replaceAll('\n', ' ');
const code = text => { const ticks = text.includes('`') ? '``' : '`'; return `${ticks}${text}${ticks}`; };
const rendered = '# Typed authoring vocabulary\n\nGenerated from the six `@pattern` and `@example` comments in `lib.ts`.\nRun `node spikes/typed-surface/vocabulary.mjs --check` to check for drift.\n\n| Pattern | Meaning | Example |\n|---|---|---|\n' + rows.map(r => `| ${r.id}. ${cell(r.name)} | ${cell(r.description)} | ${cell(code(r.example))} |`).join('\n') + '\n';
if (args.includes('--check')) {
  if (readFileSync(target, 'utf8') !== rendered) { console.error('VOCABULARY.md differs from lib.ts comments'); process.exitCode = 1; }
  else console.log('VOCABULARY.md matches all six documented patterns');
} else { writeFileSync(target, rendered); console.log(`Generated ${fileURLToPath(target)}`); }
