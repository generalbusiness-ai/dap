import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { configOf } from "./security-settings.mjs";
import { CelldSmokeError, celldReference, celldSmokeDetail, celldSmokeOperation, celldSmokeTransport, contextForCelldSmoke, runCelldSmoke, sameCelldReference, smokeSettings } from "./celld-smoke.mjs";
import { BACKEND_TAIL_LINES, BACKEND_TAIL_LINE_BYTES, backendOutputFor, backendTail, matchesCelldVersion, proxyFailureObservation } from "./test-celld-proxy.mjs";

test("the proxy compares the maintained celld pin as a whole version token without a hidden release literal", async () => {
  const pin = await readFile(new URL("../apps/room/celld/celld.version", import.meta.url), "utf8");
  assert.equal(matchesCelldVersion(pin, `celld ${pin.trim()}`), true);
  assert.equal(matchesCelldVersion(pin, `celld ${pin.trim().slice(1)}\n`), true);
  // This version is synthetic comparison input, not a release or compatibility claim.
  const synthetic = "v12.34.567\n";
  assert.equal(matchesCelldVersion(synthetic, "celld v12.34.567"), true);
  assert.equal(matchesCelldVersion(synthetic, "celld\t12.34.567\n"), true);
  for (const reported of ["celld 12.34.568", "celld 12.34.5670", "celld 112.34.567", "celld v12.34.567-rc.1", "celld prefixv12.34.567", "celld v12.34.567suffix"])
    assert.equal(matchesCelldVersion(synthetic, reported), false, reported);
  for (const invalid of [undefined, "", "v12.34.567", "12.34.567\n", "v12x34x567\n", "v12.34.567.*\n", "v12.34.567\n\n", " v12.34.567\n", "v12.34.567\r\n"])
    assert.throws(() => matchesCelldVersion(invalid, "celld 12.34.567"), /Invalid maintained celld version pin/);
});

function triggerBlock(workflow, trigger) {
  const lines = workflow.split("\n"), header = `  ${trigger}:`, start = lines.indexOf(header);
  assert.ok(start >= 0 && start === lines.lastIndexOf(header), `One ${trigger} block is required`);
  let end = start + 1;
  while (end < lines.length && (!lines[end] || lines[end].startsWith("    "))) end++;
  return lines.slice(start, end).join("\n");
}

function assertTriggerPaths(workflow, trigger) {
  const lines = triggerBlock(workflow, trigger).split("\n"), start = lines.indexOf("    paths:");
  assert.ok(start >= 0, `${trigger} keeps its paths list`);
  const paths = [];
  for (const line of lines.slice(start + 1)) {
    if (!line.trim()) continue;
    const match = /^      - '([^']+)'$/.exec(line);
    if (!match) break;
    paths.push(match[1]);
  }
  for (const path of ["packages/scope/**", "packages/mcp/**", "packages/cli/**", "packages/platform/**", "packages/derive/**", "packages/bytes/**", "apps/room/**", "scripts/celld-smoke*", "scripts/test-celld-proxy*", ".github/workflows/celld-smoke.yml", "package.json", "package-lock.json"])
    assert.ok(paths.includes(path), `${trigger} must include ${path}`);
}

test("both smoke workflow triggers cover runtime packages and retain lockfile coverage", async () => {
  const workflow = await readFile(new URL("../.github/workflows/celld-smoke.yml", import.meta.url), "utf8");
  // Literal source policy only: this does not emulate GitHub glob matching or run CI.
  for (const trigger of ["pull_request", "push"]) {
    assertTriggerPaths(workflow, trigger);
    const block = triggerBlock(workflow, trigger), other = trigger === "push" ? "pull_request" : "push";
    for (const path of ["packages/cli/**", "package-lock.json"]) {
      const missing = block.replace(`      - '${path}'`, "");
      assert.notEqual(missing, block);
      const specimen = workflow.replace(block, missing);
      assert.throws(() => assertTriggerPaths(specimen, trigger), error => error.message.includes(trigger) && error.message.includes(path));
      assertTriggerPaths(specimen, other);
    }
  }
});

