// Invariant: a recorder's record reaches its script whole, or the script stops by name. The message never quotes the record.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { recordFrom } from "./recorder-output.ts";

const SECRET = "TEST-recorder-secret";
const value = { secret: SECRET, filler: "x".repeat(300) };
const text = Buffer.from(JSON.stringify(value)).toString("base64url");
const chunks = text.match(/.{1,100}/g);
const digest = `sha256:${createHash("sha256").update(text).digest("hex")}`;
const printed = (lines = chunks.map((chunk, n) => `R ${n} ${chunk}`), end = `R end ${chunks.length} ${digest}`) => [...lines, end, ""].join("\n");
const refused = (log, pattern) => assert.throws(() => recordFrom(log, "R"), error => {
  assert.match(error.message, pattern);
  assert.ok(!error.message.includes(SECRET) && !error.message.includes(chunks[0]), "the message quotes the record");
  return true;
});

test("a whole record in any order reads back", () => {
  assert.deepEqual(recordFrom(printed(), "R"), value);
  assert.deepEqual(recordFrom(printed(chunks.map((chunk, n) => `R ${n} ${chunk}`).reverse()), "R"), value);
});

test("a colour code before the first line does not lose that line", () => {
  const [first, ...rest] = chunks.map((chunk, n) => `R ${n} ${chunk}`);
  assert.deepEqual(recordFrom(printed([`\u001b[22m\u001b[39m${first}`, ...rest]), "R"), value);
});

test("a lost line stops the read by name", () => refused(printed(chunks.slice(1).map((chunk, n) => `R ${n + 1} ${chunk}`)), /names \d+ R lines, and \d+ whole lines arrived/));
test("a missing end line stops the read by name", () => refused(chunks.map((chunk, n) => `R ${n} ${chunk}`).join("\n"), /no end line/));
test("a changed line stops the read by name", () => refused(printed(chunks.map((chunk, n) => `R ${n} ${n === 1 ? chunk.replace(/^./, c => (c === "A" ? "B" : "A")) : chunk}`)), /do not match the digest/));
test("a whole line count with a repeated number stops the read by name", () => refused(printed(chunks.map((chunk, n) => `R ${n === 1 ? 0 : n} ${chunk}`)), /names \d+ R lines/));
test("text that passes its digest and is not JSON stops the read by name", () => {
  const bad = Buffer.from("not json").toString("base64url");
  refused(`R 0 ${bad}\nR end 1 sha256:${createHash("sha256").update(bad).digest("hex")}\n`, /is not JSON/);
});
