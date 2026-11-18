/**
 * U3: `dap application upgrade` files one `upgrade-application` act on installation N, in place or with `--replace`, and refuses
 * before it signs. Real: the command line, the client's upgrade request and custody, the public HTTPS Git reader, and the Native
 * judges of Register 29, Directory 28, Membership 14 and Rules 16 with Counter 1 active as N (platform/test/support-upgrade.ts).
 * STAND-IN: the scope routes and the read session answer from those in-memory scopes in this process; the host's fetch answers
 * and the act's grant are labelled fixtures; the Git host is ../../mcp/test/support/install-room.ts.
 */
import { expect, test } from "vitest";
import type { Answer, Item, ItemQueryRead, SignedIntent, SignedSessionRequest } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, itemQueryArgument, itemQueryDigest, readItemQueryParameter, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import { memoryStore as custodyStore, type Fetch } from "@generalbusiness/dap-client";
import { applicationScreenPath } from "@generalbusiness/dap-client/application";
import { resolvedEntryEffects } from "@generalbusiness/dap-derive";
import { grantOf, keys } from "@generalbusiness/dap-derive/testing";
import { counter, room, type Release } from "../../platform/test/support-upgrade.ts";
import { gitPackages } from "../../mcp/test/support/install-room.ts";
import { receiptOf } from "../../scope/src/core.ts";
import { command, memoryStore, type Context } from "../src/index.ts";
import { applicationCommands } from "../src/application-install-runtime.ts";

const SERVICE = "https://u3-upgrade.test";
const NOTHING = "This command signed and sent nothing.";

