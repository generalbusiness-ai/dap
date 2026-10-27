/** Scripted SQL API response shapes. These are deliberately authored test
 * inputs, not recorded provider responses or evidence of executed SQL. */
export const qualification = "Scripted SQL API response; not a provider recording or live SQL result.";
export const window = Object.freeze({
  from: "2026-09-27T12:00:00.000Z", through: "2026-10-27T12:00:00.000Z",
  fromSeconds: 1790510400, throughSeconds: 1793102400,
});
export const aliases = ["kind", "deployment", "place", "result", "reason", "execution", "storedRows", "weightedEvents", "maximumSampleInterval", "maximumSecond", "weightedA", "firstSeconds", "lastSeconds"];
const stringAliases = new Set(aliases.slice(0, 6));
export const meta = aliases.map(name => ({ name, type: stringAliases.has(name) ? "String" : name === "maximumSampleInterval" ? "Float64" : "UInt64" }));
export function row(kind, changes = {}) {
  return {
    kind, deployment: "TEST-usage-deployment", place: kind === "metric-dropped" ? "metrics" : "health",
    result: kind === "metric-dropped" ? "dropped" : "ok", reason: kind === "metric-dropped" ? "summary" : "2xx",
    execution: kind === "metric-dropped" ? "none" : "pre-turn", storedRows: 1, weightedEvents: 1,
    maximumSampleInterval: 1, maximumSecond: 0, weightedA: 0,
    firstSeconds: 1790856000, lastSeconds: 1790856000, ...changes,
  };
}
export function response(data = [row("route"), row("metric-dropped")], extra = {}) {
  return { meta: structuredClone(meta), data: structuredClone(data), rows: data.length, ...extra };
}
