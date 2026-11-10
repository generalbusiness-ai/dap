import { verifyCitation, type CitationLevel, type CitationSource } from "./citation.ts";

export const CITATION_USAGE = "       artroom-replay --citation <citation> (--source <file> | --git <clone>) [--level 0|1|2|3] [--depth <edges>] [--anchor <citation>]... [--json]";
export interface CitationIo {
  out(text: string): void;
  err(text: string): void;
  citationFile?: (path: string) => CitationSource;
  citationGit?: (directory: string) => CitationSource;
  hashGitCommit?: (content: Uint8Array) => Promise<string | null>;
}

/** This explicit dispatch cannot change the Native integrity or replay modes. */
export async function citationMain(argv: readonly string[], io: CitationIo): Promise<number> {
  const usage = (why: string): number => { io.err(`${why}\n${CITATION_USAGE}`); return 2; };
  const text = argv[1];
  if (!text || text.startsWith("--")) return usage("--citation needs a citation");
  let path: string | undefined, git = false, level: CitationLevel = 3, depth = 10_000;
  let hadLevel = false, hadDepth = false;
  const anchors: string[] = [];
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--json") continue;
    if (!["--source", "--git", "--level", "--depth", "--anchor"].includes(arg)) return usage(`unknown citation option ${arg}`);
    const value = argv[++i];
    if (!value || value.startsWith("--")) return usage(`${arg} needs a value`);
    if (arg === "--source" || arg === "--git") {
      if (path !== undefined) return usage("give exactly one citation --source or --git");
      path = value; git = arg === "--git";
    } else if (arg === "--anchor") anchors.push(value);
    else if (arg === "--level") {
      if (hadLevel || value.length !== 1 || !/^[0-3]$/.test(value)) return usage("give --level once, from 0 through 3");
      hadLevel = true; level = Number(value) as CitationLevel;
    } else {
      if (hadDepth || value !== String(Number(value)) || !/^(0|[1-9][0-9]*)$/.test(value) || !Number.isSafeInteger(Number(value))) return usage("give --depth once as a nonnegative safe integer");
      hadDepth = true; depth = Number(value);
    }
  }
  if (path === undefined) return usage("a citation needs --source or --git");
  const selectedPath = path;
  let selected: CitationSource | undefined;
  const source = (): CitationSource => {
    const open = git ? io.citationGit : io.citationFile;
    if (!open) throw new Error("This host provides no citation byte source");
    return selected ??= open(selectedPath);
  };
  try {
    const report = await verifyCitation(text, {
      event: citation => source().event(citation),
      predecessor: (format, digest) => source().predecessor(format, digest),
    }, { requested: level, depth, anchors, ...(io.hashGitCommit ? { hashGitCommit: io.hashGitCommit } : {}) });
    io.out(JSON.stringify(report));
    return report.result === "ok" ? 0 : 1;
  } catch (error) {
    if (error instanceof TypeError || error instanceof RangeError) return usage(error.message);
    throw error;
  }
}