test("local project keeps a distinct deployment identity, native migrations and pinned workflow actions without committed secrets", async () => {
  const local = JSON.parse(await readFile(new URL("../apps/room/celld/wrangler.json", import.meta.url), "utf8"));
  const deployed = configOf(await readFile(new URL("../apps/room/wrangler.jsonc", import.meta.url), "utf8"), "apps/room/wrangler.jsonc");
  assert.equal(local.name, "dap-celld-local");
  assert.notEqual(local.name, deployed.name);
  assert.deepEqual(local.durable_objects, deployed.durable_objects);
  assert.deepEqual(local.migrations, deployed.migrations);
  assert.deepEqual(Object.keys(local).sort(), ["compatibility_date", "compatibility_flags", "durable_objects", "main", "migrations", "name", "vars"]);
  assert.equal(local.vars.SCOPE_INDEX_MODE, "enforce");
  assert.equal(Object.hasOwn(local.vars, "SESSION_SECRET"), false);
  assert.equal(Object.hasOwn(local.vars, "REGISTER_SCOPE"), false);
  assert.equal(await readFile(new URL("../apps/room/celld/worker.ts", import.meta.url), "utf8"), 'export * from "../worker.ts";\nexport { default } from "../worker.ts";\n');
  assert.match(await readFile(new URL("../apps/room/celld/celld.version", import.meta.url), "utf8"), /^v[0-9]+\.[0-9]+\.[0-9]+\n$/);
  const workflow = await readFile(new URL("../.github/workflows/celld-smoke.yml", import.meta.url), "utf8");
  const actions = [...workflow.matchAll(/^\s*(?:-\s+)?uses:\s*(.+)$/gm)].map(line => {
    const pin = /^([A-Za-z0-9_.-]+\/[A-Za-z0-9_./-]+)@([0-9a-f]{40})\s+# v([1-9][0-9]*)$/.exec(line[1].trim());
    assert.ok(pin, "Every workflow action uses a full commit hash and trailing # vN comment");
    return { name: pin[1], major: pin[3] };
  });
  for (const name of ["actions/checkout", "actions/setup-node"])
    assert.ok(actions.some(action => action.name === name && action.major === "6"), `${name} keeps its reviewed v6 major`);
});

test("smoke planning retains the actual native host-none install offline and exposes only its public identity", async () => {
  const home = await mkdtemp(join(tmpdir(), "dap-celld-plan-"));
  let calls = 0;
  const fetch = async () => { calls++; throw Error("Private transport sentinel must stay private"); };
  try {
    const report = await runCelldSmoke({ phase: "plan", base: "http://127.0.0.1:9876", home, fetch });
    assert.deepEqual(Object.keys(report).sort(), ["definition", "phase", "register", "version"]);
    assert.match(report.register, /^sc_[a-z2-7]{52}$/);
    assert.equal(report.definition, "platform:register@28");
    assert.equal(calls, 0);
    const config = JSON.parse(await readFile(join(home, "config.json"), "utf8"));
    assert.equal(config.plan.register, report.register);
    assert.equal(config.plan.founding.intent.fields.host, "none");
    assert.equal(config.plan.founding.intent.fields.namespace, "");
    assert.equal(config.register, undefined);
    assert.ok((await stat(join(home, "keys", "operator.key"))).size > 0);
    assert.equal((await stat(join(home, "config.json"))).mode & 0o077, 0);
    assert.equal((await stat(home)).mode & 0o077, 0);
    assert.equal(JSON.stringify(report).includes(config.plan.founding.sig), false);
    assert.equal(JSON.stringify(report).includes("Private transport sentinel"), false);
    const original = await readFile(join(home, "config.json"), "utf8");
    const ctx = await contextForCelldSmoke({ base: config.service, home, fetch });
    assert.equal(ctx.trustedCreationService.service, config.service);
    assert.equal(ctx.trustedCreationService.fetch, ctx.fetch);
    await ctx.store.keepPrivate("celld-smoke-run-started", new Uint8Array([1]));
    await assert.rejects(() => runCelldSmoke({ phase: "run", base: config.service, home, fetch }), /run-already-started/);
    assert.equal(await readFile(join(home, "config.json"), "utf8"), original);
    assert.equal(calls, 0, "A second run cannot replace acknowledged or uncertain acts");
  } finally { await rm(home, { recursive: true, force: true }); }
});

