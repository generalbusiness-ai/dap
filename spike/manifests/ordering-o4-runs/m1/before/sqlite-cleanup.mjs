import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { SQLiteBackend } = await import(process.env.WT + '/spike/src/sqlite.ts');
const originalExec = DatabaseSync.prototype.exec, originalClose = DatabaseSync.prototype.close;
for (const scenario of ['constructor-rollback', 'constructor-close', 'serialized-rollback']) {
  const root = mkdtempSync(join(tmpdir(), 'm1-cleanup-')), original = new Error('original operation failed'), cleanup = new Error('cleanup failed');
  let armed = false, captured, cleanupCalls = 0;
  DatabaseSync.prototype.exec = function (sql) {
    captured = this;
    if (armed && scenario.startsWith('constructor') && sql.includes('CREATE TABLE')) throw original;
    if (armed && scenario.endsWith('rollback') && sql === 'ROLLBACK') { cleanupCalls++; throw cleanup; }
    return originalExec.call(this, sql);
  };
  DatabaseSync.prototype.close = function () {
    const out = originalClose.call(this);
    if (armed && scenario === 'constructor-close') { cleanupCalls++; throw cleanup; }
    return out;
  };
  let backend;
  try {
    if (scenario.startsWith('constructor')) armed = true;
    backend = new SQLiteBackend(join(root, 'db.sqlite'), { writer: 'fixture', profile: 'fixture' });
    if (scenario.startsWith('serialized')) { armed = true; backend.serialized(() => { throw original; }); }
  } catch (error) {
    console.log(JSON.stringify({ scenario, originalPreserved: error === original, cleanupReplacedOriginal: error === cleanup, cleanupCalls, handleStillOpen: captured.isOpen, transactionStillOpen: captured.isOpen ? captured.isTransaction : false }));
  } finally {
    armed = false; DatabaseSync.prototype.exec = originalExec; DatabaseSync.prototype.close = originalClose;
    if (captured?.isOpen) originalClose.call(captured);
  }
}