/** A room of the upgrade family with Counter 1 active as N, three later releases at a Git host, and the `dap` command. */
async function upgradeRoom() {
  const graph = await room(), { D, M, A, G, N } = graph;
  // `inPlace` and `later` keep Counter 1's semantic identifier and change the page; `changed` changes the semantic identifier.
  const inPlace = await counter("2", { page: "TkVYVA" }), changed = await counter("3", { member: ["counting.fulfill", "counting.participate"] }), later = await counter("4", { page: "TEFURVI" });
  const releases = [inPlace, changed, later], host = gitPackages(releases.map(release => release.packet.bytes));
  const uri = (release: Release) => host.uris[releases.indexOf(release)]!;
  const trusted = (...listed: Release[]) => JSON.stringify(listed.map(release => ({ release: release.packet.ids.release, publisher: release.packet.package.release.manifest.publisher, host: "git.example" })));
  const installer = { ...keys.rita, member: { membership: M.at, member: "@rita" as const } };
  const grants = [{ grant: grantOf(installer, A.at, ["application.install"]), current: true }];
  const posts: SignedIntent[] = [];
  const page = (body: unknown) => new Response(canonicalize(body as never)); // The client admits only a canonical item query reply.
  const fetch: Fetch = async (url, init) => {
    const u = new URL(url), path = u.pathname, method = init?.method ?? "GET";
    if (method === "POST" && path === `/v1/scopes/${M.at.scope}/sessions`) {
      const asked = JSON.parse(init!.body!) as SignedSessionRequest;
      return Response.json({ ok: true, token: b64url(new Uint8Array(32).fill(85)), session: { v: 1, deployment: "TEST U3 session route", membership: M.at,
        member: "@rita", key: asked.request.actor, reads: ["summary", "entry", "log", "query-items"], ends: asked.request.notAfter } });
    }
    if (method === "POST" && path === `/v1/scopes/${A.at.scope}/acts`) {
      const sent = JSON.parse(init!.body!) as { signed: SignedIntent; values?: readonly string[]; texts?: readonly string[] };
      posts.push(sent.signed);
      const texts = new Map<string, number>((sent.texts ?? []).map(text => [textDigest(text), utf8(text).length] as const));
      const judged = A.submit(sent.signed, { platform: A.authority, membership: M.at, grants, values: sent.values, texts: digest => texts.get(digest) });
      if (judged.result === "refused") return Response.json({ answer: "refused", reason: judged.reason, ...(judged.name ? { name: judged.name } : {}), judgedAt: judged.judgedAt } satisfies Answer);
      if (judged.result !== "write") throw Error(`TEST: unexpected judgment ${JSON.stringify(judged)}`);
      const sealed = A.entries.at(-1)!;
      return Response.json({ answer: "accepted", receipt: receiptOf(sealed, A.named, A.at, resolvedEntryEffects(A.state, A.definition, sealed.entry, A.at)) } satisfies Answer);
    }
    const node = [D, A].find(one => path === `/v1/scopes/${one.at.scope}`);
    if (method === "GET" && node) {
      const snapshot = node.state.all();
      return Response.json({ ok: true, at: node.head, complete: true, value: { scope: node.at, status: node.state.scope()!.status,
        definition: node.named, time: node.last.time, items: snapshot.items, counts: snapshot.counts } });
    }
    if (method === "GET" && path === `/v1/scopes/${A.at.scope}/query-items`) {
      const query = readItemQueryParameter(u.searchParams.get("q"))!;
      const items = Array.from({ length: A.head.seq + 1 }, (_, id) => A.state.item(id))
        .filter((item): item is Item => item !== null && item.type === query.type && query.states.includes(item.state) && (query.ids === null || query.ids.includes(item.id)));
      return page({ ok: true, at: A.head, complete: true, value: { v: 1, scope: A.at, query: itemQueryDigest(query)!, argument: itemQueryArgument(query)!, items } } satisfies ItemQueryRead);
    }
    if (method === "GET" && path === `/v1/scopes/${A.at.scope}/log`) {
      const from = Number(u.searchParams.get("cursor") ?? "0");
      return Response.json({ ok: true, at: A.head, complete: true, value: { scope: A.at, definition: A.named,
        entries: A.entries.slice(from).map(({ entry, hash }) => ({ seq: entry.seq, hash, bytes: canonicalize(entry) })) } });
    }
    const entry = new RegExp(`^/v1/scopes/${A.at.scope}/entries/([0-9]+)$`).exec(path);
    if (method === "GET" && entry) return Response.json({ ok: true, at: A.head, complete: true, value: A.entries[Number(entry[1])] });
    throw Error(`TEST: unexpected route ${method} ${path}`);
  };
  /** One `dap` command under this room's configuration, with APPLICATION_TRUST set to `trust`. */
  const dap = async (argv: readonly string[], trust: string) => {
    const store = memoryStore();
    await store.keep("operator", keys.rita.secret);
    await store.save({ v: 2, key: "operator", service: SERVICE, repository: { directory: D.at, membership: M.at, rules: A.at.scope, destination: G.at.scope } });
    const ctx: Context = { store, fetch, now: () => Date.parse(A.last.time) };
    ctx.applicationCommand = applicationCommands(ctx, custodyStore(), host.applicationFetch, trust);
    return command(ctx, argv);
  };
  const upgrade = (release: Release, request: string, ...more: string[]) =>
    ["application", "upgrade", String(N), uri(release), "--release", release.packet.ids.release, "--request", request, ...more];
  return { ...graph, inPlace, changed, later, uri, trusted, posts, host, dap, upgrade };
}

test("dap application upgrade moves N in place: one act on N with no roles or values, and N takes the release at the host's answer", async () => {
  const { A, D, N, inPlace, uri, trusted, dap, upgrade } = await upgradeRoom();
  const upgraded = await dap(upgrade(inPlace, "TEST-u3-in-place"), trusted(inPlace));
  const act = A.head.seq;
  expect(upgraded).toEqual({ code: 0, lines: [`Upgrade request recorded: act ${act} moves item ${N} in place.`, `Read its result with: dap application ${N}`,
    "Acceptance records the request. The native fetch may still be pending or refused."] });
  const input = A.entries[act]!.entry.input;
  expect(input.type === "act" && input.signed.intent).toMatchObject({ kind: "upgrade-application", on: N, idempotencyKey: "TEST-u3-in-place",
    fields: { uri: uri(inPlace), release: inPlace.packet.ids.release, semantic: inPlace.packet.ids.semantic } });
  expect(input.type === "act" && Object.keys(input.signed.intent.fields).filter(name => ["roles", "values", "owner"].includes(name))).toEqual([]);
  A.outcome(`${act}:0`, { ...inPlace.answer, uri: uri(inPlace) });
  expect(await dap(["application", String(N)], trusted(inPlace))).toMatchObject({ code: 0, lines: [`Application install ${N}: active (creation).`,
    `Screen: ${SERVICE}${applicationScreenPath(D.at.scope, N, inPlace.packet.ids.presentation)}`] });
});

