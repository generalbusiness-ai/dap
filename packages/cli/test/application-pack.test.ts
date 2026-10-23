import { packageReportDefinition } from "./definition-corpus-data.ts";
/** Real filesystem/package/key witnesses. These are not installs, scenarios or
 * rendered Counter/Lending screen checks. All keys below are public TEST data. */
import { mkdtemp, mkdir, readFile, readdir, realpath, rm, stat, symlink, truncate, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { b64url } from "@generalbusiness/artroom-bytes";
import { APPLICATION_PACKAGE_LIMITS as LIMITS, readApplicationPackage, secretSigner, type Signer } from "@generalbusiness/artroom-client";
import { ApplicationSourceError, packDirectory, prepareApplicationDirectory } from "../src/application-files.ts";
import { checkCommand, packCommand } from "../src/application-command.ts";
import { memoryStore } from "../src/store.ts";
import { fileStore } from "../src/files.ts";
import { readApplicationPackage2 } from "@generalbusiness/artroom-bytes/application-v2";
import { runApplicationScenario } from "../src/application-scenarios.ts";
import { emptyPackageComposition } from "@generalbusiness/artroom-package-graph";

const secret = new Uint8Array(32).fill(23), signer = secretSigner(secret);
async function fixture(kind: "counter" | "lending" = "lending") {
  const root = await realpath(await mkdtemp(join(tmpdir(), "dap-pack-")));
  const original = new URL(kind === "counter" ? "../../../apps/counter/definition.json" : "../../../examples/lending/definition.json", import.meta.url);
  const definition = JSON.parse(await readFile(original, "utf8"));
  const grant = kind === "counter" ? "counting.spoken" : "lending.member";
  const config = { v: 1, name: `ai.generalbusiness.${kind}`, version: "0.1.0", entry: "definition.json", definitions: ["definition.json"],
    host: { execution: "recorded-do", profiles: ["restricted@1"] }, capabilities: [], projections: {}, roles: { member: [grant] }, predecessor: null,
    presentation: { entry: "index.html", assets: [{ path: "index.html", file: "screen/index.html", mediaType: "text/html; charset=utf-8" }], descriptions: {} },
  };
  await mkdir(join(root, "screen"));
  await writeFile(join(root, "screen/index.html"), "<!doctype html><title>Package fixture</title>");
  const saveConfig = () => writeFile(join(root, "dap.application.json"), JSON.stringify(config, null, 2) + "\n");
  const saveDefinition = () => writeFile(join(root, "definition.json"), JSON.stringify(definition, null, 2) + "\n");
  await saveConfig(); await saveDefinition();
  return { root, config, definition, saveConfig, saveDefinition, output: join(root, "application.dap.json"), cleanup: () => rm(root, { recursive: true, force: true }) };
}
async function refused(work: () => Promise<unknown>): Promise<unknown> {
  return work().then(() => "accepted", error => error);
}

test("explicit v2 sources bind projections to captured definition paths and run native local replay", async () => {
  const f = await fixture("counter");
  try {
    const config = { ...f.config, ...emptyPackageComposition(), v: 2, roles: { ...f.config.roles, admin: ["counting.control", "counting.establish", "counting.join", "counting.leave"] }, projections: { board: { v: 1, definition: "definition.json", revision: "revision", sources: {
      board: { item: "board", read: "one", states: ["finished", "paused", "running"], limit: 1, fields: {
        lastNumber: { from: { kind: "value", name: "lastNumber" }, of: { type: "int", min: 0, max: 100 }, nullable: false },
      } },
    } } }, presentation: { ...f.config.presentation, resources: {}, views: { board: {
      kind: "card", projection: "board", item: "board", revision: "revision", title: "state", summary: null, actor: null, facts: ["lastNumber"],
      acts: [], context: "Board {id} v{revision}", fallback: "Board {id}: {state}", waiting: {}, refresh: 3000, display: "inline", back: null,
    } } } };
    const save = () => writeFile(join(f.root, "dap.application.json"), JSON.stringify(config));
    Reflect.deleteProperty(config, "connections"); await save();
    let signatures = 0;
    expect(await refused(() => prepareApplicationDirectory(f.root, { key: signer.key, sign: bytes => { signatures++; return signer.sign(bytes); } }))).toBeInstanceOf(ApplicationSourceError);
    expect(signatures).toBe(0);
    config.connections = [];
    await save();
    const packed = await packDirectory(f.root, f.output, signer);
    expect(packed.package.v).toBe(2);
    const owned = readApplicationPackage2(new Uint8Array(await readFile(f.output)), packed.ids.release);
    expect(owned).toEqual(packed);
    expect(owned.package.semantic.projections["board"]!.definition).toBe(owned.package.semantic.entry);
    expect(() => readApplicationPackage(owned.bytes, owned.ids.release)).toThrow();
    expect((await prepareApplicationDirectory(f.root, signer)).packet.bytes).toEqual(packed.bytes);
    const scenario = { v: 1, name: "declared-counter", time: "2026-10-18T12:00:00Z", actors: {
      controller: { seed: "01".repeat(32), member: "@controller", actions: ["counting.control"] },
    }, founding: { actor: "controller", fields: { opener: { $member: "controller" }, target: 7 } }, steps: [
      { act: { actor: "controller", kind: "initialize", expected: { configuration: { $revision: 0 } } }, expect: { answer: "accepted" } },
      { projection: { name: "board", at: { seq: 1 }, sources: { board: [{ id: 1, state: "paused", revision: 1, fields: { lastNumber: 0 } }] } } },
    ] };
    const result = await runApplicationScenario(owned, scenario);
    expect(result.projectionChecks).toBe(1);
    expect(result.replay.report).toMatchObject({ result: "consistent", target: { seq: 1 } });
    await writeFile(join(f.root, "scenario.json"), JSON.stringify(scenario));
    await writeFile(join(f.root, "dap.application.json"), JSON.stringify({ ...config, scenarios: ["scenario.json"] }));
    expect(await checkCommand(["check", f.root])).toMatchObject({ code: 0, lines: expect.arrayContaining(["Declared projection checks: 1 passed at native journal heads."]) });
    scenario.steps[1]!.projection!.sources.board[0]!.fields.lastNumber = 1;
    expect(await refused(() => runApplicationScenario(owned, scenario))).toMatchObject({ message: expect.stringContaining("unexpected field lastNumber") });
    scenario.steps[1]!.projection!.sources.board[0]!.fields.lastNumber = 0;
    scenario.steps[1]!.projection!.sources.board = [];
    expect(await refused(() => runApplicationScenario(owned, scenario))).toMatchObject({ message: expect.stringContaining("unexpected complete row count") });
    config.projections.board.definition = "uncaptured.json"; await save();
    expect(await refused(() => prepareApplicationDirectory(f.root, signer))).toBeInstanceOf(Error);
    config.v = 1; config.projections.board.definition = "definition.json"; await save();
    expect(await refused(() => prepareApplicationDirectory(f.root, signer))).toBeInstanceOf(ApplicationSourceError);
  } finally { await f.cleanup(); }
});

test("a trusted author's browser entry builds through pack without generated checkout files", async () => {
  const f = await fixture();
  try {
    const html = '<!doctype html><head><title>Local browser source</title></head><body><script type="module" src="./main.ts"></script></body>';
    await writeFile(join(f.root, "screen/index.html"), html);
    await writeFile(join(f.root, "screen/main.ts"), 'import { browserPrivateSlots } from "@generalbusiness/artroom-client"; import "./main.css"; document.body.textContent = String(typeof browserPrivateSlots);');
    await writeFile(join(f.root, "screen/main.css"), "body { color: red; }");
    const config = { ...f.config, presentation: { ...f.config.presentation, entry: "view/index.html", assets: [], browser: { entry: "screen/main.ts", html: "screen/index.html", script: "application.js" } } };
    const save = () => writeFile(join(f.root, "dap.application.json"), JSON.stringify(config));
    await save();
    const before = await readdir(f.root);
    const first = (await prepareApplicationDirectory(f.root, signer)).packet;
    expect(await readdir(f.root)).toEqual(before);
    expect(await readFile(join(f.root, "screen/index.html"), "utf8")).toBe(html);
    const assets = Object.fromEntries(first.package.presentation.assets.map(asset => [asset.path, Buffer.from(asset.bytes, "base64url").toString("utf8")]));
    expect(Object.keys(assets).sort()).toEqual(["view/application.css", "view/application.js", "view/index.html"]);
    expect(assets["view/index.html"]).toContain('<script type="module" src="./application.js"></script>');
    expect(assets["view/index.html"]).toContain('<link rel="stylesheet" href="./application.css">');
    expect(assets["view/application.js"]).not.toContain("@generalbusiness/artroom-client");
    expect((await prepareApplicationDirectory(f.root, signer)).packet.bytes).toEqual(first.bytes);
    await writeFile(join(f.root, "screen/main.css"), "body { color: blue; }");
    const changed = (await prepareApplicationDirectory(f.root, signer)).packet;
    expect(changed.ids.semantic).toBe(first.ids.semantic);
    expect(changed.ids.presentation).not.toBe(first.ids.presentation);
    expect(changed.ids.release).not.toBe(first.ids.release);
    config.presentation.browser.script = "../outside.js"; await save();
    expect(await refused(() => packDirectory(f.root, f.output, signer))).toBeInstanceOf(Error);
    expect(await readdir(f.root)).not.toContain("application.dap.json");
  } finally { await f.cleanup(); }
});

test("real Counter and Lending native declarations pack reproducibly into exact signed bytes", async () => {
  for (const kind of ["counter", "lending"] as const) {
    const f = await fixture(kind);
    try {
      const packed = await packDirectory(f.root, f.output, signer);
      const bytes = new Uint8Array(await readFile(f.output));
      expect(readApplicationPackage(bytes, packed.ids.release)).toEqual(packed);
      expect(packed.package.semantic.definitions).toHaveLength(1);
      expect(packed.package.semantic.definitions[0]!.bytes).not.toContain("\n");
      expect((await stat(f.output)).mode & 0o777).toBe(0o600);
      const repeated = await packDirectory(f.root, join(f.root, "repeat.dap.json"), signer);
      expect(repeated.bytes).toEqual(packed.bytes);
      await writeFile(join(f.root, "dap.application.json"), JSON.stringify({ ...f.config, scenarios: ["developer-only.json"] }));
      expect((await prepareApplicationDirectory(f.root, signer)).packet.ids).toEqual(packed.ids);
      const exists = await refused(() => packDirectory(f.root, f.output, signer));
      expect((exists as NodeJS.ErrnoException).code).toBe("EEXIST");
      expect(new Uint8Array(await readFile(f.output))).toEqual(bytes);
      expect((await readdir(f.root)).some(name => name.startsWith(".dap-pack-"))).toBe(false);
      const alias = join(f.root, "existing-link.dap.json");
      await symlink("screen/index.html", alias);
      expect(((await refused(() => packDirectory(f.root, alias, signer))) as NodeJS.ErrnoException).code).toBe("EEXIST");
      expect(await readFile(join(f.root, "screen/index.html"), "utf8")).toBe("<!doctype html><title>Package fixture</title>");
    } finally { await f.cleanup(); }
  }
});

// Invariant: selecting a config changes only source selection; all paths stay
// relative to the chosen root and cannot follow a config symlink.
test("explicit config selection keeps root confinement and the same package identity", async () => {
  const f = await fixture();
  try {
    const first = (await prepareApplicationDirectory(f.root, signer)).packet;
    await mkdir(join(f.root, "configs"));
    await writeFile(join(f.root, "configs/lending.json"), JSON.stringify(f.config));
    await writeFile(join(f.root, "dap.application.json"), "invalid default config");
    expect((await prepareApplicationDirectory(f.root, signer, { config: "configs/lending.json" })).packet.bytes).toEqual(first.bytes);
    const store = memoryStore(); await store.keep("operator", secret);
    expect((await packCommand(store, ["pack", "--config", "configs/lending.json"], f.root)).code).toBe(0);
    await writeFile(join(f.root, "standard.json"), JSON.stringify(standardScenario()));
    await writeFile(join(f.root, "configs/lending.json"), JSON.stringify({ ...f.config, scenarios: ["standard.json"] }));
    expect((await checkCommand(["check", "--config", "configs/lending.json"], f.root)).code).toBe(0);
    await symlink("configs/lending.json", join(f.root, "config-link.json"));
    for (const config of ["../outside.json", "/absolute.json", "configs/../lending.json", "config-link.json"]) {
      expect(await refused(() => prepareApplicationDirectory(f.root, signer, { config }))).toBeInstanceOf(ApplicationSourceError);
    }
    for (const argv of [["check", "--config"], ["check", "--config", "one", "--config", "two"]]) expect((await checkCommand(argv, f.root)).code).toBe(2);
  } finally { await f.cleanup(); }
});

test("native form and restricted rule admission precede every publisher signature", async () => {
  const f = await fixture(); let calls = 0;
  const counted: Signer = { key: signer.key, sign: bytes => { calls++; return signer.sign(bytes); } };
  try {
    f.definition.rules["forbidden"] = "$eval('1')";
    await f.saveDefinition();
    const error = await refused(() => packDirectory(f.root, f.output, counted));
    expect(error).toBeInstanceOf(ApplicationSourceError);
    expect(calls).toBe(0);
    expect(await readdir(f.root)).not.toContain("application.dap.json");
    delete f.definition.rules["forbidden"];
    f.definition.genesis = "absent"; await f.saveDefinition();
    expect(await refused(() => packDirectory(f.root, f.output, counted))).toBeInstanceOf(ApplicationSourceError);
    expect(calls).toBe(0);
  } finally { await f.cleanup(); }
});

test("bounded regular source files refuse symlinks, escaping paths and oversized bytes", async () => {
  const f = await fixture();
  try {
    await symlink("screen/index.html", join(f.root, "alias.html"));
    f.config.presentation.assets[0]!.file = "alias.html"; await f.saveConfig();
    expect(await refused(() => packDirectory(f.root, f.output, signer))).not.toBe("accepted");
    await symlink("screen", join(f.root, "alias-dir"));
    f.config.presentation.assets[0]!.file = "alias-dir/index.html"; await f.saveConfig();
    expect(await refused(() => packDirectory(f.root, f.output, signer))).toBeInstanceOf(ApplicationSourceError);
    f.config.presentation.assets[0]!.file = "../outside.html"; await f.saveConfig();
    expect(await refused(() => packDirectory(f.root, f.output, signer))).toBeInstanceOf(ApplicationSourceError);
    f.config.presentation.assets[0]!.file = "screen/index.html"; await f.saveConfig();
    await truncate(join(f.root, "screen/index.html"), LIMITS.assetBytes + 1);
    expect(await refused(() => packDirectory(f.root, f.output, signer))).toBeInstanceOf(ApplicationSourceError);
    await writeFile(join(f.root, "dap.application.json"), new Uint8Array(LIMITS.metadataBytes + 1).fill(255));
    const oversized = await refused(() => packDirectory(f.root, f.output, signer));
    expect(oversized).toBeInstanceOf(ApplicationSourceError);
    expect((oversized as Error).message).toContain("allowance");
    expect(await readdir(f.root)).not.toContain("application.dap.json");
  } finally { await f.cleanup(); }
});

test("pack requires an existing named key and preserves its custody while refusing extra grants", async () => {
  const f = await fixture(), store = memoryStore();
  try {
    expect((await packCommand(store, ["pack"], f.root)).code).toBe(1);
    expect(await store.secret("operator")).toBeNull();
    await store.keep("publisher", secret);
    expect((await packCommand(store, ["pack", "--publisher", "publisher"], f.root)).code).toBe(0);
    expect(await store.secret("publisher")).toEqual(secret);
    expect((await packCommand(store, ["pack", "--publisher", "publisher"], f.root)).lines).toEqual(["Output already exists; choose a new --out file."]);
    for (const argv of [["pack", "--publisher", "../key"], ["pack", "a", "b"], ["pack", "--out"], ["pack", "--out", "--publisher", "publisher"], ["pack", "--out", "one", "--out", "two"], ["pack", "--all"]]) expect((await packCommand(store, argv, f.root)).code).toBe(2);
    f.config.roles.member = ["rules.activate"]; await f.saveConfig();
    const refusal = await packCommand(store, ["pack", "--publisher", "publisher", "--out", "bad.dap.json"], f.root);
    expect(refusal).toEqual({ code: 1, lines: ["application-package-integrity"] });
    expect(refusal.lines.join("\n")).not.toContain(b64url(secret));
    expect(await store.secret("publisher")).toEqual(secret);
  } finally { await f.cleanup(); }
});

test("the actual dap bin packs from an external working directory without room config or network", async () => {
  const f = await fixture();
  try {
    const home = join(f.root, "custody"); await fileStore(home).keep("release", secret);
    const bin = fileURLToPath(new URL("../bin/dap.js", import.meta.url));
    const result = spawnSync(process.execPath, [bin, "pack", "--publisher", "release"], { cwd: f.root, env: { ...process.env, DAP_HOME: home, ARTROOM_HOME: home }, encoding: "utf8", timeout: 30_000 });
    expect(result.error).toBeUndefined(); expect(result.status).toBe(0);
    const packed = readApplicationPackage(new Uint8Array(await readFile(f.output)), null);
    expect(result.stdout.trim().split("\n")).toEqual([`Package: ${f.output}`, `Semantic: ${packed.ids.semantic}`, `Presentation: ${packed.ids.presentation}`, `Release: ${packed.ids.release}`, `Publisher: ${signer.key}`]);
    expect(result.stdout + result.stderr).not.toContain(b64url(secret));
    expect(await fileStore(home).config()).toBeNull();
  } finally { await f.cleanup(); }
});

function standardScenario(): any {
  return { v: 1, name: "lending-standard", time: "2026-10-18T12:00:00Z", actors: {
    writer: { seed: "23".repeat(32), member: "@writer", actions: ["lending.member"] },
  }, founding: { actor: "writer", fields: { opener: { $member: "writer" }, destination: { $reference: "destination" } } }, steps: [
    { act: { actor: "writer", kind: "donate", expected: { library: { $revision: 0 } }, fields: { name: "Pot", description: "Copper", page: "shelf/0123456789abcdef.md", content: "A signed page" } }, expect: { answer: "accepted" }, save: "donation" },
    { retry: "donation", expect: { answer: "accepted" } },
    { assert: { item: 1, state: "available", values: { name: "Pot" } } },
    { act: { actor: "writer", kind: "cancel", on: 1, expected: { on: { $revision: 1 }, library: { $revision: 0 } }, fields: { reason: "Lost", content: "A signed page" } }, expect: { answer: "refused", reason: "unauthorized" } },
    { "owner-record": { owner: "simulator", command: { $fact: "donation" }, outcome: "unknown" } },
  ] };
}

test("the actual dap check requires scenarios and native replay without reading CLI key custody", async () => {
  const f = await fixture();
  try {
    expect(await checkCommand(["check"], f.root)).toMatchObject({ code: 1, lines: [expect.stringContaining("No local scenarios")] });
    const config = { ...f.config, scenarios: ["standard.json"] };
    await writeFile(join(f.root, "dap.application.json"), JSON.stringify(config));
    await writeFile(join(f.root, "standard.json"), JSON.stringify(standardScenario()));
    const bin = fileURLToPath(new URL("../bin/dap.js", import.meta.url));
    // These custody values would fail configDir; local check must not consult it.
    const result = spawnSync(process.execPath, [bin, "check"], { cwd: f.root, env: { ...process.env, DAP_HOME: "", ARTROOM_HOME: "" }, encoding: "utf8", timeout: 30_000 });
    expect(result.error).toBeUndefined(); expect(result.status).toBe(0);
    expect(result.stdout).toContain("Scenario lending-standard: 5 steps passed; native replay consistent through 1.");
    expect(result.stdout).toContain("Non-native scenario-owner records: 1; outside the journal and native replay claim.");
    expect(result.stdout).toContain("explicit scripted TEST grants");
    expect(result.stdout).toContain("Declared capability requirements: none.");
    expect(result.stdout).not.toContain("Release:"); expect(await readdir(f.root)).not.toContain("application.dap.json");
    await writeFile(join(f.root, "dap.application.json"), JSON.stringify({ ...config, capabilities: [{ name: "git-read@1", bounds: { paths: ["shelf/"] } }] }));
    const audited = await checkCommand(["check"], f.root);
    expect(audited.code).toBe(0); expect(audited.lines).toContain('Requested git-read@1 bounds: {"paths":["shelf/"]}');
    for (const argv of [["check", "a", "b"], ["check", "--unknown"]]) expect((await checkCommand(argv, f.root)).code).toBe(2);
  } finally { await f.cleanup(); }
});

test("dap check fails on a wrong expected result, a missing scenario or an invalid scenario list", async () => {
  const f = await fixture();
  try {
    const config = { ...f.config, scenarios: ["standard.json"] };
    await writeFile(join(f.root, "dap.application.json"), JSON.stringify(config));
    expect(await checkCommand(["check"], f.root)).toMatchObject({ code: 1, lines: [expect.stringContaining("missing")] });
    const input = standardScenario(); input.steps[0].expect = { answer: "refused", reason: "unauthorized" };
    await writeFile(join(f.root, "standard.json"), JSON.stringify(input));
    expect(await checkCommand(["check"], f.root)).toMatchObject({ code: 1, lines: [expect.stringContaining("step 1: Expected refused")] });
    await writeFile(join(f.root, "dap.application.json"), JSON.stringify({ ...config, scenarios: null }));
    expect(await checkCommand(["check"], f.root)).toMatchObject({ code: 1, lines: ["List at most 32 local scenario files."] });
  } finally { await f.cleanup(); }
});

// One actual local source/key flow: a proved bound is reported honestly, and
// a later bad declaration yields stable one-line diagnostics from both tools.
test("v2 CLI reports proved item keys and escapes the same refusal rows through check and pack", async () => {
  const f = await fixture("counter"), store = memoryStore();
  try {
    const definition = packageReportDefinition();
    const config = { ...f.config, ...emptyPackageComposition(), v: 2, roles: { author: ["app.configure", "app.comment"] }, scenarios: ["scenario.json"],
      projections: { note: { v: 1, definition: "definition.json", revision: "revision", sources: {
        note: { item: "note", read: "one", states: ["open"], limit: 1, fields: { label: { from: { kind: "value", name: "label" }, of: { type: "text", max: 80 }, nullable: false } } },
      } } }, presentation: { ...f.config.presentation, resources: {}, views: {} } };
    const scenario = { v: 1, name: "one-note", time: "2026-10-18T12:00:00Z", actors: {
      author: { seed: "01".repeat(32), member: "@author", actions: ["app.configure", "app.comment"] },
    }, founding: { actor: "author", fields: { label: "One note" } }, steps: [
      { act: { actor: "author", kind: "note", on: 0, expected: {}, fields: { text: "Recorded." } }, expect: { answer: "accepted" } },
    ] };
    await writeFile(join(f.root, "dap.application.json"), JSON.stringify(config));
    await writeFile(join(f.root, "scenario.json"), JSON.stringify(scenario));
    await writeFile(join(f.root, "definition.json"), JSON.stringify(definition));
    const good = await checkCommand(["check", f.root]);
    expect(good.code, good.lines.join("\n")).toBe(0);
    expect(good.lines).toContain("Live items across this install: at most 1. Lifetime entries: unproved; lifetime item keys: at most 1.");
    const badName = 'note|\nquoted"\\name';
    definition.acts[badName] = { ...(definition.acts["note"] as Record<string, unknown>), grant: "app.ungranted" };
    await writeFile(join(f.root, "definition.json"), JSON.stringify(definition));
    await store.keep("publisher", secret);
    const checked = await checkCommand(["check", f.root]), packed = await packCommand(store, ["pack", "--publisher", "publisher"], f.root);
    expect(packed).toEqual(checked);
    expect(checked.code).toBe(1);
    expect(checked.lines[0]).toBe("Package validation refused.");
    expect(checked.lines[1]).toBe("Definition | Row | Check | Severity | Reason | Message");
    expect(checked.lines[2]).toContain(String.raw`acts.note\|\nquoted\"\\name`);
    expect(checked.lines[2]).toContain(" | ungranted-act | ");
    expect(checked.lines.every(line => !line.includes("\n"))).toBe(true);
    expect(checked.lines.join("\n")).not.toContain(b64url(secret));
    expect(await store.secret("publisher")).toEqual(secret);
    expect(await readdir(f.root)).not.toContain("application.dap.json");
  } finally { await f.cleanup(); }
});
