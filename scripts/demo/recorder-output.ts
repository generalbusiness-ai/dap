// Read the record that a recorder test prints. Two recorders print one: `apps/room/page/test/record.scope.test.ts` for
// `apps/room/page/test/screens.mjs`, and `apps/room/lanes/test/demo.scope.test.ts` for `scripts/demo-captures.ts`.
//
// A recorder prints base64url lines, `<NAME> <n> <text>`, then `<NAME> end <lines> <sha256 of the text>`. The record holds fixture
// signing keys, and a child-process error holds the recorder's whole stdout. So no message here quotes the record or the stdout.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join } from "node:path";

/** Run one recorder test in the `scope-stories` project, and answer its stdout. */
export function recorderLog(root: string, target: string, env: Record<string, string>): string {
  try {
    return execFileSync(process.execPath, [join(root, "node_modules/vitest/vitest.mjs"), "run", "--project", "scope-stories", target, "--silent=false", "--reporter=verbose"], {
      cwd: root, env: { ...process.env, ...env }, encoding: "utf8", maxBuffer: 256 * 1024 * 1024,
    });
  } catch (error) {
    const status = (error as { status?: number }).status;
    throw new Error(`The recorder ${target} failed (exit ${status ?? "unknown"}), and this message withholds its output. Run the test by hand to read the failure.`);
  }
}

/** The record in a recorder's stdout. Vitest may colour its log, so a colour code can stand before the first line. */
export function recordFrom(log: string, name: string): unknown {
  const plain = log.replace(/\u001b\[[0-9;]*m/g, "");
  const lines = [...plain.matchAll(new RegExp(`^${name} (\\d+) (\\S+)$`, "gm"))].map(match => ({ n: Number(match[1]), text: match[2]! }));
  const end = new RegExp(`^${name} end (\\d+) (sha256:[0-9a-f]{64})$`, "m").exec(plain);
  if (!end) throw new Error(`The recorder printed ${lines.length} ${name} lines and no end line.`);
  const count = Number(end[1]);
  if (lines.length !== count || new Set(lines.map(line => line.n)).size !== count || lines.some(line => line.n >= count)) throw new Error(`The recorder's end line names ${count} ${name} lines, and ${lines.length} whole lines arrived.`);
  const text = lines.sort((a, b) => a.n - b.n).map(line => line.text).join("");
  if (`sha256:${createHash("sha256").update(text).digest("hex")}` !== end[2]) throw new Error(`The ${name} lines do not match the digest on the end line.`);
  try { return JSON.parse(Buffer.from(text, "base64url").toString("utf8")); }
  catch { throw new Error(`The ${name} text passes its digest and is not JSON.`); }
}