test("smoke keeps proxy identity separate from the explicit local no-proxy address and never follows redirects", async () => {
  const home = await mkdtemp(join(tmpdir(), "dap-celld-port-"));
  const base = "http://127.0.0.1:9876", seen = [];
  const fetch = async (url, init) => { seen.push({ url, init }); return new Response(null, { status: 503 }); };
  try {
    const local = await contextForCelldSmoke({ base, home, localAddress: "127.0.0.1", fetch });
    await local.fetch(`${base}/health`, { headers: { "x-test": "actual transport boundary" } });
    assert.equal(seen[0].init.headers.get("cf-connecting-ip"), "127.0.0.1");
    assert.equal(seen[0].init.redirect, "error");
    assert.equal(seen[0].init.credentials, "omit");
    assert.ok(seen[0].init.signal instanceof AbortSignal);
    const proxy = await contextForCelldSmoke({ base: "https://localhost:9877", home, fetch });
    await proxy.fetch("https://localhost:9877/health");
    assert.equal(seen[1].init.headers.has("cf-connecting-ip"), false);
    await assert.rejects(() => local.fetch("https://another.invalid/health"), /request-origin/);
    assert.equal(seen.length, 2);
    for (const base of ["http://localhost:9876", "https://u:p@example.com", "https://example.com/path", "https://example.com/"])
      assert.throws(() => smokeSettings({ phase: "plan", base, home }), /base/);
    assert.throws(() => smokeSettings({ phase: "plan", base: "https://localhost:9877", home, localAddress: "127.0.0.1" }), /local-address/);
  } finally { await rm(home, { recursive: true, force: true }); }
});

// These are codec/comparison boundaries used by the real smoke, not a Worker stand-in.
test("smoke emits current scope references and compares the complete membership history", async () => {
  const at = { scope: `sc_${"a".repeat(52)}`, genesis: `sha256:${"1".repeat(64)}` };
  const otherGenesis = { ...at, genesis: `sha256:${"2".repeat(64)}` };
  assert.deepEqual(await celldReference(at), at);
  assert.equal(await sameCelldReference(at, { genesis: at.genesis, scope: at.scope }), true);
  assert.equal(await sameCelldReference(at, otherGenesis), false, "The same scope with another genesis is not the invited membership");
  assert.equal(await sameCelldReference(at, { ...at, scope: `sc_b${"a".repeat(51)}` }), false);
  for (const invalid of [null, undefined, [], at.scope, { scope: at.scope },
    { scope: at.scope, inc: `in_${"a".repeat(26)}`, kind: "membership" },
    { ...at, kind: "membership" }, { ...at, genesis: "not-a-digest" },
    { ...at, private: "Private retained state sentinel" }]) {
    assert.equal(await celldReference(invalid), null);
    assert.equal(await sameCelldReference(invalid, at), false);
    assert.equal(await sameCelldReference(at, invalid), false);
  }
});