test("red (pending): an open upgrade of N refuses application-upgrade-pending in one line, and the command signs and sends nothing", async () => {
  const { A, N, inPlace, later, uri, trusted, posts, dap, upgrade } = await upgradeRoom();
  // An in-place act on N whose fetch has no answer yet.
  expect((await dap(upgrade(inPlace, "TEST-u3-first"), trusted(inPlace, later))).code).toBe(0);
  const act = A.head.seq, sent = posts.length;
  const pending = await dap(upgrade(later, "TEST-u3-second"), trusted(inPlace, later));
  expect(pending).toEqual({ code: 1, lines: [`Item ${N} has an open upgrade (application-upgrade-pending). Read it with dap application ${N}, and try again after it ends. ${NOTHING}`] });
  expect([posts.length, A.head.seq]).toEqual([sent, act]);
  // Control: the host's answer settles the fetch, and the next upgrade goes.
  A.outcome(`${act}:0`, { ...inPlace.answer, uri: uri(inPlace) });
  expect((await dap(upgrade(later, "TEST-u3-third"), trusted(inPlace, later))).code).toBe(0);
  expect(posts).toHaveLength(sent + 1);
});

test("red (semantic): a release that changes N's semantic identifier refuses in place before signing; with --replace it opens a successor", async () => {
  const { A, N, inPlace, changed, trusted, posts, dap, upgrade } = await upgradeRoom();
  const before = A.head.seq;
  const refused = await dap(upgrade(changed, "TEST-u3-semantic"), trusted(changed));
  expect(refused).toEqual({ code: 1, lines: [`This release changes the semantic identifier of item ${N}, so it cannot upgrade in place. Add --replace to open a successor installation. ${NOTHING}`] });
  expect([posts.length, A.head.seq]).toEqual([0, before]);
  // --replace on a release that keeps the identifier refuses too: the form must match the release.
  expect(await dap(upgrade(inPlace, "TEST-u3-kept", "--replace"), trusted(inPlace))).toEqual({ code: 1,
    lines: [`This release keeps the semantic identifier of item ${N}. Remove --replace to upgrade it in place. ${NOTHING}`] });
  expect(posts).toHaveLength(0);
  // Control: the replace form opens a pending successor that names N.
  const replaced = await dap(upgrade(changed, "TEST-u3-replace", "--replace", "--role", "member", "--values", '{"target":7}'), trusted(changed));
  const successor = A.head.seq;
  expect(replaced).toEqual({ code: 0, lines: [`Upgrade request recorded: act ${successor} opens item ${successor} to replace item ${N}.`, `Read its result with: dap application ${successor}`,
    `Acceptance records the request. Native fetch, admission, grants and creation may still be pending or refused. Item ${N} stays active until item ${successor} is active.`] });
  expect(A.item(successor)).toMatchObject({ type: "installation", state: "pending", refs: { replaces: N }, values: { release: changed.packet.ids.release } });
  expect(A.item(N).state).toBe("active");
});

test("red (trust): a release that APPLICATION_TRUST does not list refuses before the package fetch, the signature and the send", async () => {
  const { A, inPlace, later, trusted, posts, host, dap, upgrade } = await upgradeRoom();
  const before = A.head.seq, wanted = host.wants.length;
  const refused = await dap(upgrade(inPlace, "TEST-u3-untrusted"), trusted(later));
  expect(refused).toEqual({ code: 1, lines: ["APPLICATION_TRUST does not list this release and Git host. This command fetched, signed and sent nothing."] });
  expect([posts.length, A.head.seq, host.wants.length]).toEqual([0, before, wanted]);
});
