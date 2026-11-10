/** Sequence identifiers are content names, never Native scope references. */
export interface SequenceIdentifier {
  readonly format: string;
  readonly genesis: string;
}

export interface Citation extends SequenceIdentifier {
  readonly position: number;
  readonly event: string;
}

const sequence = /^did:seq:([a-z][a-z0-9]{0,15}):([a-z0-9._-]+)$/;
const citation = /^did:seq:([a-z][a-z0-9]{0,15}):([a-z0-9._-]+)\/(0|[1-9][0-9]{0,15})\/([a-z0-9._-]+)$/;

/** Unknown formats retain the generic grammar; implemented formats have exact digests. */
function digest(format: string, text: string): boolean {
  return format === "git" ? /^[0-9a-f]{40}$/.test(text)
    : format === "dap1" || format === "git256" ? /^[0-9a-f]{64}$/.test(text) : true;
}

export function parseSequenceIdentifier(text: unknown): SequenceIdentifier | null {
  if (typeof text !== "string") return null;
  const match = sequence.exec(text);
  if (!match || match[0] !== text || !digest(match[1]!, match[2]!)) return null;
  return { format: match[1]!, genesis: match[2]! };
}

export function parseCitation(text: unknown): Citation | null {
  if (typeof text !== "string") return null;
  const match = citation.exec(text);
  if (!match || match[0] !== text || !digest(match[1]!, match[2]!) || !digest(match[1]!, match[4]!)) return null;
  const position = Number(match[3]);
  if (!Number.isSafeInteger(position)) return null;
  return { format: match[1]!, genesis: match[2]!, position, event: match[4]! };
}
