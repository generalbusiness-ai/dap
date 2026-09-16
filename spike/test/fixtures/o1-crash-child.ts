// Separate OS process: no mocked transactions or simulated thrown exceptions.
import { appendFileSync, readFileSync, writeSync } from 'node:fs';
import { Journal, O1_PROFILE_VERSION } from '../../src/journal.ts';
import { SQLiteBackend } from '../../src/sqlite.ts';
import { createJournal, keys, packages, people } from './o1-fixture.ts';
const [mode, path, point, input] = process.argv.slice(2);
const backend = new SQLiteBackend(path!, { writer: people.writer, profile: O1_PROFILE_VERSION, fault: p => {
  if ((mode === 'append' || mode === 'initialize') && p === point) { writeSync(1, 'kill:' + p); process.kill(process.pid, 'SIGKILL'); }
} });
if (mode === 'initialize') {
  createJournal(backend);
  throw new Error('crash point was not reached');
} else if (mode === 'append') {
  const journal = Journal.open({ backend, writerKey: keys.writer, packages });
  journal.submit(readFileSync(input!, 'utf8'));
  throw new Error('crash point was not reached');
} else if (mode === 'publish') {
  await backend.drain(record => { appendFileSync(input!, record.headerHash + '\n'); writeSync(1, 'kill:after-publish-before-ack'); process.kill(process.pid, 'SIGKILL'); });
} else if (mode !== 'lock') throw new Error('unknown child mode');
backend.close();
