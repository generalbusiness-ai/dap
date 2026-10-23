import { execFileSync } from "node:child_process";
import { inflateSync } from "node:zlib";
import { afterAll, expect, test, vi } from "vitest";
import { advertisementRefusalDetail, httpResponseRefusalDetail, decodePack, SmartHttpSource } from "../src/http-read.ts";
import { buildPack } from "../src/http.ts";
import { GitRefusal } from "../src/names.ts";
import { READ_BOUNDS, Reader } from "../src/reader.ts";
import { Host } from "./support/host.ts";
import { bare, cleanup, commitText, git, put, setRef } from "./support/repo.ts";

afterAll(cleanup);
const TOKEN = "read-private-token";
const REF = "refs/heads/main";
const maxBytes = 1_000_000; // this fixture's caller allowance, not a platform quota
const options = { maxBytes };

function repository() {
  const remote = bare();
  const expected = new Map<string, { type: "commit" | "tree" | "blob"; data: Uint8Array }>();
  const write = (type: "commit" | "tree" | "blob", data: Uint8Array): string => {
    const id = put(remote, type, data); // independent Node SHA-1 fixture names
    expected.set(id, { type, data: new Uint8Array(data) });
    return id;
  };
  const common = Array.from({ length: 1000 }, (_, i) => `line-${i.toString().padStart(4, "0")} predictable material for Git delta compression\n`).join("");
  const blob1 = write("blob", Buffer.from(common));
  const blob2 = write("blob", Buffer.from(common.replace("line-0500", "edit-0500")));
  const tree1 = write("tree", Buffer.concat([Buffer.from("100644 file\0"), Buffer.from(blob1, "hex")]));
  const tree2 = write("tree", Buffer.concat([Buffer.from("100644 file\0"), Buffer.from(blob2, "hex")]));
  const base = write("commit", Buffer.from(commitText(tree1, [], "base")));
  const head = write("commit", Buffer.from(commitText(tree2, [base], "head")));
  setRef(remote, REF, head);
  return { remote, expected, head, tree2, blob2 };
}