test("proxy errors expose only a maintained smoke operation and never arbitrary private error state", () => {
  const sentinel = "Private invitation signing key and home sentinel";
  const error = new CelldSmokeError("install-identity");
  error.message = sentinel;
  error.stack = sentinel;
  error.cause = { private: sentinel };
  error.invitation = sentinel;
  const report = { operation: celldSmokeOperation(error) };
  assert.deepEqual(report, { operation: "install-identity" });
  assert.equal(JSON.stringify(report).includes(sentinel), false);
  for (const foreign of [new CelldSmokeError(sentinel), new Error(sentinel),
    { stage: "install-identity", message: sentinel }, null, undefined])
    assert.equal(celldSmokeOperation(foreign), null);

  // The real CLI's maintained result forms select labels, never their private dynamic text.
  const forms = [
    ["plan-missing", 2, "No install is planned here. Run: dap install --plan <base-url>."],
    ["plan-mismatch", 1, `Refused: plan-mismatch. ${sentinel}`],
    ["plan-expired", 1, `Refused: plan-expired. The planned install could be created until ${sentinel}`],
    ["retired-cohort", 1, `Refused: retired-cohort. ${sentinel}`],
    ["unsupported-provenance", 1, `Unsupported install provenance: ${sentinel}`],
    ["custody-verification", 1, "Held: storage of the exact selected install plan failed. No request was sent by this run; keep the original request."],
    ["custody-verification", 1, "Held: storage of the exact selected install plan could not be verified. No request was sent by this run; keep the original request."],
    ["transport-untrusted", 1, `Held: this injected transport has no configured-service acknowledgement trust. The plan is kept. ${sentinel}`],
    ["transport-no-answer", 1, `No answer: ${sentinel}`],
    ["creation-unavailable", 1, `Unavailable: ${sentinel}`],
    ["creation-refused", 1, "Refused: bad-field. The request was refused."],
    ["acknowledgement-mismatch", 1, "Held: the retained install acknowledgement does not match the original plan. The plan is kept."],
    ["acknowledgement-mismatch", 1, "Held: the install acknowledgement does not match the planned register's exact identity. The plan is kept."],
    ["acknowledgement-conflict", 1, "Held: the install acknowledgement conflicts with the retained accepted fact. The plan is kept."],
    ["cli-usage", 2, sentinel],
    ["unclassified-outcome", 1, sentinel],
  ];
  for (const [detail, code, line] of forms) {
    const failure = new CelldSmokeError("install", { code, lines: [line, sentinel] });
    failure.message = sentinel; failure.stack = sentinel;
    failure.cause = { private: sentinel }; failure.path = sentinel;
    const projected = { operation: celldSmokeOperation(failure), detail: celldSmokeDetail(failure) };
    assert.deepEqual(projected, { operation: "install", detail });
    assert.equal(JSON.stringify(projected).includes(sentinel), false);
    assert.equal(Object.hasOwn(failure, "lines"), false, "the diagnostic must not retain CLI output");
  }
  assert.equal(celldSmokeDetail(new CelldSmokeError("install", { code: 2, lines: [`No answer: ${sentinel}`] })), "cli-usage");
  assert.equal(celldSmokeDetail(new CelldSmokeError("install", { code: 1, lines: sentinel })), "unclassified-outcome");
  assert.equal(celldSmokeDetail(new CelldSmokeError("install", { code: 0, lines: [`No answer: ${sentinel}`] })), null);
  const unknown = new CelldSmokeError("install", { code: 1, lines: [sentinel] });
  unknown.detail = sentinel;
  for (const foreign of [unknown, new CelldSmokeError("install", sentinel), new CelldSmokeError("install"),
    new CelldSmokeError("plan", { code: 1, lines: ["Refused: bad-field. The request was refused."] }),
    new Error(sentinel), { stage: "install", detail: "creation-refused", message: sentinel }, null, undefined])
    assert.equal(celldSmokeDetail(foreign), null);
  const backend = proxyFailureObservation(); backend.arm();
  backend.note("proxyDecision", "forwarded"); backend.note("upstreamPhase", "request-ended");
  backend.fault("upstream-request", Object.assign(Error(sentinel), { code: "ECONNREFUSED" }));
  backend.fault("downstream-response", Error(sentinel));
  backend.note("clientStatus", "5xx");
  const failed = backend.snapshot("listening", "running", { kind: "reply-not-answer", status: "5xx" });
  assert.equal(failed.firstFailure, "upstream-request"); assert.equal(failed.errorClass, "connection-refused");
  assert.equal(failed.faultBoundary, "backend-endpoint");
  assert.equal(failed.owner, "celldbackend");
  const response = proxyFailureObservation(); response.arm();
  for (const [key, value] of Object.entries({ proxyDecision: "forwarded", upstreamEnd: "complete", downstreamEnd: "finished", clientBodyEnd: "complete", upstreamStatus: "5xx", clientStatus: "5xx" })) response.note(key, value);
  const completed = response.snapshot("listening", "running", { kind: "reply-not-answer", status: "5xx" });
  assert.equal(completed.faultBoundary, "backend-reply");
  assert.equal(completed.owner, "celldbackend");
  assert.notDeepEqual(completed, failed, "a relayed backend reply is not a proxy-generated 502");
  response.note("clientPhase", sentinel); response.note(sentinel, sentinel); response.fault(sentinel, Error(sentinel));
  assert.equal(JSON.stringify(response.snapshot(sentinel, sentinel, { kind: sentinel, status: sentinel })).includes(sentinel), false);
  const foreign = new CelldSmokeError("install", { code: 1, lines: [`No answer: ${sentinel}`] });
  foreign.transport = { kind: sentinel, status: "5xx" }; assert.equal(celldSmokeTransport(foreign), null);
  foreign.transport = { kind: "no-reply", status: sentinel }; assert.equal(celldSmokeTransport(foreign), null);
  const adapter = proxyFailureObservation(); adapter.arm(); adapter.fault("client-request", new TypeError(sentinel));
  assert.equal(adapter.snapshot("listening", "running", { kind: "no-reply", status: "none" }).owner, "clientadapter");
  const proxy = proxyFailureObservation(); proxy.arm(); proxy.note("proxyDecision", "request-budget"); proxy.fault("proxy-admission");
  assert.equal(proxy.snapshot("listening", "running", { kind: "reply-not-answer", status: "5xx" }).owner, "proxy");
  const output = { stdout: backendTail(), stderr: backendTail() };
  output.stdout.add(Buffer.from(`${sentinel}\n`));
  for (let i = 0; i < BACKEND_TAIL_LINES + 2; i++) output.stdout.add(Buffer.from(`line-${i}\n`));
  output.stdout.add(Buffer.from("x".repeat(BACKEND_TAIL_LINE_BYTES * 8)));
  output.stderr.add(Buffer.from(sentinel + "\u{1f642}".repeat(BACKEND_TAIL_LINE_BYTES))); output.stderr.end();
  const quoted = backendOutputFor("celldbackend", output);
  assert.equal(quoted.sentence, "backend, cause not observed");
  assert.equal(quoted.stdout.lines.length, BACKEND_TAIL_LINES);
  assert.equal(quoted.stdout.lines.at(-1).truncated, true);
  for (const line of [...quoted.stdout.lines, ...quoted.stderr.lines]) assert.ok(Buffer.byteLength(line.text) <= BACKEND_TAIL_LINE_BYTES);
  assert.equal(JSON.stringify(quoted.stdout).includes(sentinel), false, "older stdout lines leave the fixed tail");
  assert.equal(JSON.stringify(quoted.stderr).includes(sentinel), true, "backend-only output quotes text without interpreting it");
  assert.equal(backendOutputFor("proxy", output), null);
  for (const owner of ["clientadapter", "proxy", sentinel, null, undefined]) {
    assert.equal(backendOutputFor(owner, { get stdout() { throw Error(sentinel); }, get stderr() { throw Error(sentinel); } }), null);
  }
});

