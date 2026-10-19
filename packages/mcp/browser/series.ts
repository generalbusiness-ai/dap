/** A bounded native sample series. Only recorded points are drawn. */
import type { Card } from "../src/views/types.ts";
import { formatInteger } from "../src/views/numbers.ts";
type Series = NonNullable<NonNullable<Card["declared"]>["series"]>;
export function seriesPanel(series: Series): HTMLElement {
  const section = document.createElement("section"); section.className = "native-series";
  const heading = document.createElement("h2"); heading.textContent = series.label; section.append(heading);
  if (series.samples.length) {
    const values = series.samples.map(sample => sample.value), times = series.samples.map(sample => Date.parse(sample.time));
    const low = Math.min(...values), high = Math.max(...values), first = Math.min(...times), last = Math.max(...times);
    const points = series.samples.map((sample, index) => ({
      x: first === last ? 120 : 8 + (times[index]! - first) / (last - first) * 224,
      y: low === high ? 32 : 56 - (sample.value - low) / (high - low) * 48,
    }));
    const element = (name: string) => document.createElementNS("http://www.w3.org/2000/svg", name);
    const svg = element("svg"); svg.setAttribute("viewBox", "0 0 240 64"); svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `${series.label}: recorded points in source-time order; exact values below.`);
    if (points.length > 1) {
      const line = element("polyline"); line.setAttribute("points", points.map(point => `${point.x},${point.y}`).join(" "));
      line.setAttribute("fill", "none"); line.setAttribute("stroke", "currentColor"); line.setAttribute("stroke-width", "1.5"); svg.append(line);
    }
    for (const point of points) {
      const dot = element("circle"); dot.setAttribute("cx", String(point.x)); dot.setAttribute("cy", String(point.y)); dot.setAttribute("r", "2.5"); dot.setAttribute("fill", "currentColor"); svg.append(dot);
    }
    section.append(svg);
  }
  const fallback = document.createElement("p"); fallback.className = "series-fallback"; fallback.textContent = series.fallback; section.append(fallback);
  if (series.samples.length) {
    const details = document.createElement("details"), summary = document.createElement("summary"), list = document.createElement("ol");
    summary.textContent = `Recorded samples (${series.samples.length})`; details.append(summary);
    for (const sample of series.samples) {
      const item = document.createElement("li"); item.textContent = `${formatInteger(sample.value, series.scale, series.unit)} at ${sample.time} (entry ${sample.entry.seq})`; list.append(item);
    }
    details.append(list); section.append(details);
  }
  return section;
}
