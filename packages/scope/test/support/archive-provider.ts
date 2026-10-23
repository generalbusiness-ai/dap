/** Scripted repository/token/HTTP peer. Incremental SHA-1 sends run the
 * production copy/validator/pack code; no external host or credential runs. */
import { expect } from "vitest";
import type { ScopeRef, Timestamp } from "@generalbusiness/dap-contract";
import { timeMs, timeOf, utf8 } from "@generalbusiness/dap-bytes";
import { journalRef, type JournalFormat, type JournalObject } from "@generalbusiness/dap-git/journal";
import type { ArchiveCredential, FixtureArchiveProvider, ArchiveSend } from "../../src/archive-driver.ts";
import { sendArchiveAppend } from "../../src/archive-send.ts";

export function archiveHostGate() { let release!: () => void; const promise = new Promise<void>(resolve => { release = resolve; }); return { promise, release }; }
export class ScriptedArchiveHost implements FixtureArchiveProvider {
  readonly fixture = "archive-provider";
  readonly data = new Map<string, JournalObject>();
  readonly sends: string[] = [];
  readonly tokens = new WeakMap<ArchiveCredential, ScopeRef>();
  readonly started = archiveHostGate();
  formatName: JournalFormat;
  pointer: string | null = null;
  missingMint = false;
  loseReply = false;
  mintCalls = 0;
  targets = 0;
  revoked = 0;
  closureReads = 0;
  appendCalls = 0;
  objectReads: string[] = [];
  blocked: ReturnType<typeof archiveHostGate> | null = null;
  lastAllowed: (() => boolean) | null = null;
  constructor(format: JournalFormat, readonly clock: () => Timestamp) { this.formatName = format; }
  async format() { return this.formatName; }
  async ref() { return this.pointer; }
  async objects() { this.closureReads++; return [...this.data.values()]; }
  async readObject(_repository: unknown, requested: { id: string; type: JournalObject["type"]; maximum: number }, allowed: () => boolean) {
    expect(allowed()).toBe(true); this.objectReads.push(requested.id);
    const object = this.data.get(requested.id);
    return object ? { type: object.type, size: object.data.length, data: object.data.length <= requested.maximum ? new Uint8Array(object.data) : null } : null;
  }
  async mintArchive(_repository: unknown, at: ScopeRef, allowed: () => boolean) {
    expect(allowed()).toBe(true); this.mintCalls++;
    if (this.missingMint) { this.missingMint = false; return null; }
    const credential = Object.freeze({ id: `fixture-${this.mintCalls}`, ends: timeOf(timeMs(this.clock())! + 3_600_000), plaintext: "TEST ARCHIVE TOKEN" });
    this.tokens.set(credential, { ...at }); return credential;
  }
  async sendArchive(request: ArchiveSend) {
    this.lastAllowed = request.allowed; this.started.release();
    await this.blocked?.promise;
    if (!request.allowed()) return null;
    // A stand-in's guard is not evidence of the actual provider adapter.
    expect(request.ref).toBe(journalRef(request.at.scope));
    expect(this.tokens.get(request.credential)).toEqual(request.at);
    if (request.old !== this.pointer) return { send: "refused" };
    const publish = () => {
      for (const object of request.objects) this.data.set(object.id, { ...object, data: new Uint8Array(object.data) });
      this.pointer = request.commit; this.sends.push(request.commit);
    };
    if (request.incremental && this.formatName === "sha1") {
      this.appendCalls++;
      const packet = (line: string) => `${(utf8(line).length + 4).toString(16).padStart(4, "0")}${line}`;
      // Actual production copy/hash/append-validator/pack/HTTP send code.
      // HTTP advertisements and acceptance remain explicit stand-ins.
      const result = await sendArchiveAppend(request, { remote: "https://archive.invalid/fixture.git", maxBytes: 8 * 1024 * 1024,
        fetch: async http => {
          if (http.method === "POST") {
            expect(http.url).toBe("https://archive.invalid/fixture.git/git-receive-pack");
            expect((await http.arrayBuffer()).byteLength).toBeGreaterThan(0); publish();
            return new Response(`${packet("unpack ok\n")}${packet(`ok ${request.ref}\n`)}0000`, { headers: { "content-type": "application/x-git-receive-pack-result" } });
          }
          expect(http.url).toBe("https://archive.invalid/fixture.git/info/refs?service=git-receive-pack");
          return new Response(`${packet("# service=git-receive-pack\n")}0000${packet(`${this.pointer} ${request.ref}\0report-status\n`)}0000`, { headers: { "content-type": "application/x-git-receive-pack-advertisement" } });
        },
      }, async () => this.pointer);
      return this.loseReply ? null : result;
    }
    publish(); return this.loseReply ? null : { send: "accepted" };
  }
  async revokeArchive(credential: ArchiveCredential) { this.tokens.delete(credential); this.revoked++; }
}
