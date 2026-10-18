import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { connect } from "node:net";
import { runNodeWitness } from "./node-witness.mjs";

async function fixture(t, body) {
  const dir = await mkdtemp(join(tmpdir(), "counting-child-bound-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = join(dir, "witness.test.mjs");
  await writeFile(file, body);
  return { file, dir };
}

test("the generated witness's own test timeout names the stalled case and preserves its failure", { timeout: 10_000 }, async t => {
  const { file } = await fixture(t, `
    import test from 'node:test';
    test('blocked generated client', t => {
      const keepAlive = setInterval(() => {}, 1000);
      t.after(() => clearInterval(keepAlive));
      return new Promise(() => {});
    });
  `);
  const messages = [];
  const run = await runNodeWitness([file], { testTimeoutMs: 100, runTimeoutMs: 3000, capture: true, report: line => messages.push(line) });
  assert.equal(run.code, 1);
  assert.equal(run.reason, "exit");
  assert.match(run.stdout + run.stderr, /blocked generated client/);
  assert.match(run.stdout + run.stderr, /timed out after 100ms/);
  assert.deepEqual(messages, []);
});

test("a module that never reaches a case hits the whole child deadline even if reporting fails", { timeout: 10_000 }, async t => {
  const { file, dir } = await fixture(t, `
    import { writeFileSync } from 'node:fs';
    writeFileSync(new URL('./started', import.meta.url), String(process.pid));
    setInterval(() => {}, 1000);
    await new Promise(() => {});
  `);
  const messages = [];
  const run = await runNodeWitness([file], { testTimeoutMs: 5000, runTimeoutMs: 1500, capture: true, report: line => { messages.push(line); throw new Error("fixture reporter failure"); } });
  assert.match(await readFile(join(dir, "started"), "utf8"), /^\d+$/);
  assert.equal(run.code, 124);
  assert.equal(run.reason, "timeout");
  assert.match(messages.join("\n"), /exceeded 1500ms, including startup\/teardown: witness.test.mjs/);
  assert.match(run.stderr, /diagnostic callback failed: fixture reporter failure/);
});

test("finishing a case does not turn a child stuck in teardown into a pass", { timeout: 10_000 }, async t => {
  const { file } = await fixture(t, `
    import test from 'node:test';
    setInterval(() => {}, 1000);
    test('completed body', () => console.log('BODY_COMPLETED'));
  `);
  const run = await runNodeWitness([file], { testTimeoutMs: 5000, runTimeoutMs: 1500, capture: true, report: () => {} });
  assert.match(run.stdout, /BODY_COMPLETED/);
  assert.equal(run.code, 124);
  assert.equal(run.reason, "timeout");
});

test("interrupting the wrapper also stops the detached test worker's owned listener", { timeout: 15_000, skip: process.platform === "win32" }, async t => {
  const { file, dir } = await fixture(t, `
    import { createServer } from 'node:net';
    const server = createServer(socket => socket.end());
    server.listen(0, '127.0.0.1', () => console.log('GROUP_READY:' + process.ppid + ':' + server.address().port));
    await new Promise(() => {});
  `);
  const wrapper = join(dir, "wrapper.mjs");
  await writeFile(wrapper, `
    import { runNodeWitness } from ${JSON.stringify(new URL("./node-witness.mjs", import.meta.url).href)};
    const run = await runNodeWitness([${JSON.stringify(file)}]);
    console.log('WRAPPER_RESULT:' + run.reason);
    process.exitCode = run.code;
  `);
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !["NODE_PATH", "NODE_OPTIONS", "NODE_TEST_CONTEXT"].includes(name)));
  const child = spawn(process.execPath, [wrapper], { env, stdio: ["ignore", "pipe", "pipe"] });
  const closed = once(child, "close");
  let group, output = "";
  t.after(() => {
    child.kill("SIGTERM");
    if (group) try { process.kill(-group, "SIGKILL"); } catch (error) { if (error.code !== "ESRCH") throw error; }
  });
  const ready = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("owned probe listener did not become ready")), 5000);
    child.stdout.on("data", chunk => {
      output += chunk;
      const match = /GROUP_READY:(\d+):(\d+)/.exec(output);
      if (match) { clearTimeout(timer); group = Number(match[1]); resolve({ port: Number(match[2]) }); }
    });
    child.once("error", error => { clearTimeout(timer); reject(error); });
  });
  child.kill("SIGTERM");
  const [code, signal] = await closed;
  assert.equal(signal, null);
  assert.equal(code, 143);
  assert.match(output, /WRAPPER_RESULT:interrupted/);
  const connected = await new Promise((resolve, reject) => {
    const socket = connect({ host: "127.0.0.1", port: ready.port });
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("error", error => error.code === "ECONNREFUSED" ? resolve(false) : reject(error));
    socket.setTimeout(1000, () => { socket.destroy(); reject(new Error("owned listener probe did not settle")); });
  });
  assert.equal(connected, false, "the interrupted test worker must release its listener");
});
