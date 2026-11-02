import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";
import { rowPressProbe } from "./row-press-probe.mjs";

test("probe console accounting separates the exact stream diagnostic and retains every unexpected event (browser events are stand-ins)", () => {
  const context = new EventEmitter();
  context.pages = () => [];
  const probe = rowPressProbe(context, "unused-capture-directory");
  const page = new EventEmitter();
  context.emit("page", page);
  const diagnostic = "Failed to load resource: the server responded with a status of 503 (Service Unavailable)";
  const stream = "http://127.0.0.1:8797/v1/scopes/sc_fixture/stream";
  const emit = (type, text, url) => page.emit("console", { type: () => type, text: () => text, location: () => ({ url }) });
  emit("error", diagnostic, stream);
  emit("error", diagnostic, "http://127.0.0.1:8797/page/page.js");
  emit("error", diagnostic.replace("503", "500"), stream);
  emit("warning", diagnostic, stream);
  emit("error", "TEST unexpected stream error", stream);
  page.emit("pageerror", new Error("TEST unexpected page error"));
  const report = probe.report();
  assert.equal(report.console.length, 6, "The original event record keeps both classes.");
  assert.equal(report.streamDiagnostics.length, 1);
  assert.equal(report.streamDiagnosticCount, 1);
  assert.equal(report.streamDiagnostics[0].url, stream);
  assert.deepEqual(report.unexpectedConsole.map(event => [event.type, event.text]), [
    ["error", diagnostic],
    ["error", diagnostic.replace("503", "500")],
    ["warning", diagnostic],
    ["error", "TEST unexpected stream error"],
    ["pageerror", "Error: TEST unexpected page error"],
  ]);
});
