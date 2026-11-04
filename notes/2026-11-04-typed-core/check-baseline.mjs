// Frozen design evidence, not a semantic coverage test. Run from any directory.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const root = new URL("../../", import.meta.url);
const baseline = JSON.parse(readFileSync(new URL("baseline.json", import.meta.url), "utf8"));
let changed = 0;
for (const [path, expected] of Object.entries(baseline.sha256)) {
	try {
		const actual = createHash("sha256").update(readFileSync(new URL(path, root))).digest("hex");
		if (actual !== expected) {
			console.error(`Review source drift: ${path}`);
			changed++;
		}
	} catch {
		console.error(`Cannot read baseline source: ${path}`);
		changed++;
	}
}
if (changed) process.exitCode = 1;
else console.log(`${Object.keys(baseline.sha256).length} source hashes match ${baseline.commit}. Semantic coverage still requires review.`);
