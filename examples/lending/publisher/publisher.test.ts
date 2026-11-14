/** Real in-memory judges, actual Node children and local bare Git. Membership rows
 * and IPC read authority are scripted; no enrollment, provider or network runs. */
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, expect, test } from "vitest";
import type { Answer, DeclaredDefinition, FieldValue } from "@generalbusiness/dap-contract";
import { isRecord, utf8 } from "@generalbusiness/dap-bytes";
import { Custody, DeclaredHandle, ScopeHandle, secretSigner } from "@generalbusiness/dap-client";
import { fileStore } from "@generalbusiness/dap-client/node";
import { fixtureSequence, keys, type Actor } from "@generalbusiness/dap-derive/testing";
import { GitProgram, SNAPSHOT_BOUNDS, idOf, parseCommit, snapshotCommit } from "@generalbusiness/dap-git";
import { nodeExec } from "@generalbusiness/dap-git/node";
import { checkClone, type ExportedJournal } from "./check.ts";
import { lendingPublisher } from "./definition.ts";
import { buildPublication, publicationTrailer, type BuiltPublication } from "./fold.ts";
import { LocalGit } from "./git.ts";
import { SCOPE_METHODS, type ChildMessage, type ParentMessage, type ProcessConfig, type PublicationStage } from "./ipc.ts";
import { publish, type PublicationResult, type PublisherOptions } from "./publisher.ts";
import { readPublicationTrailer } from "./reader.ts";
import { makePublisher, PUBLISHER_READER, publisherTransport, replayPublisher, submitPublisher, type PublisherLedger } from "./support.ts";

const NOW = Date.parse("2030-01-01T00:00:00Z"), SERVICE = "https://publisher.test";
const REPOSITORY = { host: "local", namespace: "TEST", name: "shelf" };
const program = new GitProgram({ exec: nodeExec, transport: "local" });
const roots: string[] = [], children: Process[] = [];
afterEach(async () => {
  for (const child of children.splice(0)) await child.stop();
  for (const root of roots.splice(0)) await rm(root, { recursive: true });
});
const wrote = (answer: Answer) => expect(answer, JSON.stringify(answer)).toMatchObject({ answer: "accepted" });
const acts = (ledger: PublisherLedger, kind: string) => ledger.entries.filter(row => row.entry.input.type === "act" && row.entry.input.signed.intent.kind === kind);

async function act(ledger: PublisherLedger, actor: Actor, kind: string, fields: Record<string, FieldValue>, on = 0, also: Record<string, number> = {}) {
  const expected = { on: ledger.item(on).revision, ...Object.fromEntries(Object.entries(also).map(([name, id]) => [name, ledger.item(id).revision])) };
  // This dynamic fixture takes an act name and public JSON fields; the real
  // client still checks them against the supplied definition before signing.
  const typed = new DeclaredHandle<DeclaredDefinition>(new ScopeHandle(publisherTransport(ledger), ledger.at.scope, PUBLISHER_READER), ledger.at, lendingPublisher, ledger.definition.digest);
  const made = await typed.intent(secretSigner(actor.secret), kind, { on, expected, fields }, { now: NOW });
  return submitPublisher(ledger, made.signed, made.beside);
}

async function donate(ledger: PublisherLedger, name = "Pot", page = "shelf/pot.md", content = "Available pot\n") {
  const signed = ledger.intent(keys.rita, "donate", { expected: { library: ledger.item(0).revision }, fields: { name, description: "A copper pot.", page, content } });
  wrote(await submitPublisher(ledger, signed));
  return ledger.last.seq;
}

async function world(key = "publisher-found") {
  const root = await realpath(await mkdtemp(join(tmpdir(), "dap-publisher-"))); roots.push(root);
  const bare = join(root, "host.git");
  await program.ok("init", ["init", "--bare", "-q", bare]);
  await program.ok("config", ["-C", bare, "config", "core.logAllRefUpdates", "true"]);
  const ledger = makePublisher({ key }); ledger.now = new Date(NOW).toISOString();
  wrote(await act(ledger, keys.rita, "bind-repository", { repository: REPOSITORY }));
  wrote(await act(ledger, keys.rita, "appoint-publisher", { publisher: keys.una.member }));
  const git = await LocalGit.open(bare, join(root, "work"));
  return { root, bare, ledger, git };
}
type World = Awaited<ReturnType<typeof world>>;

