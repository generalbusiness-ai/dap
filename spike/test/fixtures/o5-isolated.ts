// Copied to a directory containing only this driver and the four allowed modules.
import { readFileSync } from 'node:fs';
import { verifyControlSpine, type ControlProof } from '../../src/control-verifier.ts';
const proof = JSON.parse(readFileSync(0, 'utf8')) as ControlProof;
process.stdout.write(JSON.stringify(verifyControlSpine(proof)) + '\n');
