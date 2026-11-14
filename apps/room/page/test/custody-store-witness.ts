/** Real IndexedDB and Web Locks witnesses. The transport answers in this file are scripted, not native scope proof.
 * custody-witness.mjs runs the separate native join proof before these cases. No fixture key or envelope enters its report. */
import { canonicalize, intentDigest, timeOf } from "@generalbusiness/dap-bytes";
import type { Receipt } from "@generalbusiness/dap-contract";
import { Custody, CustodyError, Lost, browserCustodyStore, identityId, meaningOf, signedIntent,
  type BrowserCustodyPlatform, type CustodyRecord, type HeldBack, type Identity, type Signer, type StoredOutcome } from "@generalbusiness/dap-client";

type BrowserStore = ReturnType<typeof browserCustodyStore>;
type CaseResult = { name: string; passed: boolean; detail?: unknown };
const equal = (left: unknown, right: unknown): boolean => canonicalize(left as never) === canonicalize(right as never);
const request = <T>(value: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => {
  value.onsuccess = () => resolve(value.result);
  value.onerror = () => reject(value.error ?? new Error("TEST IndexedDB request failed"));
});
const complete = (transaction: IDBTransaction): Promise<void> => new Promise((resolve, reject) => {
  transaction.oncomplete = () => resolve();
  transaction.onabort = transaction.onerror = () => reject(transaction.error ?? new Error("TEST transaction aborted"));
});
async function database(name: string, version?: number, upgrade?: (db: IDBDatabase) => void): Promise<IDBDatabase> {
  const opened = indexedDB.open(name, version);
  if (upgrade) opened.onupgradeneeded = () => upgrade(opened.result);
  return request(opened);
}
async function snapshot(name: string): Promise<unknown> {
  const db = await database(name);
  try {
    const names = Array.from(db.objectStoreNames);
    const transaction = db.transaction(names, "readonly"), ended = complete(transaction);
    const rows = await Promise.all(names.map(async name => {
      const store = transaction.objectStore(name);
      const keys = request(store.getAllKeys()), values = request(store.getAll());
      return { name, keyPath: store.keyPath, autoIncrement: store.autoIncrement, keys: await keys,
        values: (await values).map(value => value === undefined ? { undefined: true } : { value }) };
    }));
    await ended;
    return rows;
  } finally { db.close(); }
}
async function mutate(name: string, storeName: string, key: IDBValidKey, value: unknown): Promise<void> {
  const db = await database(name);
  try {
    const transaction = db.transaction(storeName, "readwrite"), ended = complete(transaction);
    transaction.objectStore(storeName).put(value, key);
    await ended;
  } finally { db.close(); }
}
async function nativeState(name: string, id: string) {
  const db = await database(name);
  try {
    const tx = db.transaction(["records", "outcomes", "lengths"], "readonly"), ended = complete(tx);
    const read = request(tx.objectStore("records").get(id));
    const outcomes = request(tx.objectStore("outcomes").count()), lengths = request(tx.objectStore("lengths").count());
    const row = await read, text = typeof row?.text === "string" ? row.text as string : null;
    const record = text === null ? null : JSON.parse(text) as CustodyRecord;
    const state = { text, phase: record?.phase ?? null, count: record?.count ?? null, outcomes: await outcomes, lengths: await lengths };
    await ended;
    return state;
  } finally { db.close(); }
}
async function rejected(work: () => Promise<unknown>): Promise<boolean> {
  try { await work(); return false; } catch { return true; }
}
const gone = (name: string): Promise<boolean> => new Promise(resolve => {
  const removal = indexedDB.deleteDatabase(name);
  removal.onsuccess = () => resolve(true);
  removal.onerror = removal.onblocked = () => resolve(false);
});

