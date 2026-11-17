import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { redact, saveFailedPage } from "./witness-failure-page.mjs";

/** A stand-in for a Playwright page: visible body text and a screenshot that writes a marker file. */
function fakePage(text) {
  const shots = [];
  const page = {
    shots,
    locator: selector => ({ selector, innerText: async () => { if (text instanceof Error) throw text; return text; } }),
    screenshot: async options => { shots.push(options); writeFileSync(options.path, "TEST png"); },
  };
  return page;
}

const TOKEN = "artroom-invite:TESTtokenABC123";

test("a page that shows a token keeps redacted text and takes no screenshot", async () => {
  const directory = mkdtempSync(join(tmpdir(), "nf8-"));
  const page = fakePage(`Enrollment failed for ${TOKEN}\nTEST secret-session-value`);
  const saved = await saveFailedPage(page, directory, [TOKEN, "secret-session-value"]);
  const text = readFileSync(join(directory, "failure-page.txt"), "utf8");
  assert.equal(text, "Enrollment failed for artroom-invite:<replaced>\nTEST <replaced>");
  assert.equal(text.includes("TESTtokenABC123"), false);
  assert.equal(page.shots.length, 0);
  assert.equal(existsSync(join(directory, "failure-page.png")), false);
  assert.match(saved.screenshot, /^withheld/);
});

test("a page without a token keeps its text and a screenshot with the invitation field masked", async () => {
  const directory = mkdtempSync(join(tmpdir(), "nf8-"));
  const page = fakePage("Agents that count\nTEST membership pending");
  const saved = await saveFailedPage(page, directory, [TOKEN]);
  assert.deepEqual(saved, { text: "failure-page.txt", screenshot: "failure-page.png" });
  assert.equal(readFileSync(join(directory, "failure-page.txt"), "utf8"), "Agents that count\nTEST membership pending");
  assert.equal(page.shots.length, 1);
  assert.deepEqual(page.shots[0].mask.map(locator => locator.selector), ["[data-invitation]"]);
});

test("a closed page returns the error name and does not throw", async () => {
  const directory = mkdtempSync(join(tmpdir(), "nf8-"));
  const saved = await saveFailedPage(fakePage(new TypeError("TEST page closed")), directory, [TOKEN]);
  assert.deepEqual(saved, { text: null, screenshot: null, error: "TypeError" });
});

test("redaction replaces any invitation token, not only the given one", () => {
  assert.equal(redact("x artroom-invite:OTHER y"), "x artroom-invite:<replaced> y");
});