test("the actual planned CLI classifies five transport replies without leaking text or replacing attempted custody", async () => {
  const sentinel = "Private transport body error path and key sentinel";
  const replies = [
    { name: "throw", send: () => { throw Error(sentinel); }, detail: "transport-no-answer", transport: { kind: "no-reply", status: "none" } },
    { name: "empty-502", send: () => new Response(null, { status: 502 }), detail: "transport-no-answer", transport: { kind: "reply-not-answer", status: "5xx" } },
    { name: "invalid-200", send: () => new Response(sentinel, { status: 200 }), detail: "transport-no-answer", transport: { kind: "reply-not-answer", status: "2xx" } },
    { name: "oversized", send: () => new Response("x".repeat(4 * 1024 * 1024 + 1), { status: 200 }), detail: "transport-no-answer", transport: { kind: "reply-too-large", status: "2xx" } },
    { name: "refused", send: () => Response.json({ answer: "refused", reason: "bad-field" }, { status: 422 }), detail: "creation-refused", transport: null },
  ];
  for (const specimen of replies) {
    const home = await mkdtemp(join(tmpdir(), "dap-celld-transport-")), base = "https://localhost:9877";
    let calls = 0;
    const fetch = async () => { calls++; return specimen.send(); };
    try {
      await runCelldSmoke({ phase: "plan", base, home, fetch });
      const planned = JSON.parse(await readFile(join(home, "config.json"), "utf8"));
      assert.equal(calls, 0);
      await assert.rejects(() => runCelldSmoke({ phase: "run", base, home, fetch }), error => {
        assert.equal(celldSmokeOperation(error), "install", specimen.name);
        assert.equal(celldSmokeDetail(error), specimen.detail, specimen.name);
        const projected = celldSmokeTransport(error);
        assert.deepEqual(projected, specimen.transport, specimen.name);
        assert.equal(JSON.stringify({ detail: celldSmokeDetail(error), transport: projected }).includes(sentinel), false);
        assert.equal(Object.hasOwn(error, "lines"), false);
        return true;
      });
      assert.equal(calls, 1);
      const kept = JSON.parse(await readFile(join(home, "config.json"), "utf8"));
      assert.deepEqual(kept.plan.founding, planned.plan.founding);
      assert.equal(kept.plan.register, planned.plan.register);
      assert.match(kept.plan.attempted, /^sha256:[0-9a-f]{64}$/);
      assert.equal(kept.register, undefined);
    } finally { await rm(home, { recursive: true, force: true }); }
  }
});