function pack(remote: string, head: string, ofs: boolean): Uint8Array {
  return new Uint8Array(execFileSync("git", ["-C", remote, "pack-objects", "--stdout", "--revs", "--window=10", "--depth=10", ...(ofs ? ["--delta-base-offset"] : [])], {
    input: `${head}\n`, maxBuffer: maxBytes,
    env: { PATH: process.env["PATH"] ?? "/usr/bin:/bin", GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" },
  }));
}

/** Independent Node zlib boundary oracle confirms the real Git pack kinds. */
function packEntries(pack: Uint8Array): { kind: number; bytes: number }[] {
  const matched: { kind: number; bytes: number }[] = [];
  let at = 12;
  const count = new DataView(pack.buffer, pack.byteOffset).getUint32(8);
  for (let i = 0; i < count; i++) {
    let b = pack[at++]!;
    const kind = (b >>> 4) & 7;
    while ((b & 128) !== 0) b = pack[at++]!;
    if (kind === 7) at += 20;
    if (kind === 6) { do { b = pack[at++]!; } while ((b & 128) !== 0); }
    // Node's typings omit the info:true overload that returns its engine.
    const raw = inflateSync(pack.subarray(at), { info: true }) as unknown as { buffer: Uint8Array; engine: { bytesWritten: number } };
    at += raw.engine.bytesWritten;
    matched.push({ kind, bytes: raw.buffer.length });
  }
  return matched;
}
const kinds = (pack: Uint8Array) => packEntries(pack).map(entry => entry.kind);

// Invariant: actual local Git's upload response becomes exact objects for
// the production Reader, including real OFS/REF deltas; refs establish
// absence, but denied, corrupt or failed object reads never imply absence.
// Host is a local HTTP stand-in backed by real git http-backend. No deployed
// Worker or hosted provider runs here.
test("Web upload-pack reads exact local Git closure and empty refs, and decodes both real Git delta encodings", async () => {
  const { remote, expected, head, tree2, blob2 } = repository();
  const host = new Host(remote, TOKEN);
  const requests: { method: string; url: string; redirect: string; credentials: string; body: string }[] = [];
  let posts = 0;
  const source = new SmartHttpSource({ remote: "http://127.0.0.1/repo.git", transport: "local", authorization: `Bearer ${TOKEN}`, maxBytes, fetch: async (request) => {
    requests.push({ method: request.method, url: request.url, redirect: request.redirect, credentials: request.credentials, body: await request.clone().text() });
    if (request.method === "POST") posts++;
    return host.upstream(request);
  } });
  const reader = new Reader(source);
  expect(await reader.snapshot("refs/heads/")).toEqual([{ ref: REF, target: head }]);
  expect(await reader.ref("refs/heads/absent")).toBeNull();
  expect(await reader.closure(head)).toEqual({ complete: true, objects: expected.size });
  expect(posts).toBe(1); // trees, blobs and ancestors come from the verified pack
  for (const [id, object] of expected) expect(await reader.object(id, object.type)).toEqual(object.data);
  const owned = await source.object(blob2, maxBytes);
  owned.data!.fill(0);
  expect(await reader.blob(blob2)).toEqual(expected.get(blob2)!.data);
  expect(await source.object(blob2, 0)).toEqual({ type: "blob", size: expected.get(blob2)!.data.length, data: null });
  expect(requests.filter((r) => r.method === "POST").map((r) => r.body)).toEqual([`003cwant ${head} ofs-delta\n00000009done\n`]);
  expect(requests.every((r) => r.redirect === "manual" && r.credentials === "omit" && !r.url.includes(TOKEN) && !r.body.includes(TOKEN))).toBe(true);
  expect(JSON.stringify(source).includes(TOKEN)).toBe(false);

  // A fresh reader wants a nonadvertised exact tree/blob only when real Git
  // advertises its reachable-object allowance; no ref or ID is substituted.
  git(remote, ["config", "uploadpack.allowReachableSHA1InWant", "true"]);
  const exact = () => new Reader(new SmartHttpSource({ remote: "http://127.0.0.1/repo.git", transport: "local", authorization: `Bearer ${TOKEN}`, maxBytes, fetch: host.upstream }));
  expect(await exact().object(tree2, "tree")).toEqual(expected.get(tree2)!.data);
  expect(await exact().blob(blob2)).toEqual(expected.get(blob2)!.data);
  await expect(exact().blob("f".repeat(40))).rejects.toMatchObject({ reason: "unreadable" });
  const empty = new Host(bare(), TOKEN);
  const emptySource = new SmartHttpSource({ remote: "http://127.0.0.1/repo.git", transport: "local", authorization: `Bearer ${TOKEN}`, maxBytes, fetch: empty.upstream });
  expect(await emptySource.ref(REF)).toBeNull();
  expect(await emptySource.refs("refs/heads/", 1)).toEqual([]);
  await expect(emptySource.object(head, maxBytes)).rejects.toMatchObject({ reason: "unreadable" });

  // The decoder boundary gets two packs made by actual Git, not by our
  // encoder. Node zlib independently confirms that each contains a delta.
  for (const ofs of [true, false]) {
    const bytes = pack(remote, head, ofs);
    expect(kinds(bytes)).toContain(ofs ? 6 : 7);
    const decoded = await decodePack(bytes, options);
    expect(new Map(decoded.map((o) => [o.id, { type: o.type, data: o.data }]))).toEqual(expected);
    const local = bare();
    git(local, ["index-pack", "--stdin"], bytes);
    expect(git(local, ["cat-file", "--batch-check"], [...expected.keys()].map((id) => `${id}\n`).join("")))
      .toBe([...expected].map(([id, o]) => `${id} ${o.type} ${o.data.length}`).join("\n"));
  }
});

// Invariant: a bad pack checksum or exhausted byte allowance cannot enter
// the source's cache or count as missing. This also supplies one checksum
// control at the cheapest pack boundary, using actual Git's bytes.
test("Web pack reads reject corruption and bounds, and HTTP failures keep no guessed absence or partial cache", async () => {
  const { remote, head, expected } = repository();
  const bytes = pack(remote, head, true);
  const corrupt = new Uint8Array(bytes);
  corrupt[corrupt.length - 1]! ^= 1;
  const refused = await decodePack(corrupt, options).then(() => null, (e: unknown) => e instanceof GitRefusal ? { reason: e.reason, what: e.what } : { unexpected: true });
  expect(refused).toEqual({ reason: "hash-mismatch", what: "pack trailer" });
  await expect(decodePack(bytes, { maxBytes: 32 })).rejects.toMatchObject({ reason: "too-large" });
  const host = new Host(remote, TOKEN);
  let broken = true;
  let posts = 0;
  const source = new SmartHttpSource({ remote: "http://127.0.0.1/repo.git", transport: "local", authorization: `Bearer ${TOKEN}`, maxBytes, fetch: async (request) => {
    const response = await host.upstream(request);
    if (request.method !== "POST") return response;
    posts++;
    const data = new Uint8Array(await response.arrayBuffer());
    if (broken) data[data.length - 1]! ^= 1;
    return new Response(data, { status: response.status, headers: response.headers });
  } });
  await expect(source.object(head, maxBytes)).rejects.toMatchObject({ reason: "hash-mismatch" });
  broken = false;
  expect((await source.object(head, maxBytes)).data).toEqual(expected.get(head)!.data);
  expect(posts).toBe(2); // explicit second read, no internal retry or partial cache
  const failed = new SmartHttpSource({ remote: "https://git.example.invalid/repo.git", maxBytes, fetch: () => Promise.reject(new Error(TOKEN)) });
  await expect(failed.object(head, maxBytes)).rejects.toMatchObject({ reason: "unreadable", message: "unreadable: HTTP read request" });
  await expect(failed.ref(REF)).rejects.toMatchObject({ reason: "unreadable" });
});


const pkt = (line: string) => Buffer.concat([Buffer.from((Buffer.byteLength(line) + 4).toString(16).padStart(4, "0")), Buffer.from(line)]);
const isolatedAnswer = (pack: Uint8Array, before = Buffer.from("0000")) => new Response(Buffer.concat([before, pkt("NAK\n"), pack]), { headers: { "content-type": "application/x-git-upload-pack-result" } });
const onePack = (remote: string, id: string) => new Uint8Array(execFileSync("git", ["-C", remote, "pack-objects", "--stdout"], {
  input: `${id}\n`, maxBuffer: maxBytes,
  env: { PATH: process.env["PATH"] ?? "/usr/bin:/bin", GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" },
}));
const isolatedWire = 64 * 1024;
const isolatedOptions = { remote: "http://127.0.0.1/repo.git", transport: "local" as const, authorization: `Bearer ${TOKEN}`, maxBytes: isolatedWire, isolateObjects: { ownedBytes: 32 * isolatedWire } };
const allowIsolation = (remote: string) => {
  git(remote, ["config", "uploadpack.allowFilter", "true"]);
  git(remote, ["config", "uploadpack.allowReachableSHA1InWant", "true"]);
};

// The HTTP adapter is a stand-in backed by real local git http-backend.
// Invariant: explicit isolated reads transfer only the wanted verified object,
// including nonadvertised tree/blob and empty shallow phases, never ancestry.
test("isolated upload-pack reads one commit, root and blob without unrelated history or a large sibling", async () => {
  const remote = bare(); allowIsolation(remote);
  const content = put(remote, "blob", "selected\n");
  const large = put(remote, "blob", "large unrelated body\n".repeat(100_000));
  const root = put(remote, "tree", Buffer.concat([Buffer.from("100644 other\0"), Buffer.from(large, "hex"), Buffer.from("100755 selected\0"), Buffer.from(content, "hex")]));
  const first = put(remote, "commit", commitText(root, [], "root"));
  let head = first;
  for (let n = 0; n < 40; n++) head = put(remote, "commit", commitText(root, [head], `history ${n}`));
  setRef(remote, REF, head);
  const host = new Host(remote, TOKEN), seen: { body: string; bytes: number; objects: number; prefix: string }[] = [];
  const source = new SmartHttpSource({ ...isolatedOptions, fetch: async request => {
    const body = await request.clone().text();
    const response = await host.upstream(request);
    if (request.method !== "POST") return response;
    const raw = Buffer.from(await response.arrayBuffer()), start = raw.indexOf("PACK");
    seen.push({ body, bytes: raw.length, objects: start < 0 ? -1 : raw.readUInt32BE(start + 8), prefix: raw.subarray(0, start).toString("ascii") });
    return new Response(raw, { status: response.status, headers: response.headers });
  } });
  const reader = new Reader(source);
  expect(await reader.commit(head)).toMatchObject({ id: head, tree: root });
  expect((await reader.tree(root)).map(row => [new TextDecoder().decode(row.name), row.mode, row.id])).toEqual([["other", "100644", large], ["selected", "100755", content]]);
  expect(new TextDecoder().decode(await reader.blob(content))).toBe("selected\n");
  expect((await reader.commit(first)).parents).toEqual([]);
  expect(seen).toHaveLength(4);
  expect(seen.every(read => read.objects === 1 && read.body.includes("deepen 1\n") && read.body.includes("filter tree:0\n"))).toBe(true);
  expect(seen.reduce((n, read) => n + read.bytes, 0)).toBeLessThan(5000);
  expect(seen.slice(1, 3).every(read => read.prefix.startsWith("0000"))).toBe(true);
  // This unchanged full-mode request needs the large sibling and fails its
  // own byte allowance. Isolation does not turn the head into a closure.
  const { isolateObjects: _isolated, ...fullOptions } = isolatedOptions;
  const full = new SmartHttpSource({ ...fullOptions, fetch: host.upstream });
  await expect(new Reader(full).commit(head)).rejects.toMatchObject({ reason: "too-large" });
});

test("isolation refuses absent capabilities and tip-only permission before a POST", async () => {
  const { remote, tree2, head } = repository();
  const host = new Host(remote, TOKEN); let posts = 0;
  const fetch = async (request: Request) => { if (request.method === "POST") posts++; return host.upstream(request); };
  await expect(new Reader(new SmartHttpSource({ ...isolatedOptions, fetch })).commit(head)).rejects.toMatchObject({ reason: "unreadable", what: "isolated object capabilities" });
  expect(posts).toBe(0);
  git(remote, ["config", "uploadpack.allowFilter", "true"]);
  git(remote, ["config", "uploadpack.allowTipSHA1InWant", "true"]);
  await expect(new Reader(new SmartHttpSource({ ...isolatedOptions, fetch })).tree(tree2)).rejects.toMatchObject({ reason: "unreadable", what: "unadvertised want" });
  expect(posts).toBe(0);
});

test("isolated framing and pack guards refuse before inflation or cache retention", async () => {
  const { remote, head, blob2 } = repository(); allowIsolation(remote);
  const host = new Host(remote, TOKEN), single = onePack(remote, head), blobPack = onePack(remote, blob2);
  const readerFor = (answer: () => Response) => new Reader(new SmartHttpSource({ ...isolatedOptions, fetch: request => request.method === "POST" ? Promise.resolve(answer()) : host.upstream(request) }));
  for (const before of [pkt(`shallow ${"f".repeat(40)}\n`), Buffer.concat([pkt(`shallow ${head}\n`), pkt(`shallow ${head}\n`), Buffer.from("0000")]), Buffer.concat([pkt(`unshallow ${head}\n`), Buffer.from("0000")])]) {
    await expect(readerFor(() => isolatedAnswer(single, before)).commit(head)).rejects.toBeInstanceOf(GitRefusal);
  }
  // Missing shallow flush and a host ignoring filters both refuse. The
  // multiple-object pack's invalid body cannot reach an inflater.
  await expect(readerFor(() => isolatedAnswer(single, Buffer.alloc(0))).commit(head)).rejects.toMatchObject({ reason: "unreadable" });
  const extra = Buffer.alloc(32); extra.write("PACK"); extra.writeUInt32BE(2, 4); extra.writeUInt32BE(2, 8);
  await expect(readerFor(() => isolatedAnswer(extra)).commit(head)).rejects.toMatchObject({ reason: "too-large", what: "pack objects" });
  await expect(readerFor(() => isolatedAnswer(blobPack)).commit(head)).rejects.toMatchObject({ reason: "unreadable", what: "wanted object omitted" });
  await expect(readerFor(() => isolatedAnswer(blobPack)).commit(blob2)).rejects.toMatchObject({ reason: "wrong-type" });
  await expect(readerFor(() => new Response(new Uint8Array(isolatedWire + 1), { headers: { "content-type": "application/x-git-upload-pack-result" } })).commit(head)).rejects.toMatchObject({ reason: "too-large", what: "read bytes" });
  await expect(readerFor(() => isolatedAnswer(blobPack, Buffer.concat([pkt(`shallow ${blob2}\n`), Buffer.from("0000")]))).blob(blob2)).rejects.toMatchObject({ reason: "unreadable", what: "isolated shallow object" });
  // The caller's allowance is tested before even malformed zlib bytes are
  // examined, using the real Git header's declared inflated size.
  const damaged = new Uint8Array(blobPack); damaged[16] = damaged[16]! ^ 255;
  await expect(decodePack(damaged, { maxBytes, singleObjectBytes: 1 })).rejects.toMatchObject({ reason: "too-large", what: "isolated object allowance" });
  const tag = put(remote, "tag", `object ${head}\ntype commit\ntag example\ntagger Test <test@artroom.invalid> 1700000000 +0000\n\nTag.\n`);
  const tagPack = onePack(remote, tag);
  expect((await decodePack(tagPack, { maxBytes }))[0]?.type).toBe("tag");
  await expect(decodePack(tagPack, { maxBytes, singleObjectBytes: maxBytes })).rejects.toMatchObject({ reason: "wrong-type", what: "isolated pack entry" });
});

test("isolated in-flight and caller-owned copies consume one source allowance without concurrent borrowing", async () => {
  const remote = bare(); allowIsolation(remote);
  const body = Buffer.from("bounded output");
  const id = put(remote, "blob", body), root = put(remote, "tree", Buffer.concat([Buffer.from("100644 file\0"), Buffer.from(id, "hex")]));
  setRef(remote, REF, put(remote, "commit", commitText(root, [], "root")));
  const host = new Host(remote, TOKEN);
  let release!: () => void, began!: () => void;
  const opened = new Promise<void>(resolve => { began = resolve; });
  const held = new Promise<void>(resolve => { release = resolve; });
  let requests = 0;
  const source = new SmartHttpSource({ ...isolatedOptions, isolateObjects: { ownedBytes: 16 * isolatedWire + 2 * body.length }, fetch: async request => {
    requests++; if (requests === 1) { began(); await held; } return host.upstream(request);
  } });
  const first = source.object(id, body.length); await opened;
  await expect(source.object(id, body.length)).rejects.toMatchObject({ reason: "too-large", what: "concurrent isolated read" });
  expect(requests).toBe(1); release();
  const read = await first; expect(read.data).toEqual(new Uint8Array(body)); read.data!.fill(0);
  expect((await source.object(id, body.length)).data).toEqual(new Uint8Array(body));
  await expect(source.object(id, body.length)).rejects.toMatchObject({ reason: "too-large", what: "isolated working payload" });
  expect(requests).toBe(2); // one advertisement and one POST; no hidden retry
});


// No wall-clock wait: the test moves the clock at an actual response boundary.
test("an isolated operation cannot renew its deadline between advertisement and object fetch", async () => {
  const { remote, head } = repository(); allowIsolation(remote);
  const host = new Host(remote, TOKEN); let now = Date.now();
  const clock = vi.spyOn(Date, "now").mockImplementation(() => now);
  try {
    for (const boundary of ["response", "body"]) {
      let requests = 0, posts = 0, pulls = 0, cancels = 0, cancellationFinished = false, release!: () => void;
      const held = new Promise<void>(resolve => { release = resolve; });
      const source = new SmartHttpSource({ ...isolatedOptions, timeoutMs: 10_000, fetch: async request => {
        requests++; if (request.method === "POST") posts++;
        const response = await host.upstream(request), bytes = new Uint8Array(await response.arrayBuffer());
        const body = new ReadableStream<Uint8Array>({
          pull(controller) { pulls++; controller.enqueue(bytes); now += 10_001; },
          cancel() {
            cancels++;
            return held.then(() => { cancellationFinished = true; });
          },
        }, { highWaterMark: 0 });
        if (boundary === "response") now += 10_001;
        return new Response(body, { headers: response.headers });
      } });
      try {
        // response reaches the request boundary; body reaches the shared
        // beforeDeadline helper after reader.read(), before a timer fires.
        await expect(new Reader(source).commit(head)).rejects.toMatchObject({ reason: "unreadable", what: boundary === "response" ? "isolated read deadline" : "read deadline" });
        expect(pulls).toBe(boundary === "response" ? 0 : 1);
        expect(cancels).toBe(1);
        expect(cancellationFinished).toBe(false);
        for (const again of [() => source.object(head, maxBytes), () => source.ref(REF), () => source.refs("refs/heads/", 10)]) {
          await expect(again(), "A synchronous isolated deadline must permanently abandon the source").rejects.toMatchObject({ reason: "unreadable", what: "isolated source abandoned" });
        }
        expect(requests).toBe(1); expect(posts).toBe(0);
      } finally { release(); await held; }
      await expect(source.ref(REF)).rejects.toMatchObject({ what: "isolated source abandoned" });
      expect(requests).toBe(1);
    }
  } finally { clock.mockRestore(); }
});


// Both are standard streams whose cancellation work never settles. The
// fake clock advances the deadline; no wall-clock sleep or cleanup drain
// is inferred. One source may retain one abandoned operation, never more.
test("isolated deadlines return despite pending read/refusal cancellation and permanently refuse source reuse", async () => {
  const { remote, head } = repository(); allowIsolation(remote);
  const host = new Host(remote, TOKEN);
  const ad = await host.upstream(new Request("http://127.0.0.1/repo.git/info/refs?service=git-upload-pack", { headers: { authorization: `Bearer ${TOKEN}` } }));
  const advertisement = await ad.arrayBuffer();
  vi.useFakeTimers();
  try {
    for (const status of [403, 200]) {
      let requests = 0, cancels = 0, posted!: () => void, signal: AbortSignal | undefined;
      const began = new Promise<void>(resolve => { posted = resolve; });
      const never = new Promise<void>(() => undefined);
      const body = new ReadableStream<Uint8Array>({ pull: () => never, cancel: () => { cancels++; return never; } });
      const source = new SmartHttpSource({ ...isolatedOptions, timeoutMs: 100, fetch: async request => {
        requests++;
        if (request.method === "GET") return new Response(advertisement, { headers: ad.headers });
        signal = request.signal; posted();
        return new Response(body, { status, headers: { "content-type": "application/x-git-upload-pack-result" } });
      } });
      let settled = false;
      const outcome = source.object(head, maxBytes).then(() => "unexpected success", error => error).finally(() => { settled = true; });
      await began;
      await vi.advanceTimersByTimeAsync(101);
      expect(settled).toBe(true);
      expect(await outcome).toMatchObject({ reason: "unreadable", what: "isolated read deadline" });
      expect(cancels).toBe(1);
      expect(signal?.aborted).toBe(true);
      for (const again of [() => source.object(head, maxBytes), () => source.ref(REF), () => source.refs("refs/heads/", 10)]) {
        await expect(again()).rejects.toMatchObject({ reason: "unreadable", what: "isolated source abandoned" });
      }
      expect(requests).toBe(2); // no hidden retry, cache result or new reservation
    }
  } finally { vi.useRealTimers(); }
});

// A valid response may arrive after an upstream ignored abort. Cancellation
// may also finish late. Neither continuation restores the source's capacity.
test("isolated abandonment survives late fetch and cleanup settlement without consuming the late body", async () => {
  const { remote, head } = repository(); allowIsolation(remote);
  const host = new Host(remote, TOKEN);
  const ad = await host.upstream(new Request("http://127.0.0.1/repo.git/info/refs?service=git-upload-pack", { headers: { authorization: `Bearer ${TOKEN}` } }));
  const advertisement = await ad.arrayBuffer();
  const answer = new Uint8Array(await isolatedAnswer(onePack(remote, head)).arrayBuffer());
  vi.useFakeTimers();
  try {
    for (const late of ["fetch", "cleanup"]) {
      let requests = 0, pulls = 0, cancels = 0, posted!: () => void, release!: () => void;
      const began = new Promise<void>(resolve => { posted = resolve; });
      const held = new Promise<void>(resolve => { release = resolve; });
      const body = new ReadableStream<Uint8Array>({
        pull(controller) { pulls++; controller.enqueue(answer); controller.close(); },
        cancel() { cancels++; return held; },
      }, { highWaterMark: 0 });
      const source = new SmartHttpSource({ ...isolatedOptions, timeoutMs: 100, fetch: async request => {
        requests++;
        if (request.method === "GET") return new Response(advertisement, { headers: ad.headers });
        posted();
        if (late === "fetch") await held;
        return new Response(body, { status: late === "fetch" ? 200 : 403, headers: { "content-type": "application/x-git-upload-pack-result" } });
      } });
      let settled = false;
      const outcome = source.object(head, maxBytes).then(() => "unexpected success", error => error).finally(() => { settled = true; });
      await began;
      await vi.advanceTimersByTimeAsync(101);
      expect(settled).toBe(true);
      expect(await outcome).toMatchObject({ reason: "unreadable", what: "isolated read deadline" });
      release();
      await vi.advanceTimersByTimeAsync(0); // flush the actual late continuation
      expect(pulls).toBe(0);
      expect(cancels).toBe(1);
      for (const again of [() => source.object(head, maxBytes), () => source.ref(REF), () => source.refs("refs/heads/", 10)]) {
        await expect(again()).rejects.toMatchObject({ reason: "unreadable", what: "isolated source abandoned" });
      }
      expect(requests).toBe(2);
    }
  } finally { vi.useRealTimers(); }
});

const v2Options = { ...isolatedOptions, isolateObjects: { ownedBytes: 32 * isolatedWire, protocol: "v2" as const } };
const v2AdvertisementBytes = (capabilities = ["fetch=shallow filter"], lineEnding = "\n", service = false, serviceLF = "\n") => Buffer.concat([
  ...(service ? [pkt(`# service=git-upload-pack${serviceLF}`), Buffer.from("0000")] : []),
  pkt(`version 2${lineEnding}`), ...capabilities.map(line => pkt(`${line}${lineEnding}`)), Buffer.from("0000"),
]);
const v2Advertisement = (capabilities = ["fetch=shallow filter"], lineEnding = "\n", service = false, serviceLF = "\n") => new Response(v2AdvertisementBytes(capabilities, lineEnding, service, serviceLF), { headers: { "content-type": "application/x-git-upload-pack-advertisement" } });
const band = (channel: number, data: Uint8Array = new Uint8Array()) => {
  const size = data.length + 5;
  return Buffer.concat([Buffer.from(size.toString(16).padStart(4, "0")), Buffer.from([channel]), data]);
};
const v2Bytes = (pack: Uint8Array, before: readonly Uint8Array[] = [], lineEnding = "\n") => {
  const pieces = [...before, pkt(`packfile${lineEnding}`), band(1)]; // legal empty keepalive
  for (let at = 0; at < pack.length; at += 65515) pieces.push(band(1, pack.subarray(at, at + 65515)));
  return Buffer.concat([...pieces, Buffer.from("0000")]);
};
const v2Response = (body: Uint8Array) => new Response(body, { headers: { "content-type": "application/x-git-upload-pack-result" } });

// Actual Git, with filter enabled but v0 nonadvertised-want permissions
// explicitly disabled. This is a local boundary witness, not hosted support.
test("opt-in v2 fetch reads exact nonadvertised objects in two requests and keeps ref reads on v0", async () => {
  const remote = bare();
  git(remote, ["config", "uploadpack.allowFilter", "true"]);
  git(remote, ["config", "uploadpack.allowReachableSHA1InWant", "false"]);
  git(remote, ["config", "uploadpack.allowTipSHA1InWant", "false"]);
  const content = put(remote, "blob", "selected\n");
  const large = put(remote, "blob", "unrelated material\n".repeat(100_000));
  const root = put(remote, "tree", Buffer.concat([Buffer.from("100644 other\0"), Buffer.from(large, "hex"), Buffer.from("100755 selected\0"), Buffer.from(content, "hex")]));
  const first = put(remote, "commit", commitText(root, [], "root"));
  let head = first;
  for (let n = 0; n < 40; n++) head = put(remote, "commit", commitText(root, [head], `history ${n}`));
  setRef(remote, REF, head);
  const host = new Host(remote, TOKEN);
  const requests: { method: string; protocol: string | null; body: string }[] = [];
  const packs: { bytes: number; count: number }[] = [];
  const source = new SmartHttpSource({ ...v2Options, fetch: async request => {
    requests.push({ method: request.method, protocol: request.headers.get("git-protocol"), body: await request.clone().text() });
    const response = await host.upstream(request);
    if (request.method !== "POST") return response;
    const raw = Buffer.from(await response.arrayBuffer()), start = raw.indexOf("PACK");
    packs.push({ bytes: raw.length, count: start < 0 ? -1 : raw.readUInt32BE(start + 8) });
    return new Response(raw, { status: response.status, headers: response.headers });
  } });
  const reader = new Reader(source);
  expect(await reader.commit(head)).toMatchObject({ id: head, tree: root });
  expect((await reader.tree(root)).map(row => [new TextDecoder().decode(row.name), row.mode, row.id])).toEqual([["other", "100644", large], ["selected", "100755", content]]);
  expect(new TextDecoder().decode(await reader.blob(content))).toBe("selected\n");
  expect((await reader.commit(first)).parents).toEqual([]);
  expect(requests.map(row => [row.method, row.protocol])).toEqual(Array.from({ length: 4 }, () => [["GET", "version=2"], ["POST", "version=2"]]).flat());
  expect(requests.filter(row => row.method === "POST").map(row => row.body)).toEqual([head, root, content, first].map(id =>
    `${pkt("command=fetch\n").toString()}0001${pkt(`want ${id}\n`).toString()}${pkt("deepen 1\n").toString()}${pkt("filter blob:none\n").toString()}${pkt("no-progress\n").toString()}${pkt("done\n").toString()}0000`));
  // blob:none sends commit + tree, but a directly wanted tree/blob still
  // arrives. Reading the tree again above proves it was not cached as a
  // companion of the first commit response.
  expect(packs.map(row => row.count)).toEqual([2, 1, 1, 2]);
  expect(packs.reduce((bytes, row) => bytes + row.bytes, 0)).toBeLessThan(5000);
  expect(await source.ref(REF)).toBe(head);
  expect(await source.refs("refs/heads/", 2)).toEqual([{ ref: REF, target: head }]);
  expect(requests.slice(-2).map(row => [row.method, row.protocol])).toEqual([["GET", null], ["GET", null]]);
});

test("opt-in v2 requires its complete bounded capability advertisement without a POST or v0 fallback", async () => {
  const id = "a".repeat(40);
  const cases = [
    () => v2Advertisement(["fetch=shallow filter"], "\n\n"),
    () => v2Advertisement(["fetch=shallow filter\n"]),
    () => v2Advertisement(["fetch=shallow filter"], "\r\n"),
    () => v2Advertisement([]),
    () => v2Advertisement(["fetch=shallow"]),
    () => v2Advertisement(["fetch=filter"]),
    () => v2Advertisement(["fetch=shallow filter", "fetch=shallow filter"]),
    () => v2Advertisement(["fetch=shallow filter", "object-format=sha256"]),
    () => v2Advertisement(["fetch=shallow filter", "object-format=sha1", "object-format=sha1"]),
    () => v2Advertisement(["fetch=shallow filter", "bad key=value"]),
    () => new Response(Buffer.concat([pkt("# service=git-upload-pack\n"), Buffer.from("0000"), pkt(`${id} ${REF}\0shallow filter allow-reachable-sha1-in-want\n`), Buffer.from("0000")]), { headers: { "content-type": "application/x-git-upload-pack-advertisement" } }),
    () => new Response(Buffer.concat([pkt("version 2\n"), pkt("fetch=shallow filter\n"), Buffer.from("00000002")]), { headers: { "content-type": "application/x-git-upload-pack-advertisement" } }),
  ];
  const expectedDetails = [
    { subtype: "first-frame-version", firstFrame: "other" },
    { subtype: "capability-value-character", firstFrame: "version-2" },
    { subtype: "first-frame-version", firstFrame: "other" },
    undefined, undefined, undefined,
    { subtype: "duplicate-fetch", firstFrame: "version-2" }, undefined,
    { subtype: "duplicate-object-format", firstFrame: "version-2" },
    { subtype: "capability-name-character", firstFrame: "version-2" },
    { subtype: "post-preamble-version", firstFrame: "service-upload", postPreamble: "protocol-0-ref" },
    { subtype: "trailing-data", firstFrame: "version-2" },
  ];
  for (const [index, response] of cases.entries()) {
    let calls = 0;
    const source = new SmartHttpSource({ ...v2Options, fetch: request => {
      calls++; expect(request.method).toBe("GET"); expect(request.headers.get("git-protocol")).toBe("version=2");
      return Promise.resolve(response());
    } });
    const error = await source.object(id, 1024).then(() => undefined, error => error);
    expect(error).toBeInstanceOf(GitRefusal);
    expect(advertisementRefusalDetail(error)).toEqual(expectedDetails[index]);
    if (expectedDetails[index]) {
      expect(error).toMatchObject({ reason: "unreadable", what: index === 0 || index === 2 || index >= 10 ? "upload advertisement" : "upload capabilities" });
      expect(error.message).toBe(`${error.reason}: ${error.what}`);
      expect(Object.isFrozen(advertisementRefusalDetail(error))).toBe(true);
    }
    expect(calls).toBe(1);
  }
  // Exact preamble framing is accepted only before protocol2, never as a fallback.
  for (const bytes of [
    Buffer.concat([pkt("# service=git-upload-pack\n"), pkt("version 2\n"), Buffer.from("0000")]),
    Buffer.concat([pkt("# service=git-upload-pack\n"), Buffer.from("0001"), pkt("version 2\n"), Buffer.from("0000")]),
    Buffer.concat([pkt("# service=git-upload-pack\n"), Buffer.from("0000"), pkt("# service=git-upload-pack\n"), Buffer.from("0000")]),
    Buffer.concat([pkt("# service=git-upload-pack\n"), Buffer.from("0000")]),
    Buffer.concat([pkt("# service=git-upload-pack\n"), Buffer.from("0000"), Buffer.from("000evers")]),
  ]) {
    let calls=0;
    const source=new SmartHttpSource({...v2Options,fetch:request=>{calls++;expect(request.method).toBe("GET");return Promise.resolve(new Response(bytes,{headers:{"content-type":"application/x-git-upload-pack-advertisement"}}));}});
    await expect(source.object(id,1024)).rejects.toBeInstanceOf(GitRefusal);
    expect(calls).toBe(1);
  }
  let calls = 0;
  const bounded = new SmartHttpSource({ ...v2Options, bounds: { ...READ_BOUNDS, refs: 1 }, fetch: () => {
    calls++; return Promise.resolve(v2Advertisement(["a=one", "b=two", "c=three", "fetch=shallow filter"]));
  } });
  await expect(bounded.object(id, 1024)).rejects.toMatchObject({ reason: "too-large", what: "upload advertisement packets" });
  expect(calls).toBe(1);
});

test("opt-in v2 validates sections and binary sidebands before exact pack admission", async () => {
  const { remote, head, expected } = repository();
  const smallBlob = put(remote, "blob", "other\n");
  const single = onePack(remote, head), blob = onePack(remote, smallBlob);
  const run = (body: Uint8Array, id = head, limit = isolatedWire, lineEnding = "\n", service = false, serviceLF = "\n", closureObjects = READ_BOUNDS.closureObjects, maximumBytes = isolatedWire, reserveWork?: (bytes: number) => void) => {
    let calls = 0;
    const advertisement = v2AdvertisementBytes(["unknown=ignored", "unknown=also-ignored", "fetch=shallow filter", "object-format=sha1"], lineEnding, service, serviceLF);
    const source = new SmartHttpSource({ ...v2Options, maxBytes: maximumBytes, bounds: { ...READ_BOUNDS, closureObjects },
      isolateObjects: { ...v2Options.isolateObjects, ...(reserveWork === undefined ? {} : { reserveWork }) }, fetch: request => {
      calls++;
      return Promise.resolve(request.method === "GET" ? new Response(advertisement, { headers: { "content-type": "application/x-git-upload-pack-advertisement" } }) : v2Response(body));
    } });
    return { outcome: source.object(id, limit), calls: () => calls, wireBytes: advertisement.length + body.length };
  };
  // The same text packets are valid with or without their optional final LF.
  for (const lineEnding of ["\n", ""]) {
    for (const before of [[], [pkt(`shallow-info${lineEnding}`), Buffer.from("0001")], [pkt(`shallow-info${lineEnding}`), pkt(`shallow ${head}${lineEnding}`), Buffer.from("0001")]]) {
      const check = run(v2Bytes(single, before, lineEnding), head, isolatedWire, lineEnding);
      expect((await check.outcome).type).toBe("commit"); expect(check.calls()).toBe(2);
    }
  }
  for (const serviceLF of ["\n", ""]) {
    const prefixed=run(v2Bytes(single),head,isolatedWire,"\n",true,serviceLF);
    await expect(prefixed.outcome).resolves.toMatchObject({type:"commit"});expect(prefixed.calls()).toBe(2);
  }
  // Binary channels are split at arbitrary positions; progress is ignored,
  // including bytes that cannot be mistaken for another section or a pack.
  const split = Buffer.concat([pkt("packfile\n"), band(1), band(1, single.subarray(0, 7)), band(2, Buffer.from([255, 0, 10])), band(1, single.subarray(7)), Buffer.from("0000")]);
  expect((await run(split).outcome).type).toBe("commit");
  const corrupt = new Uint8Array(single); corrupt[corrupt.length - 1]! ^= 1;
  // Admission is synchronous and precedes even an invalid entry's parse
  // or inflation. The identical refusal escapes and the count is sent once.
  const invalidEntry = new Uint8Array(single); invalidEntry[12] = 0;
  const reservationRefusal = new GitRefusal("too-large", "TEST decoder metadata");
  const reserved: number[] = [];
  const denied = await decodePack(invalidEntry, { maxBytes, reserveObjects: count => { reserved.push(count); throw reservationRefusal; } }).then(() => undefined, error => error);
  expect(denied).toBe(reservationRefusal); expect(reserved).toEqual([1]);
  const invalidCompression = new Uint8Array(single);
  let compressedAt = 12, header = invalidCompression[compressedAt++]!;
  while ((header & 128) !== 0) header = invalidCompression[compressedAt++]!;
  invalidCompression[compressedAt] = 0; // invalid zlib header after a valid declared size
  const inflateRefusal = new Error("TEST declared inflation quota"), declared: number[] = [];
  const deniedInflation: unknown = await decodePack(invalidCompression, { maxBytes,
    reserveWork: bytes => { declared.push(bytes); throw inflateRefusal; },
  }).then(() => undefined, error => error);
  expect(deniedInflation).toBe(inflateRefusal);
  expect(declared).toEqual([expected.get(head)!.data.length]);
  // Wire admission crosses body/HTTP normalization with the same original
  // quota exception. A refused source never performs another object/ref read.
  const wireRefusal = new Error("TEST received wire quota");
  let wireCalls = 0, wireCancels = 0, wireCancellationFinished = false, releaseWire!: () => void;
  const wireCancellation = new Promise<void>(resolve => { releaseWire = resolve; });
  const wireSource = new SmartHttpSource({ ...v2Options, isolateObjects: { ...v2Options.isolateObjects,
    reserveWork: () => { throw wireRefusal; },
  }, fetch: request => {
    wireCalls++; expect(request.method).toBe("GET");
    return Promise.resolve(new Response(new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(v2AdvertisementBytes()); },
      cancel() { wireCancels++; return wireCancellation.then(() => { wireCancellationFinished = true; }); },
    }), { headers: { "content-type": "application/x-git-upload-pack-advertisement" } }));
  } });
  try {
    expect(await wireSource.object(head, isolatedWire).then(() => undefined, error => error)).toBe(wireRefusal);
    expect(wireCalls).toBe(1); expect(wireCancels).toBe(1);
    expect(wireCancellationFinished).toBe(false);
    await expect(wireSource.object(head, isolatedWire)).rejects.toMatchObject({ what: "isolated source abandoned" });
    await expect(wireSource.ref(REF)).rejects.toMatchObject({ what: "isolated source abandoned" });
    await expect(wireSource.refs("refs/heads/", 10)).rejects.toMatchObject({ what: "isolated source abandoned" });
    expect(wireCalls).toBe(1);
  } finally { releaseWire(); await wireCancellation; }

  const paired = new Uint8Array(execFileSync("git", ["-C", remote, "pack-objects", "--stdout"], {
    input: `${head}\n${smallBlob}\n`, maxBuffer: maxBytes,
    env: { PATH: process.env["PATH"] ?? "/usr/bin:/bin", GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" },
  }));
  // Companions are valid pack objects, not output or cache authority. The
  // caller's count and aggregate byte bounds still apply to the whole pack.
  expect((await decodePack(paired, { maxBytes })).map(object => object.id).sort()).toEqual([head, smallBlob].sort());
  const broken = [
    v2Bytes(single, [pkt("shallow-info\n\n"), Buffer.from("0001")]),
    v2Bytes(single, [pkt("shallow-info\n"), pkt(`shallow ${head}\n\n`), Buffer.from("0001")]),
    Buffer.concat([pkt("packfile\n\n"), band(1, single), Buffer.from("0000")]),
    Buffer.concat([pkt("acknowledgments\n"), pkt("NAK\n"), Buffer.from("0001"), v2Bytes(single)]),
    v2Bytes(single, [pkt("shallow-info\n"), pkt(`shallow ${"f".repeat(40)}\n`), Buffer.from("0001")]),
    v2Bytes(single, [pkt("shallow-info\n"), pkt(`shallow ${head}\n`), pkt(`shallow ${head}\n`), Buffer.from("0001")]),
    v2Bytes(single, [pkt("shallow-info\n"), pkt(`unshallow ${head}\n`), Buffer.from("0001")]),
    v2Bytes(single, [pkt("shallow-info\n")]),
    v2Bytes(single, [pkt("wanted-refs\n"), Buffer.from("0001")]),
    v2Bytes(single, [pkt("packfile-uris\n"), Buffer.from("0001")]),
    v2Bytes(single, [pkt("packfile\n")]),
    Buffer.concat([pkt("packfile\n"), single, Buffer.from("0000")]),
    Buffer.concat([pkt("packfile\n"), band(4, single), Buffer.from("0000")]),
    Buffer.concat([pkt("packfile\n"), band(3, Buffer.from(TOKEN)), Buffer.from("0000")]),
    v2Bytes(single).subarray(0, v2Bytes(single).length - 4),
    Buffer.concat([v2Bytes(single).subarray(0, v2Bytes(single).length - 4), Buffer.from("0002")]),
    Buffer.concat([v2Bytes(single), Buffer.from("0002")]),
    Buffer.concat([pkt("packfile\n"), Buffer.from("0004"), Buffer.from("0000")]),
    v2Bytes(corrupt),
  ];
  for (const body of broken) {
    const check = run(body);
    const error: unknown = await check.outcome.then(() => null, error => error);
    expect(error).toBeInstanceOf(GitRefusal);
    expect(String(error)).not.toContain(TOKEN);
    expect(check.calls()).toBe(2);
  }
  expect((await run(v2Bytes(paired)).outcome).type).toBe("commit");
  const companionBody = v2Bytes(paired), admitted: number[] = [];
  const measured = run(companionBody, head, isolatedWire, "\n", false, "\n", READ_BOUNDS.closureObjects, isolatedWire, bytes => { admitted.push(bytes); });
  await expect(measured.outcome).resolves.toMatchObject({ type: "commit" });
  const companionInflated = packEntries(paired).reduce((sum, entry) => sum + entry.bytes, 0);
  expect(admitted.reduce((sum, bytes) => sum + bytes, 0)).toBe(measured.wireBytes + companionInflated);
  // The wanted body fits; the extra valid companion must still spend work.
  const companionRefusal = new Error("TEST companion inflation quota");
  const workLimit = measured.wireBytes + expected.get(head)!.data.length;
  let spent = 0;
  const quota = run(companionBody, head, isolatedWire, "\n", false, "\n", READ_BOUNDS.closureObjects, isolatedWire, bytes => {
    spent += bytes; if (spent > workLimit) throw companionRefusal;
  });
  expect(await quota.outcome.then(() => undefined, error => error)).toBe(companionRefusal);
  expect(spent).toBeGreaterThan(workLimit); expect(quota.calls()).toBe(2);

  await expect(run(v2Bytes(paired), head, isolatedWire, "\n", false, "\n", 1).outcome).rejects.toMatchObject({ reason: "too-large", what: "pack objects" });
  const beforeWanted = await buildPack([{ id: smallBlob, type: "blob", data: new TextEncoder().encode("other\n") }, { id: head, ...expected.get(head)! }], { maxBytes });
  expect((await decodePack(beforeWanted, { maxBytes })).map(object => object.id)).toEqual([smallBlob, head]);
  // The shallow boundary describes the wanted commit, not the first entry.
  expect((await run(v2Bytes(beforeWanted, [pkt("shallow-info\n"), pkt(`shallow ${head}\n`), Buffer.from("0001")])).outcome).type).toBe("commit");
  const huge = put(remote, "blob", "x".repeat(isolatedWire));
  const inflated = new Uint8Array(execFileSync("git", ["-C", remote, "pack-objects", "--stdout"], {
    input: `${head}\n${huge}\n`, maxBuffer: maxBytes,
    env: { PATH: process.env["PATH"] ?? "/usr/bin:/bin", GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" },
  }));
  expect(inflated.length).toBeLessThan(isolatedWire);
  expect((await decodePack(inflated, { maxBytes })).map(object => object.id).sort()).toEqual([head, huge].sort());
  await expect(run(v2Bytes(inflated)).outcome).rejects.toMatchObject({ reason: "too-large", what: "inflated bytes" });
  // Full v2 decoding deliberately admits bounded OFS/REF deltas. The old
  // v0 exact-one non-delta reader above is unchanged.
  const deltaRemote = bare();
  const text = Array.from({ length: 200 }, (_, i) => `line-${i.toString().padStart(4, "0")} predictable material for Git delta compression\n`).join("");
  const baseBlob = put(deltaRemote, "blob", text), changedBlob = put(deltaRemote, "blob", text.replace("line-0100", "edit-0100"));
  const deltaTree = put(deltaRemote, "tree", Buffer.concat([Buffer.from("100644 a\0"), Buffer.from(baseBlob, "hex"), Buffer.from("100644 b\0"), Buffer.from(changedBlob, "hex")]));
  const deltaHead = put(deltaRemote, "commit", commitText(deltaTree, [], "bounded delta companions"));
  for (const ofs of [true, false]) {
    const bytes = pack(deltaRemote, deltaHead, ofs);
    expect(kinds(bytes)).toContain(ofs ? 6 : 7);
    const read = await run(v2Bytes(bytes), changedBlob).outcome;
    expect(read).toEqual({ type: "blob", size: Buffer.byteLength(text), data: new Uint8Array(Buffer.from(text.replace("line-0100", "edit-0100"))) });
    const body = v2Bytes(bytes), work: number[] = [];
    const counted = run(body, changedBlob, isolatedWire, "\n", false, "\n", READ_BOUNDS.closureObjects, isolatedWire, size => { work.push(size); });
    await expect(counted.outcome).resolves.toMatchObject({ type: "blob", size: Buffer.byteLength(text) });
    const rawInflated = packEntries(bytes).reduce((sum, entry) => sum + entry.bytes, 0);
    expect(work.reduce((sum, size) => sum + size, 0)).toBe(counted.wireBytes + rawInflated + Buffer.byteLength(text));
    const deltaRefusal = new Error("TEST reconstructed delta quota");
    let deltaWork = 0;
    const deniedDelta = run(body, changedBlob, isolatedWire, "\n", false, "\n", READ_BOUNDS.closureObjects, isolatedWire, size => {
      deltaWork += size; if (deltaWork > counted.wireBytes + rawInflated) throw deltaRefusal;
    });
    expect(await deniedDelta.outcome.then(() => undefined, error => error)).toBe(deltaRefusal);
    expect(deltaWork).toBe(counted.wireBytes + rawInflated + Buffer.byteLength(text));
    expect(deniedDelta.calls()).toBe(2);

    await expect(run(v2Bytes(bytes), changedBlob, isolatedWire, "\n", false, "\n", READ_BOUNDS.closureObjects, 16 * 1024).outcome).rejects.toMatchObject({ reason: "too-large", what: "delta result" });
  }
  await expect(run(v2Bytes(blob)).outcome).rejects.toMatchObject({ what: "wanted object omitted" });
  await expect(run(v2Bytes(blob, [pkt("shallow-info\n"), pkt(`shallow ${smallBlob}\n`), Buffer.from("0001")]), smallBlob).outcome).rejects.toMatchObject({ what: "isolated shallow object" });
  await expect(run(v2Bytes(single), head, 1).outcome).rejects.toMatchObject({ reason: "too-large", what: "isolated object allowance" });
  await expect(run(new Uint8Array(isolatedWire + 1)).outcome).rejects.toMatchObject({ reason: "too-large", what: "read bytes" });
  const tag = put(remote, "tag", `object ${head}\ntype commit\ntag example\ntagger Test <test@artroom.invalid> 1700000000 +0000\n\nTag.\n`);
  await expect(run(v2Bytes(onePack(remote, tag)), tag).outcome).rejects.toMatchObject({ reason: "wrong-type", what: "isolated pack entry" });
});

test("opt-in v2 retains one deadline and permanently abandons a late exact-object response", async () => {
  const id = "a".repeat(40);
  let calls = 0, posts = 0, cancels = 0, cancellationFinished = false, release!: () => void, now = Date.now();
  const held = new Promise<void>(resolve => { release = resolve; });
  const clock = vi.spyOn(Date, "now").mockImplementation(() => now);
  try {
    const source = new SmartHttpSource({ ...v2Options, timeoutMs: 10_000, fetch: request => {
      calls++;
      if (request.method === "POST") posts++;
      now += 10_001;
      const body = new ReadableStream<Uint8Array>({ cancel() { cancels++; return held.then(() => { cancellationFinished = true; }); } }, { highWaterMark: 0 });
      return Promise.resolve(new Response(body, { headers: { "content-type": "application/x-git-upload-pack-advertisement" } }));
    } });
    await expect(source.object(id, 1024)).rejects.toMatchObject({ reason: "unreadable", what: "isolated read deadline" });
    expect(cancels).toBe(1); expect(cancellationFinished).toBe(false);
    for (const again of [() => source.object(id, 1024), () => source.ref(REF), () => source.refs("refs/heads/", 10)]) {
      await expect(again()).rejects.toMatchObject({ what: "isolated source abandoned" });
    }
    expect(calls).toBe(1);
    expect(posts).toBe(0);
  } finally { release(); await held; clock.mockRestore(); }
  vi.useFakeTimers();
  try {
    let calls = 0, pulls = 0, cancels = 0, posted!: () => void, release!: () => void;
    const began = new Promise<void>(resolve => { posted = resolve; });
    const held = new Promise<void>(resolve => { release = resolve; });
    const body = new ReadableStream<Uint8Array>({ pull() { pulls++; }, cancel() { cancels++; } }, { highWaterMark: 0 });
    const source = new SmartHttpSource({ ...v2Options, timeoutMs: 100, fetch: async request => {
      calls++;
      if (request.method === "GET") return v2Advertisement();
      posted(); await held; return new Response(body, { headers: { "content-type": "application/x-git-upload-pack-result" } });
    } });
    const outcome = source.object(id, 1024).then(() => null, (error: unknown) => error);
    await began; await vi.advanceTimersByTimeAsync(101);
    expect(await outcome).toMatchObject({ what: "isolated read deadline" });
    release(); await vi.advanceTimersByTimeAsync(0);
    expect(pulls).toBe(0); expect(cancels).toBe(1);
    await expect(source.object(id, 1024)).rejects.toMatchObject({ what: "isolated source abandoned" });
    expect(calls).toBe(2);
  } finally { vi.useRealTimers(); }
});

// All responses are explicit stand-ins; no hosted status or media is inferred.
test("HTTP response refusal preserves only bounded categories and cancels before reading", async () => {
  const { head } = repository();
  const secret = "TEST response credential URL header body sentinel";
  for (const specimen of [
    { status: 201, media: "application/x-git-upload-pack-result", statusClass: "2xx-other", mediaType: "upload-pack-result" },
    { status: 200, media: "Application/X-Git-Upload-Pack-Result", statusClass: "200", mediaType: "upload-pack-result-case" },
    { status: 302, media: "text/plain", statusClass: "3xx", mediaType: "text/plain" },
    { status: 403, media: "text/html", statusClass: "4xx", mediaType: "text/html" },
    { status: 400, media: "text/plain", statusClass: "4xx", mediaType: "text/plain", body: "Unsupported Git fetch filter; only blob:none is supported." },
    { status: 401, media: "text/plain", statusClass: "4xx", mediaType: "text/plain" },
    { status: 403, media: "text/plain", statusClass: "4xx", mediaType: "text/plain" },
    { status: 404, media: "text/plain", statusClass: "4xx", mediaType: "text/plain" },
    { status: 411, media: "text/plain", statusClass: "4xx", mediaType: "text/plain" },
    { status: 415, media: "text/plain", statusClass: "4xx", mediaType: "text/plain" },
    { status: 503, media: "application/json", statusClass: "5xx", mediaType: "application/json" },
    { status: 200, media: "application/x-git-upload-pack-result", statusClass: "200", mediaType: "upload-pack-result", redirected: true },
    { status: 200, media: "application/x-git-upload-pack-result", statusClass: "200", mediaType: "upload-pack-result", changed: true },
    { status: 200, media: null, statusClass: "200", mediaType: "missing" },
    { status: 200, media: secret, statusClass: "200", mediaType: "other" },
    { status: 200, media: "x".repeat(300), statusClass: "200", mediaType: "unclassified-long" },
  ] as const) {
    let calls = 0, reads = 0, cancels = 0;
    const source = new SmartHttpSource({ ...v2Options, fetch: async request => {
      calls++;
      if (request.method === "GET") return v2Advertisement();
      expect(request.method).toBe("POST"); expect(request.headers.get("git-protocol")).toBe("version=2");
      const body = new ReadableStream<Uint8Array>({ start(controller) { if ("body" in specimen) controller.enqueue(new TextEncoder().encode(specimen.body)); }, pull() { reads++; }, cancel() { cancels++; } }, { highWaterMark: 0 });
      const response = new Response(body, { status: specimen.status, headers: specimen.media === null ? {} : { "content-type": specimen.media } });
      if ("redirected" in specimen) Object.defineProperty(response, "redirected", { value: true });
      if ("changed" in specimen) Object.defineProperty(response, "url", { value: "https://response.invalid/" + secret });
      return response;
    } });
    const error = await source.object(head, isolatedWire).then(() => undefined, error => error);
    expect(error).toMatchObject({ reason: "unreadable", what: "HTTP read response", message: "unreadable: HTTP read response" });
    const detail = httpResponseRefusalDetail(error);
    expect(detail, "Every HTTP response refusal must retain its exact status and fixed categories").toEqual({ status: specimen.status, statusClass: specimen.statusClass, redirected: "redirected" in specimen, url: "changed" in specimen ? "changed" : "empty", mediaType: specimen.mediaType });
    expect(Object.isFrozen(detail)).toBe(true); expect(Object.keys(detail!).sort()).toEqual(["mediaType", "redirected", "status", "statusClass", "url"]);
    expect(JSON.stringify(detail)).not.toContain(secret); expect(JSON.stringify(detail)).not.toContain("Unsupported Git fetch filter");
    expect(String(error)).not.toContain("Unsupported Git fetch filter"); expect([calls, reads, cancels]).toEqual([2, 0, 1]);
  }
  // Non-native numeric metadata cannot widen the retained finite status field.
  for (const status of [NaN, Infinity, -1, 600, 200.5]) {
    let calls = 0, reads = 0, cancels = 0;
    const source = new SmartHttpSource({ ...v2Options, fetch: async request => {
      calls++;
      if (request.method === "GET") return v2Advertisement();
      const body = new ReadableStream<Uint8Array>({ pull() { reads++; }, cancel() { cancels++; } }, { highWaterMark: 0 });
      const response = new Response(body, { status: 503 });
      Object.defineProperty(response, "status", { value: status });
      return response;
    } });
    const error = await source.object(head, isolatedWire).then(() => undefined, error => error);
    expect(error).toMatchObject({ reason: "unreadable", what: "HTTP read response", message: "unreadable: HTTP read response" });
    expect(httpResponseRefusalDetail(error)).toBeUndefined();
    expect([calls, reads, cancels]).toEqual([2, 0, 1]);
  }
  // An early status refusal must still cancel when extra diagnostic metadata throws.
  let calls = 0, reads = 0, cancels = 0;
  const source = new SmartHttpSource({ ...v2Options, fetch: async request => {
    calls++;
    if (request.method === "GET") return v2Advertisement();
    const body = new ReadableStream<Uint8Array>({ pull() { reads++; }, cancel() { cancels++; } }, { highWaterMark: 0 });
    const response = new Response(body, { status: 503 });
    Object.defineProperty(response, "headers", { get() { throw new Error(secret); } });
    return response;
  } });
  const error = await source.object(head, isolatedWire).then(() => undefined, error => error);
  expect(error).toBeInstanceOf(GitRefusal);
  expect(error).toMatchObject({ reason: "unreadable", what: "HTTP read response", message: "unreadable: HTTP read response" });
  expect(httpResponseRefusalDetail(error)).toBeUndefined();
  expect([calls, reads, cancels]).toEqual([2, 0, 1]);
  expect(httpResponseRefusalDetail(new Error(secret))).toBeUndefined();
});
