// Copied to a directory containing only this driver and the four allowed modules.
import { readFileSync } from 'node:fs';
import { verifyControlSpine, type ControlProof } from '../../src/control-verifier.ts';
const input = JSON.parse(readFileSync(0, 'utf8')) as ControlProof | ControlProof[];
const output = Array.isArray(input) ? input.map(proof => {
  try { return { accept: true, result: verifyControlSpine(proof) }; }
  catch (error) { return { accept: false, error: error instanceof Error ? error.message : String(error) }; }
}) : verifyControlSpine(input);
process.stdout.write(JSON.stringify(output) + '\n');