function options(w: World, actor = keys.una, store = "custody", extra: Partial<PublisherOptions> = {}): PublisherOptions {
  return { scope: new ScopeHandle(publisherTransport(w.ledger), w.ledger.at.scope, PUBLISHER_READER),
    target: w.ledger.at, service: SERVICE, member: actor.member, signer: secretSigner(actor.secret), repository: REPOSITORY,
    git: w.git, custody: new Custody(fileStore(join(w.root, store), undefined, () => NOW), () => new Date(NOW).toISOString()), now: () => NOW, ...extra };
}
const exported = (ledger: PublisherLedger): ExportedJournal => ({ scope: ledger.at, entries: structuredClone(ledger.entries), complete: true, coverage: "whole", head: { ...ledger.head } });

type Stage = Extract<ChildMessage, { kind: "stage" }>;
interface Process {
  result: Promise<PublicationResult | null>;
  stage(name: PublicationStage): Promise<Stage>;
  resume(stage: Stage): void;
  stop(): Promise<void>;
  readonly signatures: number;
  readonly pid: number | undefined;
}

/** Scope calls cross IPC to the parent; no HTTP or second in-memory judge exists. */
function start(w: World, actor = keys.una, blocked: readonly PublicationStage[] = [], suffix = "child", loseReportReplies = 0): Process {
  const child: ChildProcess = spawn(process.execPath, ["--import", import.meta.resolve("tsx"), fileURLToPath(new URL("./process.ts", import.meta.url))], { detached: true, stdio: ["ignore", "pipe", "pipe", "ipc"] });
  // Tiny fixture pages make the real child follow journal continuations.
  const api = publisherTransport(w.ledger, { pageEntries: 2 }), queued: Stage[] = [], pending = new Map<PublicationStage, (stage: Stage) => void>();
  let signs = 0, output = "", finished: PublicationResult | null = null;
  let finish!: (result: PublicationResult | null) => void, closed!: () => void;
  const result = new Promise<PublicationResult | null>(resolveResult => { finish = resolveResult; });
  const exited = new Promise<void>(resolveExit => { closed = resolveExit; });
  const send = (message: ParentMessage) => { if (child.connected) child.send(message); };
  const config: ProcessConfig = { seed: Array.from(actor.secret), target: w.ledger.at, member: actor.member, service: SERVICE,
    repository: REPOSITORY, bare: w.bare, work: join(w.root, suffix + "-work"), custody: join(w.root, suffix + "-custody"), now: NOW };
  child.stderr?.on("data", bytes => { output = (output + bytes).slice(-4096); });
  child.on("message", (raw: unknown) => {
    if (!isRecord(raw) || typeof raw["kind"] !== "string") return;
    const message = raw as unknown as ChildMessage;
    if (message.kind === "ready") { send({ kind: "start", config }); return; }
    if (message.kind === "signed") { signs++; return; }
    if (message.kind === "result") { finished = message.result; return; }
    if (message.kind === "error") { output += " TEST child failed"; return; }
    if (message.kind === "stage") {
      if (!blocked.includes(message.name)) send({ kind: "resume", id: message.id });
      const waiting = pending.get(message.name);
      if (waiting) { pending.delete(message.name); waiting(message); } else queued.push(message);
      return;
    }
    if (message.kind === "call" && SCOPE_METHODS.includes(message.method)) {
      // A closed test protocol, not a public untyped transport. ScopeHandle checks the replies.
      void Promise.resolve().then(() => Reflect.apply(api[message.method], api, [...message.args])).then(value => {
        if (message.method === "submit" && loseReportReplies-- > 0) send({ kind: "reply", id: message.id, error: "fixed failure" });
        else send({ kind: "reply", id: message.id, value });
      }, () => { send({ kind: "reply", id: message.id, error: "fixed failure" }); });
    }
  });
  child.once("error", () => { output += " TEST spawn failed"; });
  child.once("close", () => { finish(finished); closed(); });
  const proc: Process = {
    result,
    stage: name => {
      const found = queued.findIndex(stage => stage.name === name);
      if (found >= 0) return Promise.resolve(queued.splice(found, 1)[0]!);
      return new Promise((resolveStage, reject) => {
        const timer = setTimeout(() => { pending.delete(name); reject(Error(`TEST child did not reach ${name}: ${output}`)); }, 20_000);
        pending.set(name, stage => { clearTimeout(timer); resolveStage(stage); });
        void exited.then(() => { if (pending.has(name)) { pending.delete(name); clearTimeout(timer); reject(Error(`TEST child closed before ${name}: ${output}`)); } });
      });
    },
    resume: stage => send({ kind: "resume", id: stage.id }),
    async stop() {
      if (child.exitCode === null && child.signalCode === null && child.pid !== undefined) {
        try { process.kill(-child.pid, "SIGKILL"); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error; }
      }
      await exited;
    },
    get signatures() { return signs; }, get pid() { return child.pid; },
  };
  children.push(proc); return proc;
}

