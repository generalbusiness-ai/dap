// Real local processes for O2: one writer, independent clients, and SIGKILL.
// This is transport and fault injection only; Journal owns every submission.
import { appendFileSync, readFileSync, writeSync } from 'node:fs';
import { createConnection, createServer } from 'node:net';
import { encodeWire } from '../../src/codec.ts';
import { Journal, O1_PROFILE_VERSION } from '../../src/journal.ts';
import { SQLiteBackend } from '../../src/sqlite.ts';
import type { TransportCredential } from '../../src/append.ts';
import { keys, packages, people } from './o1-fixture.ts';

export interface Request { label: string; committed: string; credential?: TransportCredential }
const [mode, path, input, schedule] = process.argv.slice(2);
function kill(point: string): never {
  writeSync(1, 'kill:' + point + '\n');
  process.kill(process.pid, 'SIGKILL');
  throw new Error('SIGKILL did not terminate the child');
}
if (mode === 'client') {
  const requests = JSON.parse(readFileSync(input!, 'utf8')) as Request[];
  process.once('message', message => {
    if (message !== 'go') throw new Error('expected release barrier');
    const socket = createConnection(path!);
    let buffer = '';
    const replies: unknown[] = [];
    socket.on('connect', () => socket.write(requests.map(r => JSON.stringify(r) + '\n').join('')));
    socket.on('data', bytes => {
      buffer += bytes.toString();
      let newline: number;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        replies.push(JSON.parse(buffer.slice(0, newline)));
        buffer = buffer.slice(newline + 1);
      }
      if (replies.length === requests.length) {
        socket.end();
        process.send!({ type: 'results', replies }, () => process.disconnect());
      }
    });
    socket.on('error', error => { throw error; });
  });
  process.send!({ type: 'ready' });
} else {
  const backend = new SQLiteBackend(path!, {
    writer: people.writer, profile: O1_PROFILE_VERSION,
    fault: point => {
      if (mode === 'crash' && schedule === point) kill(point);
    },
  });
  const journal = Journal.open({ backend, writerKey: keys.writer, packages });
  if (mode === 'writer') {
    const server = createServer(socket => {
      let buffer = '';
      socket.on('data', bytes => {
        buffer += bytes.toString();
        let newline: number;
        while ((newline = buffer.indexOf('\n')) >= 0) {
          const request = JSON.parse(buffer.slice(0, newline)) as Request;
          buffer = buffer.slice(newline + 1);
          const result = journal.submit(request.committed, request.credential);
          socket.write(JSON.stringify({ label: request.label, result }) + '\n');
        }
      });
      socket.on('error', error => { throw error; });
    });
    server.listen(input!, () => process.send!({ type: 'ready' }));
    process.once('message', message => {
      if (message !== 'stop') throw new Error('expected stop');
      server.close(() => { backend.close(); process.disconnect(); });
    });
  } else if (mode === 'crash') {
    const request = JSON.parse(readFileSync(input!, 'utf8')) as Request;
    if (schedule === 'before-append') kill(schedule);
    const result = journal.submit(request.committed, request.credential);
    if (schedule === 'after-reply-before-notification') {
      writeSync(1, JSON.stringify({ reply: result }) + '\n');
      kill(schedule);
    }
    throw new Error('crash point was not reached');
  } else if (mode === 'publish') {
    await backend.drain(record => {
      appendFileSync(input!, JSON.stringify({ headerHash: record.headerHash, wire: encodeWire({ header: record.entry.header, committed: record.entry.committed! }) }) + '\n');
      kill('after-delivery-before-ack');
    });
    throw new Error('publication crash point was not reached');
  } else throw new Error('unknown child mode');
}
