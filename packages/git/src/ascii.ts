/** Git wire text: each byte becomes the code unit with that numeric value. */
export function ascii(bytes: Uint8Array): string {
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return text;
}
