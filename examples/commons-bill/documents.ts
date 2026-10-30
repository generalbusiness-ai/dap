/** Synthetic UTF-8 fixtures, not medical records or Capture/File inputs. */
import type { FactRef, ReferenceValue } from "@generalbusiness/dap-contract";
import { canonicalize, textDigest } from "@generalbusiness/dap-bytes";

export const ROWS = [
  ["B01", "Consultation", 120, 100], ["B02", "Laboratory", 85, 60],
  ["B03", "Imaging", 210, 180], ["B04", "Supplies", 18, 18],
  ["B05", "Laboratory follow-up", 45, 20], ["B06", "Therapy", 95, 80],
  ["B07", "Assessment", 70, 70], ["B08", "Consultation follow-up", 60, 50],
  ["B09", "Imaging review", 55, 25], ["B10", "Supplies follow-up", 12, 12],
  ["B11", "Therapy follow-up", 80, 65], ["B12", "Laboratory review", 40, 10],
  ["B13", "Assessment follow-up", 35, 35], ["B14", "Administration", 15, 15],
] as const;
export const MARKED = [2, 5, 9, 12] as const;
export const DOCUMENTS = {
  bill: "SYNTHETIC TEST BILL; amounts are invented units.\n" + ROWS.map(([id, label, charged]) => `${id}\t${label}\tcharged ${charged}\n`).join(""),
  statement: "SYNTHETIC TEST INSURER STATEMENT; no real claim.\n" + ROWS.map(([id, , , paid]) => `${id}\tpaid ${paid}\n`).join(""),
  question: "SYNTHETIC TEST QUESTION\nPlease explain the differences for B02, B05, B09 and B12.\nThis is a demonstration, not an actual bill or medical question.\n",
};
export const DOCUMENT_DIGESTS = Object.fromEntries(Object.entries(DOCUMENTS).map(([name, body]) => [name, textDigest(body)])) as Record<keyof typeof DOCUMENTS, ReturnType<typeof textDigest>>;
export const STEPS = ["carrier-bill", "carrier-statement", "carrier-question", ...ROWS.map((_, i) => `row-${String(i + 1).padStart(2, "0")}`), "list", ...MARKED.map((_, i) => `mark-${String(i + 1).padStart(2, "0")}`), "question-links"] as const;
export const FIXTURE_DIGEST = textDigest(canonicalize({ documents: DOCUMENTS, rows: ROWS, marked: MARKED, steps: STEPS }));
export interface Note { actor: "member" | "agent"; body: string; media: string; about: ReferenceValue[] }
export const noteKey = (step: string): string => `bo1-w1-${step}`;
const rowStep = (n: number) => `row-${String(n).padStart(2, "0")}`;
const sources = (n: number): ReferenceValue[] => [
  { document: DOCUMENT_DIGESTS.bill, fragment: `line=${n},${n + 1}` },
  { document: DOCUMENT_DIGESTS.statement, fragment: `line=${n},${n + 1}` },
];

/** Actual accepted facts are supplied by custody, never guessed positions. */
export function noteFor(step: string, facts: ReadonlyMap<string, FactRef>): Note {
  if (!STEPS.includes(step)) throw Error("Unknown W1 step.");
  const fact = (name: string): FactRef => { const value = facts.get(name); if (!value) throw Error("A W1 source receipt is missing."); return value; };
  if (step.startsWith("carrier-")) {
    const name = step.slice(8) as keyof typeof DOCUMENTS;
    return { actor: "agent", body: DOCUMENTS[name], media: "text/plain", about: [] };
  }
  if (step.startsWith("row-")) {
    const n = Number(step.slice(4)), [id, description, charged, paid] = ROWS[n - 1]!;
    return { actor: "agent", body: canonicalize({ id, description, charged, paid, difference: charged - paid }), media: "application/json", about: sources(n) };
  }
  if (step === "list") return { actor: "agent", body: canonicalize(ROWS.map((_, i) => ({ entry: fact(rowStep(i + 1)) }))), media: "application/json", about: [
    { document: DOCUMENT_DIGESTS.bill }, { document: DOCUMENT_DIGESTS.statement }, ...ROWS.map((_, i) => ({ entry: fact(rowStep(i + 1)) })),
  ] };
  if (step.startsWith("mark-")) {
    const n = MARKED[Number(step.slice(5)) - 1]!;
    return { actor: "member", body: `Please explain the difference in ${ROWS[n - 1]![0]}.`, media: "text/plain", about: [{ entry: fact(rowStep(n)) }, ...sources(n)] };
  }
  return { actor: "agent", body: "The retained question concerns these four marked rows.", media: "text/plain", about: [{ document: DOCUMENT_DIGESTS.question }, ...MARKED.map(n => ({ entry: fact(rowStep(n)) }))] };
}