async function writeObjects(directory: string, publication: BuiltPublication) {
  for (const object of publication.objects) expect((await program.ok("hash-object", ["-C", directory, "hash-object", "-w", "-t", object.type, "--stdin"], object.data)).trim()).toBe(object.id);
}

async function readerCommand(repository: string, work: string, journal: string) {
  const child = spawn(process.execPath, ["--import", import.meta.resolve("tsx"), fileURLToPath(new URL("./check.ts", import.meta.url)),
    "--repository", repository, "--work", work, "--journal", journal], { detached: true, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "", stderr = "";
  child.stdout.on("data", bytes => { stdout += bytes; }); child.stderr.on("data", bytes => { stderr += bytes; });
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolveResult, reject) => {
    const timer = setTimeout(() => {
      if (child.pid !== undefined) { try { process.kill(-child.pid, "SIGKILL"); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ESRCH") reject(error); } }
    }, 20_000);
    child.once("error", error => { clearTimeout(timer); reject(error); });
    child.once("close", code => { clearTimeout(timer); resolveResult({ code, stdout, stderr }); });
  });
}

async function outside(w: World, base: string, message = "TEST outside writer\n") {
  const data = utf8("TEST outside writer\n"), blob = idOf("blob", data);
  const snapshot = snapshotCommit([...(await w.git.files(base)), { path: "outside.txt", mode: "100644", id: blob }], "TEST outside writer\n");
  const bytes = utf8(`tree ${snapshot.tree}\nparent ${base}\nauthor TEST Writer <test@invalid> 1893456000 +0000\ncommitter TEST Writer <test@invalid> 1893456000 +0000\n\n${message}`);
  const commit = idOf("commit", bytes);
  const publication: BuiltPublication = { commit, tree: snapshot.tree, objects: [{ id: blob, type: "blob", data }, ...snapshot.objects.filter(object => object.type === "tree"), { id: commit, type: "commit", data: bytes }],
    through: w.ledger.fact(w.ledger.last.seq), base, message, skipped: [] };
  await writeObjects(w.bare, publication);
  await program.ok("update-ref", ["-C", w.bare, "update-ref", "refs/heads/main", commit, base]);
  return commit;
}

test("donate and borrow publish one folded shelf page and exact through trailer", async () => {
  const w = await world(), pot = await donate(w.ledger);
  wrote(await act(w.ledger, keys.una, "borrow", { content: "Lent pot\n" }, pot, { library: 0 }));
  const through = w.ledger.fact(w.ledger.last.seq), child = start(w);
  const answer = await child.result; expect(answer?.status).toBe("published");
  const head = await w.git.head(); expect(head).not.toBeNull();
  const clone = join(w.root, "clone"); await program.ok("clone", ["clone", "--no-hardlinks", "--branch", "main", "--", w.bare, clone]);
  expect(await readFile(join(clone, "shelf/pot.md"), "utf8")).toBe("Lent pot\n");
  expect(readPublicationTrailer(await w.git.commit(head!))).toMatchObject({ through, base: null });
  expect(acts(w.ledger, "published")).toHaveLength(1); expect(child.signatures).toBe(1);
}, 30_000);

test("restart after the ref update reports the same commit without another branch commit", async () => {
  const w = await world(); await donate(w.ledger);
  const first = start(w, keys.una, ["after-ref-update"], "restart");
  const sent = await first.stage("after-ref-update"), before = await w.git.head();
  expect(sent.publication?.commit).toBe(before); expect(first.signatures).toBe(0);
  await first.stop(); expect(await first.result).toBeNull();
  const second = start(w, keys.una, [], "restart");
  expect(second.pid).not.toBe(first.pid); expect((await second.result)?.status).toBe("published");
  expect(await w.git.head()).toBe(before);
  expect((await program.ok("rev-list", ["-C", w.bare, "rev-list", "--count", "refs/heads/main"])).trim()).toBe("1");

  expect((await program.ok("reflog", ["-C", w.bare, "reflog", "show", "--format=%H", "refs/heads/main"])).trim().split("\n")).toHaveLength(1);
  expect(acts(w.ledger, "published")).toHaveLength(1);
  expect((await readdir(join(w.root, "restart-custody", "records"))).filter(name => name.endsWith(".json"))).toHaveLength(1);

  // The report can also take effect before its answer is lost. A new process
  // settles the kept envelope even though the new cursor leaves no mapped work.
  const lost = await world("lost-report"); await donate(lost.ledger);
  const original = start(lost, keys.una, [], "lost-report", 1);
  expect((await original.result)?.status).toBe("retry"); expect(original.signatures).toBe(1);
  const recovered = start(lost, keys.una, [], "lost-report");
  expect((await recovered.result)?.status).toBe("published"); expect(recovered.signatures).toBe(0);
  expect(acts(lost.ledger, "published")).toHaveLength(1);
}, 30_000);

test("two publisher processes allow one ref update and one accepted report, while the same report returns its first receipt", async () => {
  const w = await world(); await donate(w.ledger);
  // Two scripted keys belong to the appointed member. This is no enrollment proof.
  w.ledger.authorities = w.ledger.authorities.map(row => row.key === keys.vic.key ? { ...row, member: keys.una.member } : row);
  const first = start(w, keys.una, ["before-compare", "before-report"], "race-a");
  const second = start(w, { ...keys.vic, member: keys.una.member }, ["before-compare", "before-report"], "race-b");
  const [a, b] = await Promise.all([first.stage("before-compare"), second.stage("before-compare")]);
  expect(a.publication?.commit).toBe(b.publication?.commit);
  first.resume(a); second.resume(b);
  const reports = await Promise.all([first.stage("before-report"), second.stage("before-report")]);
  first.resume(reports[0]); expect((await first.result)?.status).toBe("published");
  // A distinct request with the captured on revision meets revision-moved.
  // Witness 6 supplies a fresh revision to exercise the base guard itself.
  second.resume(reports[1]); expect((await second.result)?.status).toBe("retry");
  expect(acts(w.ledger, "published")).toHaveLength(1);
  expect((await program.ok("rev-list", ["-C", w.bare, "rev-list", "--count", "refs/heads/main"])).trim()).toBe("1");

  expect((await program.ok("reflog", ["-C", w.bare, "reflog", "show", "--format=%H", "refs/heads/main"])).trim().split("\n")).toHaveLength(1);
  const same = await world("same-report"); await donate(same.ledger);
  const one = start(same, keys.una, ["before-compare", "before-report"], "same-a"), two = start(same, keys.una, ["before-compare", "before-report"], "same-b");
  const [x, y] = await Promise.all([one.stage("before-compare"), two.stage("before-compare")]); one.resume(x); two.resume(y);
  const [r1, r2] = await Promise.all([one.stage("before-report"), two.stage("before-report")]);
  one.resume(r1); const accepted = await one.result; two.resume(r2); const duplicate = await two.result;
  expect(accepted).toMatchObject({ status: "published" }); expect(duplicate).toEqual(accepted);
  expect(acts(same.ledger, "published")).toHaveLength(1);
  expect((await program.ok("reflog", ["-C", same.bare, "reflog", "show", "--format=%H", "refs/heads/main"])).trim().split("\n")).toHaveLength(1);
}, 30_000);

test("an external branch writer stops signing until staff adopts its head", async () => {
  const w = await world(); await donate(w.ledger); expect((await publish(options(w))).status).toBe("published");
  const base = (await w.git.head())!, changed = await outside(w, base);
  await donate(w.ledger, "Bowl", "shelf/bowl.md");
  let signs = 0; const signer = secretSigner(keys.una.secret);
  const denied = await publish(options(w, keys.una, "outside-custody", { signer: { key: signer.key, sign: bytes => { signs++; return signer.sign(bytes); } } }));
  expect(denied).toEqual({ status: "stopped", reason: "branch-differs" }); expect(signs).toBe(0);
  wrote(await act(w.ledger, keys.rita, "adopt-head", { commit: changed }));
  expect((await publish(options(w, keys.una, "after-adopt"))).status).toBe("published");
  expect(parseCommit(await w.git.commit((await w.git.head())!)).parents).toEqual([changed]);
});

test("the reader honors an adopted foreign trailer after integrity checks and refuses it before adoption", async () => {
  const w = await world(); await donate(w.ledger);
  expect((await publish(options(w))).status).toBe("published");
  const base = (await w.git.head())!, foreign = makePublisher({ key: "foreign-adopted-baseline" });
  const message = "TEST staff-selected foreign baseline\n\n" + publicationTrailer(foreign.at, foreign.fact(0), base);
  const adopted = await outside(w, base, message);
  expect(readPublicationTrailer(await w.git.commit(adopted))).toMatchObject({ scope: foreign.at, base });
  expect(await checkClone(w.git, exported(w.ledger))).toMatchObject({ ok: false, reason: "mismatch" });
  await donate(w.ledger, "Bowl", "shelf/bowl.md");
  expect(await publish(options(w, keys.una, "unadopted-foreign"))).toEqual({ status: "stopped", reason: "branch-differs" });
  wrote(await act(w.ledger, keys.rita, "adopt-head", { commit: adopted }));
  expect((await publish(options(w, keys.una, "adopted-foreign"))).status).toBe("published");
  expect(parseCommit(await w.git.commit((await w.git.head())!)).parents).toEqual([adopted]);
  expect(await checkClone(w.git, exported(w.ledger))).toEqual({ ok: true, checked: 1 });
  // The real bare repository supplies the whole history. This single corrupt
  // read proves that adoption does not bypass the commit's integrity check.
  const corrupt = { head: () => w.git.head(), files: (base: string | null) => w.git.files(base),
    commit: async (id: string) => id === adopted ? utf8("TEST corrupt adopted object\n") : w.git.commit(id),
    compare: (base: string | null, publication: BuiltPublication) => w.git.compare(base, publication) };
  expect(await checkClone(corrupt, exported(w.ledger))).toMatchObject({ ok: false, reason: "mismatch" });
});

async function report(w: World, actor: Actor, fields: Record<string, FieldValue>) {
  return act(w.ledger, actor, "published", fields);
}
const reportFields = (w: World, through = w.ledger.fact(w.ledger.last.seq)) => ({ through, commit: "1".repeat(40), tree: "2".repeat(40) });

test("another agent with publish permission cannot report for the appointed member", async () => {
  const w = await world(); await donate(w.ledger);
  const before = structuredClone(w.ledger.item(0));
  expect(await report(w, keys.vic, reportFields(w))).toMatchObject({ answer: "refused", reason: "guard-failed" });
  expect(w.ledger.item(0)).toEqual(before);
});

test("a published report with an earlier base is refused without moving head or cursor", async () => {
  const w = await world(); await donate(w.ledger); expect((await publish(options(w))).status).toBe("published");
  await donate(w.ledger, "Bowl", "shelf/bowl.md"); const before = structuredClone(w.ledger.item(0));
  // Fresh expected revision isolates the stale-base guard from revision-moved.
  expect(await report(w, keys.una, { ...reportFields(w), base: "3".repeat(40) })).toMatchObject({ answer: "refused", reason: "guard-failed" });
  expect(w.ledger.item(0)).toEqual(before);
});

test("the publisher journal replays consistently without outside-operation input forms", async () => {
  const w = await world(), pot = await donate(w.ledger);
  wrote(await act(w.ledger, keys.una, "borrow", { content: "Lent pot\n" }, pot, { library: 0 }));
  expect((await publish(options(w))).status).toBe("published");
  const replayed = await replayPublisher(w.ledger);
  expect([replayed.report.result, replayed.why]).toEqual(["consistent", null]);
  expect(replayed.report.trusts.join(" ")).toContain("authority");
  expect(w.ledger.entries.every(({ entry }) => !["outcome", "preparation", "delivery"].includes(entry.input.type))).toBe(true);
  expect(w.ledger.entries.every(({ entry }) => entry.sends.length === 0)).toBe(true);
});

test("the reader reproduces publisher commits and rejects one changed file", async () => {
  const w = await world(); await donate(w.ledger); expect((await publish(options(w))).status).toBe("published");
  const clone = join(w.root, "reader.git"), journal = join(w.root, "journal.json");
  await program.ok("clone", ["clone", "--bare", "--no-hardlinks", "--branch", "main", "--", w.bare, clone]);
  await writeFile(journal, JSON.stringify(exported(w.ledger)));
  const checked = await readerCommand(clone, join(w.root, "reader-work"), journal);
  expect(checked.code, checked.stderr).toBe(0);
  expect(JSON.parse(checked.stdout)).toMatchObject({ ok: true, checked: 1 });
  const head = (await w.git.head())!, old = await w.git.commit(head), parsed = parseCommit(old);
  const changed = utf8("False pot page\n"), blob = idOf("blob", changed);
  const tree = snapshotCommit([{ path: "shelf/pot.md", mode: "100644", id: blob }], "TEST tree\n");
  const bytes = utf8(new TextDecoder().decode(old).replace(`tree ${parsed.tree}\n`, `tree ${tree.tree}\n`)), commit = idOf("commit", bytes);
  await writeObjects(clone, { commit, tree: tree.tree, through: w.ledger.fact(acts(w.ledger, "donate").at(-1)!.entry.seq), base: null,
    message: "TEST tampered content", skipped: [], objects: [{ id: blob, type: "blob", data: changed }, ...tree.objects.filter(object => object.type === "tree"), { id: commit, type: "commit", data: bytes }] });
  await program.ok("update-ref", ["-C", clone, "update-ref", "refs/heads/main", commit, head]);
  const mismatch = await readerCommand(clone, join(w.root, "reader-work"), journal);
  expect(mismatch.code, mismatch.stderr).toBe(1);
  expect(JSON.parse(mismatch.stdout)).toMatchObject({ ok: false, reason: "mismatch" });
}, 30_000);

test("a same-definition foreign through fact cannot move this cursor", async () => {
  const w = await world(), foreign = makePublisher({ key: "foreign-publisher" }); foreign.now = new Date(NOW).toISOString();
  await donate(w.ledger); await donate(foreign);
  const through = foreign.fact(foreign.last.seq), entry = foreign.entries[through.seq]!.entry;
  w.ledger.facts = [{ fact: through, entry, sequence: fixtureSequence(foreign), under: lendingPublisher.name }];
  const before = structuredClone(w.ledger.item(0));
  const signed = w.ledger.intent(keys.una, "published", { on: 0, expected: { on: before.revision }, fields: reportFields(w, through) });
  expect(w.ledger.judge(signed, { facts: w.ledger.facts })).toMatchObject({ result: "refused", reason: "guard-failed", detail: "guards.2" });
  expect(await submitPublisher(w.ledger, signed)).toMatchObject({ answer: "refused", reason: "guard-failed" });
  expect(w.ledger.item(0)).toEqual(before);
});

test("refused, filtered and incomplete reads stop before a report signature or Git push", async () => {
  const w = await world(); await donate(w.ledger);
  const transport = publisherTransport(w.ledger), signer = secretSigner(keys.una.secret); let signs = 0, pushes = 0;
  for (const mode of ["refused", "filtered", "incomplete"] as const) {
    const reader = mode === "filtered" ? "Signed TEST key" : PUBLISHER_READER;
    const wrapped = { ...transport,
      summary: (scope: string, _reader: unknown, minimum?: Parameters<typeof transport.summary>[2]) => transport.summary(scope, PUBLISHER_READER, minimum),
      entry: (scope: string, _reader: unknown, seq: number, minimum?: Parameters<typeof transport.entry>[3]) => transport.entry(scope, PUBLISHER_READER, seq, minimum),
      log: async (scope: string, _reader: unknown, cursor?: string) => {
      if (mode === "refused") return { ok: false, reason: "unavailable" } as const;
      const result = await transport.log(scope, PUBLISHER_READER, cursor);
      if (result.ok && mode === "incomplete") { const { next: _next, ...rest } = result; return { ...rest, complete: false }; }
      return result;
    } };
    const result = await publish(options(w, keys.una, mode, { scope: new ScopeHandle(wrapped, w.ledger.at.scope, reader),
      signer: { key: signer.key, sign: bytes => { signs++; return signer.sign(bytes); } },
      git: { head: () => w.git.head(), files: base => w.git.files(base), commit: id => w.git.commit(id), compare: async (base, publication) => { pushes++; await w.git.compare(base, publication); } } }));
    expect(result.status).toBe("stopped");
  }
  expect([signs, pushes, await w.git.head()]).toEqual([0, 0, null]);
});

test("an unwritable shelf path is named and skipped while a later valid page still publishes", async () => {
  const w = await world();
  await donate(w.ledger, "Unwritable pot", "shelf/.git/pot.md", "Must not become a Git path\n");
  const skipped = w.ledger.last.seq;
  await donate(w.ledger, "Pot", "shelf/pot.md", "Valid pot\n");
  expect((await publish(options(w))).status).toBe("published");
  const head = (await w.git.head())!, bytes = new TextDecoder().decode(await w.git.commit(head));
  expect(bytes).toContain(`Skipped entry ${skipped} ${w.ledger.fact(skipped).hash}: bad-path\n`);
  const paths = await w.git.files(head);
  expect(paths.map(file => file.path)).toEqual(["shelf/pot.md"]);
});

// The base aliases one leaf tree at many directory paths. It needs no large
// disk fixture or Native item count; the read limit counts path occurrences.
test("the fold skips a write beyond the directory bound and accepts the adjacent tree count", async () => {
  const ledger = makePublisher({ key: "directory-bound" }); ledger.now = new Date(NOW).toISOString();
  await donate(ledger);
  const through = ledger.fact(ledger.last.seq), blob = idOf("blob", utf8("TEST shared baseline blob\n"));
  const files = Array.from({ length: SNAPSHOT_BOUNDS.trees - 1 }, (_, index) => ({
    path: `dir-${index}/same.md`, mode: "100644" as const, id: blob,
  }));
  expect(files.length + 1).toBe(SNAPSHOT_BOUNDS.trees);
  expect(files.length + 1).toBeLessThanOrEqual(SNAPSHOT_BOUNDS.files);
  const base = snapshotCommit(files, "TEST aliased baseline\n");
  expect(base.objects.filter(object => object.type === "tree")).toHaveLength(2);
  const input = { scope: ledger.at, files, entries: ledger.entries, openings: [], through, base: base.commit };
  const skipped = buildPublication(input);
  expect(skipped.skipped).toEqual([{ fact: through, reason: "tree-limit" }]);
  expect(skipped.tree).toBe(base.tree);
  expect(skipped.message).toContain(`Skipped entry ${through.seq} ${through.hash}: tree-limit\n`);
  const nearFiles = files.slice(1), nearBase = snapshotCommit(nearFiles, "TEST one directory below the bound\n");
  const accepted = buildPublication({ ...input, files: nearFiles, base: nearBase.commit });
  expect(accepted.skipped).toEqual([]);
  expect(accepted.tree).not.toBe(nearBase.tree);
  expect(accepted.objects.some(object => object.type === "blob" && object.id === idOf("blob", utf8("Available pot\n")))).toBe(true);
});
