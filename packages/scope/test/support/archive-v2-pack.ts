/** Scripted archive v2 framing, not evidence of hosted protocol support.
 * Real interoperability belongs to the Git package's local http-backend test. */
import { utf8 } from "@generalbusiness/artroom-bytes";

export function scriptedArchiveV2Pack(pack: Uint8Array): Uint8Array {
  const header = utf8("000dpackfile\n"), packets = Math.ceil(pack.length / 65515);
  const body = new Uint8Array(header.length + pack.length + packets * 5 + 4);
  body.set(header); let write = header.length;
  for (let at = 0; at < pack.length; at += 65515) {
    const chunk = pack.subarray(at, at + 65515);
    body.set(utf8((chunk.length + 5).toString(16).padStart(4, "0") + "\x01"), write);
    body.set(chunk, write + 5); write += chunk.length + 5;
  }
  body.set(utf8("0000"), write); return body;
}
