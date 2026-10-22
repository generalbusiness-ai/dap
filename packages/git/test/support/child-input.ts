import { execFile, type ExecFileOptionsWithBufferEncoding } from "node:child_process";

/** Test fixture IO: own the input stream until it closes, and join the child.
 * A completed child does not turn a failed input write into success. */
export async function childInput(program: string, args: string[], options: ExecFileOptionsWithBufferEncoding, input: Uint8Array): Promise<Buffer> {
  let child!: ReturnType<typeof execFile>;
  const finished = new Promise<{ error: Error | null; output: Buffer }>((resolve) => {
    child = execFile(program, args, options, (error, output) => resolve({ error, output }));
  });
  const inputClosed = new Promise<Error | null>((resolve) => {
    const stream = child.stdin;
    if (stream === null) { resolve(new Error("fixture child has no stdin")); return; }
    let failure: Error | null = null;
    stream.on("error", (error: Error) => { failure ??= error; });
    stream.once("close", () => resolve(failure));
    try { stream.end(Buffer.from(input)); }
    catch (error) { failure = error instanceof Error ? error : new Error(String(error)); stream.destroy(); }
  });
  const [result, inputError] = await Promise.all([finished, inputClosed]);
  if (result.error !== null && inputError !== null) throw new AggregateError([result.error, inputError], "fixture child and input failed");
  if (result.error !== null) throw result.error;
  if (inputError !== null) throw inputError;
  return result.output;
}
