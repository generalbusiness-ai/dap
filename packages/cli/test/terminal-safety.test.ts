import { expect, test } from "vitest";
import { base32, textDigest } from "@generalbusiness/dap-bytes";
import { credentialRemote } from "../src/archive-remote.ts";
import { command } from "../src/line.ts";
import { memoryStore } from "../src/store.ts";
import { shownJson, shownText } from "../src/shown-text.ts";

// The input stays unchanged; every displayed control uses the Git path rule.
test("terminal text escapes C0, DEL, C1, bidi, line separators and backslashes without changing ordinary text", () => {
  const text = "plain café\n\t\u001b\u007f\u0085\u061c\u200e\u200f\u2028\u2029\u202e\u2066\u2069\\end";
  expect(shownText(text)).toBe("plain café\\x0a\\x09\\x1b\\x7f\\u0085\\u061c\\u200e\\u200f\\u2028\\u2029\\u202e\\u2066\\u2069\\x5cend");
  expect(shownJson(JSON.stringify({ text: "normal\nline\u0085" }))).toBe('{"text":"normal\\nline\\u0085"}');
});

// A scripted HTTP stand-in supplies the actual CLI issue rows; no scope judges them.
test("issues renders member-authored title and reason as one safe line", async () => {
  const id = (n: number) => `sc_${base32(new Uint8Array(32).fill(n))}` as const;
  const ref = (n: number) => ({ scope: id(n), genesis: textDigest(`fixture ${n}`) });
  const directory = ref(1), membership = ref(2), lane = ref(3), head = { seq: 1, hash: textDigest("fixture head") };
  const store = memoryStore(); await store.keep("device", new Uint8Array(32).fill(7));
  await store.save({ v: 2, service: "https://service.test", key: "device", repository: { directory, membership, rules: id(4), destination: id(5) } });
  const item = (id: number, type: string, state: string, values: object, refs: object = {}) => ({ id, type, state, revision: 1, opened: null, attributed: [], parties: {}, refs, values });
  const fetch = async (url: string) => {
    const path = new URL(url).pathname;
    if (path.endsWith('/sessions')) return Response.json({ ok: false, reason: 'sessions-unavailable' });
    const isDirectory = path.endsWith(directory.scope);
    const value = { scope: isDirectory ? directory : lane, definition: 'platform:membership@2', status: 'active', time: '2026-10-07T12:00:00Z', counts: [], items: isDirectory
      ? [item(1, 'lane', 'open', { kind: 'issue', number: 1 }, { scope: lane })]
      : [item(0, 'intent', 'closed', { number: 1, title: 'A\nB\u0085', closeReason: 'done\u202e' })] };
    return Response.json({ ok: true, at: head, complete: true, value });
  };
  const result = await command({ store, fetch, now: () => Date.parse('2026-10-07T12:00:00Z') }, ['issues']);
  expect(result.code).toBe(0); expect(result.lines[0]).toContain('closed (done\\u202e)  A\\x0aB\\u0085');
  expect(result.lines[0]).not.toMatch(/[\n\u0085\u202e]/);
});

// Only the recorded repository can receive a credential; no URL or token is sent in this test.
test("a credential remote must match its recorded repository and cannot contain its token", () => {
  const artifacts = { host: 'artifacts', namespace: 'demo', name: 'room' }, github = { ...artifacts, host: 'github.com' };
  expect(credentialRemote('https://host.test/git/demo/room.git', artifacts, ['token'])).toBe(true);
  expect(credentialRemote('https://github.com/demo/room.git', github, ['token'])).toBe(true);
  for (const value of ['https://host.test/git/demo/other.git', 'https://host.test/git/other/room.git', 'http://host.test/git/demo/room.git', 'https://host.test/git/demo/room.git?token=token', 'https://host.test/git/demo/token.git'])
    expect(credentialRemote(value, artifacts, ['token'])).toBe(false);
  expect(credentialRemote('https://example.test/demo/room.git', github, ['token'])).toBe(false);
  expect(credentialRemote('https://host.test/git/demo/room.git', { ...artifacts, host: 'other' }, ['token'])).toBe(false);
});

// The post-credential boundary uses stand-in storage and Git; refusal cannot save, print or send the credential.
test("a mismatched consumed credential cannot reach storage or Git, while the recorded remote can", async () => {
  const { finishCredentialClone } = await import("../src/command-repository.ts");
  const store = memoryStore(), gitCalls: string[][] = [];
  const scope = `sc_${base32(new Uint8Array(32).fill(9))}` as const;
  const config = { v: 2 as const, service: 'https://service.test', key: 'device' };
  await store.save(config);
  const ctx = { store, git: { run: async (args: string[]) => { gitCalls.push(args); return 0; } } };
  const repository = { host: 'artifacts', namespace: 'demo', name: 'room', id: 'r' };
  const credential = { token: 'TEST-secret', ends: '2099-01-01T00:00:00Z', remote: 'https://host.test/git/demo/other.git' };
  const rejected = await finishCredentialClone(ctx, config, repository, credential, scope, 1, 'copy', {});
  expect(rejected.code).toBe(1); expect(rejected.lines.join(' ')).toContain('may have been consumed');
  expect(JSON.stringify(rejected)).not.toContain(credential.token); expect(gitCalls).toEqual([]); expect(await store.config()).toEqual(config);
  const accepted = await finishCredentialClone(ctx, config, repository, { ...credential, remote: 'https://host.test/git/demo/room.git' }, scope, 1, 'copy', {});
  expect(accepted.code).toBe(0); expect(gitCalls).toEqual([['clone', '--', 'https://host.test/git/demo/room.git', 'copy']]);
});