/** Every instance uses TEST-only databases. The native join's database is read only by its own witness. */
export function custodyStoreWitness(seed: CustodyRecord, signer: Signer) {
  const stores = new Set<BrowserStore>();
  const results: CaseResult[] = [];
  const check = (name: string, passed: boolean, detail?: unknown) => results.push({ name, passed, ...(detail === undefined ? {} : { detail }) });
  const run = crypto.randomUUID();
  let builds = 0, sends = 0, clock = Date.now();
  const now = () => timeOf(clock);
  const deadline = () => timeOf(clock + 60_000);
  const identity = (key: string): Identity => ({ ...seed.identity, key });
  const build = (key: string) => async () => {
    builds++;
    const original = seed.envelope.signed.intent;
    const signed = await signedIntent(signer, { to: original.to, kind: original.kind, fields: original.fields, expected: original.expected,
      ...(original.on === undefined ? {} : { on: original.on }) }, { now: clock, idempotencyKey: key });
    return { binding: seed.binding, envelope: { ...seed.envelope, signed } };
  };
  const receipt = (record: CustodyRecord): Receipt => {
    const last = [...seed.outcomes].reverse().find(outcome => "settled" in outcome || "answer" in outcome && outcome.answer.answer === "accepted");
    const held = last && ("settled" in last ? last.settled : "answer" in last && last.answer.answer === "accepted" ? last.answer.receipt : null);
    if (!held) throw new Error("The native join witness supplied no accepted receipt");
    return { ...held, intent: intentDigest(record.envelope.signed.intent) };
  };
  const make = (label: string, more: { terminalLive?: number; unresolvedMost?: number; platform?: BrowserCustodyPlatform } = {}) => {
    const name = `TEST-nf5-${run}-${label}`, lock = name;
    const store = browserCustodyStore({ database: name, lock, ...more });
    stores.add(store);
    return { name, lock, store, custody: new Custody(store, now) };
  };
  const keep = (custody: Custody, key: string) => custody.keep(identity(key), meaningOf(key), build(key), deadline());

  async function boundedHistory() {
    const { name, store, custody } = make("bounded");
    const key = "late-page", who = identity(key), id = identityId(who), beforeBuilds = builds;
    // More than two inline windows forces a late page of actual spilled retry outcomes.
    for (let attempt = 0; attempt < 137; attempt++) {
      clock++;
      await custody.send(who, meaningOf(key), build(key), async () => { sends++; throw new Lost(); }, { notAfter: deadline() });
    }
    const before = await custody.find(who);
    if (!before) throw new Error("TEST retry history missing");
    const spilled = before.count - before.outcomes.length, from = spilled - 4, limit = 3;
    const reads: { method: string; ranged: boolean; rows: number; bounded: boolean }[] = [];
    const originalGet = IDBObjectStore.prototype.get, originalAll = IDBObjectStore.prototype.getAll, originalCursor = IDBObjectStore.prototype.openCursor;
    const note = (method: string, key: IDBValidKey | IDBKeyRange | null | undefined, count: number | undefined, req: IDBRequest) => {
      const range = key instanceof IDBKeyRange ? key : null;
      const lower = range?.lower, upper = range?.upper;
      const position = Array.isArray(key) && key[0] === id && Number.isSafeInteger(key[1]) && key[1] >= from && key[1] < from + limit;
      const bounded = position || Array.isArray(lower) && Array.isArray(upper) && lower[0] === id && upper[0] === id
        && lower[1] >= from && upper[1] <= from + limit && (upper[1] < from + limit || range!.upperOpen);
      const read = { method, ranged: range !== null, rows: 0, bounded: Boolean(bounded && (count === undefined || count <= limit)) };
      reads.push(read);
      req.addEventListener("success", () => { const result = req.result; read.rows += result === undefined || result === null ? 0 : Array.isArray(result) ? result.length : 1; });
    };
    IDBObjectStore.prototype.get = function (key) { const req = originalGet.call(this, key); if (this.name === "outcomes") note("get", key, undefined, req); return req; };
    IDBObjectStore.prototype.getAll = function (query, count) { const req = originalAll.call(this, query, count); if (this.name === "outcomes") note("getAll", query, count, req); return req; };
    IDBObjectStore.prototype.openCursor = function (query, direction) { const req = originalCursor.call(this, query, direction); if (this.name === "outcomes") note("cursor", query, undefined, req); return req; };
    let page: StoredOutcome[];
    try { page = await store.segmented(id, from, limit); }
    finally { IDBObjectStore.prototype.get = originalGet; IDBObjectStore.prototype.getAll = originalAll; IDBObjectStore.prototype.openCursor = originalCursor; }
    const history = await custody.outcomes(id, before);
    check("real IDB late page reads only the bounded range", spilled > 64 && page.length === limit && reads.length > 0 && reads.every(read => read.bounded) && reads.reduce((n, read) => n + read.rows, 0) <= limit,
      { spilled, from, limit, reads });
    check("actual retries keep all outcomes in order with one signing", history.length === 137 && history.every((outcome, index) => "lost" in outcome && outcome.attempt === 1 && outcome.at === timeOf(clock - 136 + index)) && builds - beforeBuilds === 1);
    const settled = await custody.settle(who, async () => receipt(before));
    const after = await custody.find(who);
    check("scripted settlement preserves the exact envelope after real IDB spills", settled?.record.phase === "accepted" && after?.count === 138 && equal(after.envelope, before.envelope) && builds - beforeBuilds === 1);
    const db = await database(name);
    check("the first released schema has only positional outcome stores", db.version === 2 && equal(Array.from(db.objectStoreNames).sort(), ["archive", "lengths", "outcomes", "records"]));
    db.close();
  }

  async function rollback() {
    const { name, store, custody } = make("rollback", { terminalLive: 1 });
    const first = await keep(custody, "rollback-a"), id = identityId(first.identity);
    const outcomes: StoredOutcome[] = [1, 2, 3].map(n => ({ at: timeOf(clock + n), lost: true, attempt: 1, signing: 0 }));
    await store.segment(id, 0, outcomes);
    const before = await snapshot(name);
    const put = IDBObjectStore.prototype.put;
    let armed = true, aborted = false;
    IDBObjectStore.prototype.put = function (value, key) {
      const req = put.call(this, value, key);
      if (armed && this.name === "outcomes") {
        armed = false;
        req.addEventListener("success", () => { aborted = true; this.transaction.abort(); }, { once: true });
      }
      return req;
    };
    let refused: boolean;
    try { refused = await rejected(() => store.segment(id, 1, outcomes.slice(2))); }
    finally { IDBObjectStore.prototype.put = put; }
    check("real abort rolls back truncation append and length together", refused && aborted && equal(await snapshot(name), before));
    await store.segment(id, 1, outcomes.slice(2));
    const once = await snapshot(name);
    await store.segment(id, 1, outcomes.slice(2));
    check("repeating an append repairs the interrupted record tail exactly", equal(await snapshot(name), once) && equal(await store.segmented(id, 0, 8), [outcomes[0], outcomes[2]]));
    // A missing expected position cannot be reported as a shorter successful page.
    const db = await database(name), transaction = db.transaction("outcomes", "readwrite"), ended = complete(transaction);
    transaction.objectStore("outcomes").delete([id, 0]); await ended; db.close();
    check("a missing expected outcome row is unreadable", await rejected(() => store.segmented(id, 0, 2)));

    // Archive moves use real rollback too: first write one accepted row, then abort the second terminal write's archive put.
    await custody.settle(first.identity, async () => receipt(first));
    const second = await keep(custody, "rollback-b"), beforeArchive = await snapshot(name);
    armed = true; aborted = false;
    IDBObjectStore.prototype.put = function (value, key) {
      const req = put.call(this, value, key);
      if (armed && this.name === "archive") { armed = false; req.addEventListener("success", () => { aborted = true; this.transaction.abort(); }, { once: true }); }
      return req;
    };
    try { refused = await rejected(() => custody.settle(second.identity, async () => receipt(second))); }
    finally { IDBObjectStore.prototype.put = put; }
    check("real abort keeps the live record and archive move atomic", refused && aborted && equal(await snapshot(name), beforeArchive));
  }

  async function malformed() {
    const who = { service: seed.identity.service, membership: seed.identity.membership, signer: seed.identity.signer, target: seed.identity.target };
    for (const defect of ["null-text", "projection", "null-wrapper", "undefined-wrapper", "unknown-version"] as const) {
      const { name, store, custody } = make(`malformed-${defect}`);
      const key = `malformed-${defect}`, record = await keep(custody, key), id = identityId(record.identity);
      const db = await database(name), tx = db.transaction("records", "readonly"), ended = complete(tx);
      const row = await request(tx.objectStore("records").get(id)); await ended; db.close();
      const bad = defect === "null-text" ? { ...row, text: "null" } : defect === "projection" ? { ...row, phase: "accepted", who: "wrong-target" }
        : defect === "null-wrapper" ? null : defect === "undefined-wrapper" ? undefined : { ...row, text: canonicalize({ ...record, v: 99 } as never) };
      await mutate(name, "records", id, bad);
      const before = await snapshot(name), oldBuilds = builds, oldSends = sends;
      const denied = await Promise.all([
        rejected(() => custody.find(record.identity)),
        rejected(() => custody.send(record.identity, meaningOf(key), build(key), async () => { sends++; throw new Lost(); }, { notAfter: deadline() })),
        rejected(() => store.unresolved()), rejected(() => store.byTarget(who)),
      ]);
      check(`real malformed ${defect} stays unreadable and cannot replace its original`, denied.every(Boolean) && builds === oldBuilds && sends === oldSends && equal(await snapshot(name), before));
    }
    const { name, store, custody } = make("malformed-archive"), record = await keep(custody, "archived-corrupt"), id = identityId(record.identity);
    const db = await database(name), tx = db.transaction(["records", "archive"], "readwrite"), ended = complete(tx);
    tx.objectStore("records").delete(id); tx.objectStore("archive").put({ text: "null" }, id); await ended; db.close();
    const before = await snapshot(name);
    check("real malformed archive cannot become absent", await rejected(() => custody.find(record.identity)) && equal(await snapshot(name), before));
    store.close();

    const orphaned = make("orphaned-outcome"), orphan = await keep(orphaned.custody, "orphan"), orphanId = identityId(orphan.identity);
    const outcome: StoredOutcome = { at: now(), lost: true, attempt: 1, signing: 0 };
    await mutate(orphaned.name, "outcomes", [orphanId, 0], outcome);
    const original = await snapshot(orphaned.name), oldBuilds = builds, oldSends = sends;
    const denied = await Promise.all([
      rejected(() => orphaned.custody.find(orphan.identity)), rejected(() => orphaned.store.segmented(orphanId, 0, 1)),
      rejected(() => orphaned.store.segment(orphanId, 0, [outcome])),
      rejected(() => orphaned.custody.send(orphan.identity, meaningOf("orphan"), build("orphan"), async () => { sends++; throw new Lost(); }, { notAfter: deadline() })),
    ]);
    check("orphan outcome rows cannot become an empty missing-length history", denied.every(Boolean) && builds === oldBuilds && sends === oldSends && equal(await snapshot(orphaned.name), original));
    // Include malformed ordinals of other key types, not only positions a normal writer produces.
    for (const [index, position] of ([-1, "bad", ["nested"], null] as (IDBValidKey | null)[]).entries()) {
      const malformed = make(`invalid-orphan-${index}`), key = `invalid-orphan-${index}`, who = identity(key), id = identityId(who);
      await malformed.store.read(id);
      await mutate(malformed.name, "outcomes", position === null ? id : [id, position], outcome);
      const before = await snapshot(malformed.name), priorBuilds = builds, priorSends = sends;
      const refused = await Promise.all([
        rejected(() => malformed.custody.find(who)), rejected(() => malformed.store.segmented(id, 0, 1)),
        rejected(() => malformed.store.segment(id, 0, [outcome])),
        rejected(() => malformed.custody.send(who, meaningOf(key), build(key), async () => { sends++; throw new Lost(); }, { notAfter: deadline() })),
      ]);
      check(`malformed orphan key ${index} is retained without absence replacement or append`, refused.every(Boolean) && builds === priorBuilds && sends === priorSends && equal(await snapshot(malformed.name), before));
    }
  }

  async function lifecycle() {
    const closed = make("closed"); await keep(closed.custody, "close"); closed.store.close(); closed.store.close();
    const oldBuilds = builds;
    check("close retires the instance and releases its native connection", await rejected(() => keep(closed.custody, "after-close")) && builds === oldBuilds && await gone(closed.name));

    const admitted = make("admitted-transaction"), record = await keep(admitted.custody, "admitted-before-close");
    const next = { ...record, updated: timeOf(clock + 1000) }, id = identityId(record.identity), put = IDBObjectStore.prototype.put;
    let retiredDuringWrite = false, committed = false;
    IDBObjectStore.prototype.put = function (value, key) {
      const req = put.call(this, value, key);
      if (!retiredDuringWrite && this.name === "records") req.addEventListener("success", () => { retiredDuringWrite = true; admitted.store.close(); }, { once: true });
      return req;
    };
    try { committed = !await rejected(() => admitted.store.write(id, next)); }
    finally { IDBObjectStore.prototype.put = put; }
    const verification = await database(admitted.name), readback = verification.transaction("records", "readonly"), readDone = complete(readback);
    const written = await request(readback.objectStore("records").get(id)); await readDone; verification.close();
    check("an admitted real transaction reports its commit after close", retiredDuringWrite && committed && written.text === canonicalize(next as never));

    // Hold delivery of a real open's success event. The connection exists before close, but the store has not received it.
    let openArrived!: () => void, releaseOpen!: () => void;
    const arrived = new Promise<void>(resolve => { openArrived = resolve; });
    const lateName = `TEST-nf5-${run}-late-success`;
    const latePlatform = { locks: navigator.locks, IDBKeyRange, indexedDB: { open(name: string, version: number) {
      const native = indexedDB.open(name, version);
      type Handler = ((event: Event) => void) | null;
      const held = { get result() { return native.result; }, get transaction() { return native.transaction; }, onsuccess: null as Handler, onerror: null as Handler, onblocked: null as Handler, onupgradeneeded: null as Handler };
      native.onupgradeneeded = event => held.onupgradeneeded?.(event);
      native.onerror = event => held.onerror?.(event);
      native.onblocked = event => held.onblocked?.(event);
      native.onsuccess = event => { releaseOpen = () => held.onsuccess?.(event); openArrived(); };
      return held;
    } } } as unknown as BrowserCustodyPlatform;
    const late = browserCustodyStore({ database: lateName, lock: lateName, platform: latePlatform }); stores.add(late);
    const lateRead = late.read(identityId(identity("late-open"))).then(() => false, () => true);
    await arrived; late.close(); releaseOpen();
    check("a real connection delivered after close is refused and closed", await lateRead && await gone(lateName));

    const changed = make("versionchange"); await keep(changed.custody, "before-versionchange");
    const opened = indexedDB.open(changed.name, 3);
    const upgraded = await new Promise<boolean>((resolve, reject) => {
      opened.onsuccess = () => { opened.result.close(); resolve(true); };
      opened.onblocked = () => resolve(false); opened.onerror = () => reject(opened.error);
    });
    check("versionchange closes the native connection and retires its instance", upgraded && await rejected(() => changed.store.read(identityId(identity("before-versionchange")))));

    const pendingName = `TEST-nf5-${run}-pending-open`;
    const blocker = await database(pendingName, 1, db => db.createObjectStore("unrecognized-draft"));
    const pending = browserCustodyStore({ database: pendingName, lock: pendingName }); stores.add(pending);
    // A queued schema open must reject at blocked. Closing the blocker later must not leave a late connection open.
    const denied = await rejected(() => pending.read(identityId(identity("pending-open"))));
    pending.close(); blocker.close();
    const retained = await database(pendingName);
    const untouched = retained.version === 1 && equal(Array.from(retained.objectStoreNames), ["unrecognized-draft"]); retained.close();
    check("an abandoned blocked open preserves unknown layout and closes late connections", denied && untouched && await gone(pendingName));

    const unknown = make("unknown-layout");
    const alien = await database(unknown.name, 2, db => db.createObjectStore("unrecognized")); alien.close();
    const before = await snapshot(unknown.name);
    check("an unknown exact-version layout stays unreadable and unchanged", await rejected(() => keep(unknown.custody, "alien")) && equal(await snapshot(unknown.name), before));
    for (const defect of ["inline-key", "auto-increment"] as const) {
      const unexpected = make(`unknown-${defect}`);
      const db = await database(unexpected.name, 2, db => {
        for (const name of ["archive", "lengths", "outcomes", "records"]) db.createObjectStore(name, {
          keyPath: defect === "inline-key" && name === "records" ? "id" : null,
          autoIncrement: defect === "auto-increment" && name === "outcomes",
        });
      });
      db.close();
      const before = await snapshot(unexpected.name), priorBuilds = builds;
      check(`same names and version with ${defect} is unreadable before signing`, await rejected(() => keep(unexpected.custody, defect)) && builds === priorBuilds && equal(await snapshot(unexpected.name), before));
    }
  }

  async function optionalChannel() {
    for (const failure of ["construction", "post"] as const) {
      const platform = { indexedDB, IDBKeyRange, locks: navigator.locks, BroadcastChannel: class {
        onmessage: ((event: { data: unknown }) => void) | null = null;
        constructor() { if (failure === "construction") throw new Error("TEST channel unavailable"); }
        postMessage() { throw new Error("TEST channel post failed"); }
        close() {}
      } } as unknown as BrowserCustodyPlatform;
      const { store, custody } = make(`channel-${failure}`, { platform });
      let signals = 0;
      const stop = store.observe(() => { signals++; });
      const record = await keep(custody, `channel-${failure}`);
      check(`channel ${failure} failure cannot fail a real committed write`, (await custody.find(record.identity))?.phase === "prepared" && signals === 1);
      stop();
    }
  }

  async function beforeDispatch() {
    const marked = make("retired-before-deliver"), key = "retired-before-deliver", id = identityId(identity(key));
    const write = marked.store.write.bind(marked.store), exclusive = marked.store.exclusive;
    let exactSent = "", posts = 0;
    marked.store.write = async (id, record, options) => {
      await write(id, record, options);
      if (record.phase === "sent") exactSent = canonicalize(record);
    };
    // The sent-mark transaction, including its own byte check, finished. Retire before invoking deliver.
    marked.store.exclusive = async <T>(work: () => Promise<T>): Promise<T> => { if (exactSent) marked.store.close(); return exclusive(work); };
    const answer = await marked.custody.send(identity(key), meaningOf(key), build(key), async () => { posts++; throw new Lost(); }, { notAfter: deadline() })
      .then(() => null, (error: unknown) => error instanceof CustodyError ? error.why : null);
    const state = await nativeState(marked.name, id);
    check("retirement after the committed sent mark prevents invoking the POST", answer?.held === "unreadable" && posts === 0 && state.text === exactSent && state.phase === "sent" && state.count === 0 && state.outcomes === 0 && state.lengths === 0);

    const kept = make("retired-before-sent-write"), preparedKey = "retired-before-sent-write", preparedId = identityId(identity(preparedKey));
    const keepWrite = kept.store.write.bind(kept.store);
    let committedText = "", nextWrites = 0, forbiddenPosts = 0;
    kept.store.write = async (id, record, options) => {
      if (committedText) nextWrites++;
      await keepWrite(id, record, options);
      if (record.phase === "prepared") { committedText = canonicalize(record); kept.store.close(); }
    };
    const unavailable = await kept.custody.send(identity(preparedKey), meaningOf(preparedKey), build(preparedKey), async () => { forbiddenPosts++; throw new Lost(); }, { notAfter: deadline() })
      .then(() => null, (error: unknown) => error instanceof CustodyError ? error.why : null);
    const retained = await nativeState(kept.name, preparedId);
    check("retirement after committed preparation refuses the next sent write before delivery", unavailable?.held === "unreadable" && nextWrites === 1 && forbiddenPosts === 0
      && retained.text === committedText && retained.phase === "prepared" && retained.count === 0 && retained.outcomes === 0 && retained.lengths === 0);
  }

  let tabStore: BrowserStore | null = null, tabCustody: Custody | null = null;
  let releaseRecord: (() => Promise<void>) | null = null;
  let releaseAdmission: (() => void) | null = null, admissionDone: Promise<void> | null = null;
  let observed: Promise<void> | null = null, stopObserved: (() => void) | null = null;
  let network: { name: string; id: string; store: BrowserStore; exactSent: () => string; result: Promise<HeldBack | null>; before?: Awaited<ReturnType<typeof nativeState>> } | null = null;
  return {
    async run() {
      try { await boundedHistory(); await rollback(); await malformed(); await lifecycle(); await optionalChannel(); await beforeDispatch(); }
      finally { for (const store of stores) store.close(); }
      return { transport: "scripted Lost and receipt ports; IndexedDB and Web Locks are real", cases: results, builds, sends };
    },
    /** The harness holds an actual same-origin POST at its route, upgrades IDB while it waits, and only then releases its reply. */
    async heldPost(command: "start" | "retire-and-upgrade" | "finish") {
      if (command === "start") {
        const held = make("held-network"), key = "held-network", id = identityId(identity(key)), write = held.store.write.bind(held.store);
        let exactSent = "";
        held.store.write = async (id, record, options) => { await write(id, record, options); if (record.phase === "sent") exactSent = canonicalize(record); };
        const result = held.custody.send(identity(key), meaningOf(key), build(key), async envelope => {
          const response = await fetch(new URL("held-post", location.href), { method: "POST", headers: { "content-type": "application/json" }, body: canonicalize(envelope.signed) });
          if (!response.ok) throw new Lost();
          const sent = JSON.parse(exactSent) as CustodyRecord;
          return { answer: "accepted", receipt: receipt(sent) };
        }, { notAfter: deadline() }).then(() => null, (error: unknown) => error instanceof CustodyError ? error.why : null);
        network = { name: held.name, id, store: held.store, exactSent: () => exactSent, result };
        return { started: true };
      }
      if (!network) throw new Error("Start the TEST held POST first");
      if (command === "retire-and-upgrade") {
        let admissionEntered = false;
        await network.store.exclusive(async () => { admissionEntered = true; });
        network.store.close();
        network.before = await nativeState(network.name, network.id);
        const opening = indexedDB.open(network.name, 3);
        const upgraded = await new Promise<boolean>((resolve, reject) => {
          opening.onsuccess = () => { opening.result.close(); resolve(true); };
          opening.onblocked = () => resolve(false); opening.onerror = () => reject(opening.error);
        });
        return { upgraded, admissionEntered, phase: network.before.phase, exactSent: network.before.text === network.exactSent(), count: network.before.count, outcomes: network.before.outcomes, lengths: network.before.lengths };
      }
      const answer = await network.result, after = await nativeState(network.name, network.id);
      return { storageAnswer: answer && answer.held === "unkept" ? { held: answer.held, answer: answer.answer } : null,
        exactSent: after.text === network.exactSent(), unchanged: equal(after, network.before), phase: after.phase, count: after.count, outcomes: after.outcomes, lengths: after.lengths };
    },
    /** Called by two real same-origin pages. Gates settle on native lock or channel events, never a wall-clock delay. */
    async tab(command: string, options: { database?: string; key?: string } = {}): Promise<unknown> {
      if (command === "open") {
        if (!options.database?.startsWith("TEST-nf5-")) throw new Error("Choose a TEST-only custody database");
        tabStore?.close();
        tabStore = browserCustodyStore({ database: options.database, lock: options.database, unresolvedMost: 1 }); stores.add(tabStore);
        tabCustody = new Custody(tabStore, now); return true;
      }
      if (!tabStore || !tabCustody) throw new Error("TEST tab store is not open");
      const key = options.key ?? "shared-record";
      if (command === "hold-record") { releaseRecord = await tabStore.lock(identityId(identity(key)), deadline()); return releaseRecord !== null; }
      if (command === "release-record") { await releaseRecord?.(); releaseRecord = null; return true; }
      if (command === "keep") {
        const before = builds;
        try { await keep(tabCustody, key); return { kept: true, builds: builds - before }; }
        catch { return { kept: false, builds: builds - before }; }
      }
      if (command === "hold-admission") {
        let acquired!: () => void;
        const held = new Promise<void>(resolve => { releaseAdmission = resolve; });
        const ready = new Promise<void>(resolve => { acquired = resolve; });
        admissionDone = tabStore.exclusive(async () => { acquired(); await held; }); await ready; return true;
      }
      if (command === "release-admission") { releaseAdmission?.(); await admissionDone; return true; }
      if (command === "observe") {
        observed = new Promise(resolve => { stopObserved = tabStore!.observe(resolve); }); return true;
      }
      if (command === "observed") { await observed; stopObserved?.(); return true; }
      if (command === "close") { tabStore.close(); return true; }
      if (command === "counts") return { builds, unresolved: (await tabStore.unresolved()).length };
      throw new Error("Unknown TEST tab command");
    },
  };
}
