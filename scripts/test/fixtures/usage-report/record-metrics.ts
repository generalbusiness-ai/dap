/** Fixed TEST emissions through the real writer into a scripted sink.
 * Run with the existing pinned tsx loader from scratch; stdout is the fixture.
 * No Analytics Engine, provider SQL, Worker deployment or network runs here. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { Metrics } from "../../../../packages/scope/src/metrics.ts";
import type { MetricPoint } from "../../../../packages/scope/src/metrics.ts";

const source = new URL("../../../../packages/scope/src/metrics.ts", import.meta.url);
const from = "2026-09-27T12:00:00.000Z", through = "2026-10-27T12:00:00.000Z";
const observedAt = "2026-10-01T12:00:00.000Z";
const context = { scope: null, deployment: "TEST-usage-deployment", version: "11111111-1111-1111-1111-111111111111", request: "none", trace: "none" };
function record(loss: boolean) {
  const points: MetricPoint[] = [];
  const metrics = new Metrics(context, { writeDataPoint(point) { points.push(structuredClone(point)); } });
  metrics.emit({ kind: "route", place: "health", end: "ok", reason: "2xx", answer: "pre-turn" });
  metrics.emit({ kind: "turn", place: "acts", end: "answer", answer: "accepted" });
  if (loss) metrics.sidecar(true, false, 1);
  metrics.finish();
  return points.map(point => ({ observedAt, point }));
}
console.log(JSON.stringify({
  qualification: "TEST emissions from the actual Metrics writer into a scripted sink; timestamps supplied by that sink. No provider response, hosted SQL or Native plan was executed.",
  source: "packages/scope/src/metrics.ts",
  sourceSha256: createHash("sha256").update(readFileSync(source)).digest("hex"),
  window: { from, through, fromSeconds: Date.parse(from) / 1000, throughSeconds: Date.parse(through) / 1000 },
  cases: { balanced: record(false), sidecarLoss: record(true) },
}, null, 2));
