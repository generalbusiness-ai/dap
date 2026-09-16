// O1 wire profile. This boundary accepts JSON data, not JavaScript objects
// with conversion hooks. The older visibility fixture's canon.ts is unchanged.

import { createHash, createPublicKey, sign, verify, type KeyObject } from 'node:crypto';
import { ZERO_HASH, type Json } from './canon.ts';
import { SYSTEM_PREFIX, type Entry, type EventBody, type Header } from './types.ts';

export interface ActorEnvelope { body: EventBody; sig: string }
export type SignedHeader = Header & { seq_sig: string };
export interface WireEntry { header: Header; committed: string }
export interface ExpectedHeader { genesis: string; position: number; prev: string }
export interface WireOptions {
  /** The caller has established that genesis adopted this origin. */
  allowOrigin?: boolean;
}

const GENESIS = SYSTEM_PREFIX + 'genesis';
const ATTACH = SYSTEM_PREFIX + 'attach';
const HASH = /^sha256:[0-9a-f]{64}$/;
const SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');
const utf8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

// Identity, rather than an exception's type/message, distinguishes declared
// input rejections from unexpected faults in crypto or object inspection.
const validationErrors = new WeakSet<object>();
export function isCodecValidationError(error: unknown): error is TypeError {
  return typeof error === 'object' && error !== null && validationErrors.has(error);
}
function fail(message: string): never {
  const error = new TypeError('codec: ' + message);
  validationErrors.add(error);
  throw error;
}

function unicode(value: string): void {
  for (let i = 0; i < value.length; i++) {
    const n = value.charCodeAt(i);
    if (n >= 0xd800 && n <= 0xdbff) {
      const next = value.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff)) fail('lone Unicode surrogate');
    } else if (n >= 0xdc00 && n <= 0xdfff) fail('lone Unicode surrogate');
  }
}

/** RFC 8785: ECMAScript finite doubles, UTF-16 key order, no normalization. */
export function canonicalize(value: unknown): string {
  const active = new Set<object>();
  function encode(v: unknown): string {
    if (v === null || typeof v === 'boolean') return JSON.stringify(v);
    if (typeof v === 'string') { unicode(v); return JSON.stringify(v); }
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) fail('non-finite number');
      return JSON.stringify(v);
    }
    if (typeof v !== 'object') fail('non-JSON value');
    if (active.has(v)) fail('cyclic JSON');
    const array = Array.isArray(v);
    const proto = Object.getPrototypeOf(v);
    if (!array && proto !== Object.prototype && proto !== null) fail('non-JSON object');
    const descriptors = Object.getOwnPropertyDescriptors(v);
    if (Object.getOwnPropertySymbols(v).length) fail('symbol property');
    for (const [key, d] of Object.entries(descriptors)) {
      if (array && key === 'length') continue;
      if (!d.enumerable || !('value' in d)) fail('non-JSON property');
      unicode(key);
    }
    active.add(v);
    let out: string;
    if (array) {
      const parts: string[] = [];
      if (Object.keys(descriptors).length !== v.length + 1) fail('sparse or extended array');
      for (let i = 0; i < v.length; i++) {
        if (!Object.hasOwn(descriptors, i)) fail('sparse array');
        parts.push(encode(descriptors[String(i)]!.value));
      }
      out = '[' + parts.join(',') + ']';
    } else {
      out = '{' + Object.keys(descriptors).sort().map(k => JSON.stringify(k) + ':' + encode(descriptors[k]!.value)).join(',') + '}';
    }
    active.delete(v);
    return out;
  }
  return encode(value);
}

function text(input: string | Uint8Array): string {
  return typeof input === 'string' ? input : utf8.decode(input);
}

/** Round-trip equality also rejects duplicate keys, alternate escapes and whitespace. */
export function parseCanonical(input: string | Uint8Array): Json {
  const source = text(input);
  let value: Json;
  try { value = JSON.parse(source) as Json; } catch { return fail('invalid JSON'); }
  if (canonicalize(value) !== source) fail('noncanonical JSON');
  return value;
}

function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

function snapshot(value: unknown): unknown { return parseCanonical(canonicalize(value)); }
function hash(bytes: string): string { return 'sha256:' + createHash('sha256').update(bytes, 'utf8').digest('hex'); }
function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(label + ' must be an object');
  return value as Record<string, unknown>;
}
function fields(value: Record<string, unknown>, required: string[], optional: string[], label: string): void {
  const allowed = new Set([...required, ...optional]);
  if (required.some(k => !Object.hasOwn(value, k))) fail(label + ' missing required field');
  if (Object.keys(value).some(k => !allowed.has(k))) fail(label + ' has forbidden field');
}
function digest(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !HASH.test(value)) fail(label + ' must be a sha256 identity');
}
function position(value: unknown, label: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) fail(label + ' must be a nonnegative safe integer');
}
function base64url(value: unknown, length: number, label: string): Buffer {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) fail(label + ' must be unpadded base64url');
  const bytes = Buffer.from(value, 'base64url');
  if (bytes.length !== length || bytes.toString('base64url') !== value) fail(label + ' has invalid encoding or length');
  return bytes;
}

/** The profile principal is ed25519:<unpadded-base64url raw 32-byte public key>. */
export function principalOf(key: KeyObject): string {
  if (key.asymmetricKeyType !== 'ed25519') fail('key must be Ed25519');
  const pub = key.type === 'private' ? createPublicKey(key) : key;
  const der = pub.export({ type: 'spki', format: 'der' });
  if (der.length !== SPKI_PREFIX.length + 32 || !der.subarray(0, SPKI_PREFIX.length).equals(SPKI_PREFIX)) fail('invalid Ed25519 public key');
  return 'ed25519:' + der.subarray(SPKI_PREFIX.length).toString('base64url');
}

export function publicKeyOf(principal: string): KeyObject {
  if (typeof principal !== 'string' || !principal.startsWith('ed25519:')) fail('actor/writer principal must be an Ed25519 public key');
  const raw = base64url(principal.slice(8), 32, 'principal');
  return createPublicKey({ key: Buffer.concat([SPKI_PREFIX, raw]), type: 'spki', format: 'der' });
}

function bodyShape(value: unknown): asserts value is EventBody {
  const b = record(value, 'body');
  fields(b, ['kind', 'payload', 'actor', 'nonce'], ['genesis', 'action_id', 'expected_binding', 'expected_activation'], 'body');
  if (typeof b.kind !== 'string' || !b.kind.length) fail('kind must be nonempty');
  publicKeyOf(b.actor as string);
  if (typeof b.nonce !== 'string' || !/^[0-9a-f]{32}$/.test(b.nonce)) fail('nonce must be 16 bytes of lowercase hex');
  if (b.genesis === undefined) {
    if (b.action_id !== undefined || b.expected_binding !== undefined || b.expected_activation !== undefined) fail('genesis/origin carries intent fields');
  } else {
    digest(b.genesis, 'body.genesis');
    if (b.kind === GENESIS) fail('genesis body carries its own identity');
    if (typeof b.action_id !== 'string' || !b.action_id.length) fail('intent requires action_id');
    if (b.kind.startsWith(SYSTEM_PREFIX)) {
      if (b.expected_binding !== undefined || b.expected_activation !== undefined) fail('system intent carries application fields');
    } else {
      digest(b.expected_binding, 'expected_binding');
      if (b.expected_activation !== undefined) position(b.expected_activation, 'expected_activation');
    }
  }
}

function envelopeShape(value: unknown): asserts value is ActorEnvelope {
  const e = record(value, 'envelope');
  fields(e, ['body', 'sig'], [], 'envelope');
  bodyShape(e.body);
  base64url(e.sig, 64, 'actor signature');
}

export function signEvent(body: EventBody, key: KeyObject): ActorEnvelope {
  const copy = snapshot(body);
  bodyShape(copy);
  if (key.type !== 'private' || principalOf(key) !== copy.actor) fail('actor signing key does not match body.actor');
  return freeze({ body: copy, sig: sign(null, Buffer.from(canonicalize(copy)), key).toString('base64url') });
}

export function envelopeBytes(envelope: ActorEnvelope): string {
  const copy = snapshot(envelope);
  envelopeShape(copy);
  return canonicalize(copy);
}

export function envelopeId(envelope: ActorEnvelope): string { return hash(envelopeBytes(envelope)); }

export function verifyEnvelope(input: ActorEnvelope | string | Uint8Array): ActorEnvelope {
  const e = typeof input === 'string' || input instanceof Uint8Array ? parseCanonical(input) : snapshot(input);
  envelopeShape(e);
  if (!verify(null, Buffer.from(canonicalize(e.body)), publicKeyOf(e.body.actor), base64url(e.sig, 64, 'actor signature'))) fail('invalid actor signature');
  return freeze(e);
}

function headerShape(value: unknown, signed = false): asserts value is Header {
  const h = record(value, 'header');
  fields(h, ['genesis', 'position', 'prev', 'commitment', ...(signed ? ['seq_sig'] : [])], ['activation', 'requires', ...(!signed ? ['seq_sig'] : [])], 'header');
  digest(h.genesis, 'header.genesis');
  digest(h.prev, 'header.prev');
  digest(h.commitment, 'header.commitment');
  position(h.position, 'header.position');
  if (h.activation !== undefined && h.requires !== undefined) fail('header cannot carry both activation and requires');
  if (h.activation !== undefined) {
    position(h.activation, 'activation');
    if (h.activation >= h.position) fail('activation must refer to an earlier position');
  }
  if (h.requires !== undefined) {
    if (!Array.isArray(h.requires)) fail('requires must be an array');
    let previous = -1;
    for (const n of h.requires) {
      position(n, 'requirement');
      if (n >= h.position || n <= previous) fail('requirements must be unique ascending earlier positions');
      previous = n;
    }
  }
  if (h.position === 0) {
    if (h.prev !== ZERO_HASH || h.commitment !== h.genesis) fail('invalid genesis header identity/predecessor');
    if (h.activation !== undefined || h.requires !== undefined) fail('genesis header carries dependency evidence');
  }
  if (h.seq_sig !== undefined) base64url(h.seq_sig, 64, 'sequencer signature');
}

/** activation/requires are authenticated alongside the four base fields (§2.2). */
export function headerPreimage(header: Header): Header {
  const copy = snapshot(header);
  headerShape(copy);
  const { seq_sig: _signature, ...preimage } = copy as SignedHeader;
  return freeze(preimage);
}
export function headerBytes(header: Header): string { return canonicalize(headerPreimage(header)); }
export function headerHash(header: Header): string { return hash(headerBytes(header)); }

export function signHeader(preimage: Header, key: KeyObject): SignedHeader {
  const body = headerPreimage(preimage);
  if (key.type !== 'private' || key.asymmetricKeyType !== 'ed25519') fail('sequencer signing key must be private Ed25519');
  return freeze({ ...body, seq_sig: sign(null, Buffer.from(canonicalize(body)), key).toString('base64url') });
}

/** Verifies a hidden position without an actor, payload, audience or application fold. */
export function verifyHeader(header: Header, writerPrincipal: string, expected: ExpectedHeader): void {
  const h = snapshot(header);
  headerShape(h, true);
  digest(expected.genesis, 'expected.genesis');
  digest(expected.prev, 'expected.prev');
  position(expected.position, 'expected.position');
  if (h.genesis !== expected.genesis) fail('wrong genesis');
  if (h.position !== expected.position) fail('wrong position');
  if (h.prev !== expected.prev) fail('wrong prev');
  if (!verify(null, Buffer.from(headerBytes(h)), publicKeyOf(writerPrincipal), base64url((h as SignedHeader).seq_sig, 64, 'sequencer signature'))) fail('invalid sequencer signature');
}

function wireShape(value: unknown): asserts value is WireEntry {
  const w = record(value, 'wire entry');
  fields(w, ['header', 'committed'], [], 'wire entry');
  headerShape(w.header, true);
  if (typeof w.committed !== 'string') fail('committed must contain canonical envelope bytes');
  envelopeShape(parseCanonical(w.committed));
}

/** Exactly one canonical JSON line, including its terminating LF. */
export function encodeWire(wire: WireEntry): string {
  const copy = snapshot(wire);
  wireShape(copy);
  return canonicalize(copy) + '\n';
}

/** Accepts one line with or without its final LF; never trims or repairs input. */
export function decodeWire(input: string | Uint8Array): WireEntry {
  const source = text(input);
  const value = parseCanonical(source.endsWith('\n') ? source.slice(0, -1) : source);
  wireShape(value);
  return freeze(value);
}

export function verifyWire(input: WireEntry | string | Uint8Array, writerPrincipal: string, expected: ExpectedHeader, options: WireOptions = {}): Entry {
  const w = typeof input === 'string' || input instanceof Uint8Array ? decodeWire(input) : snapshot(input);
  wireShape(w);
  verifyHeader(w.header, writerPrincipal, expected);
  const e = verifyEnvelope(w.committed);
  const id = hash(w.committed);
  if (w.header.commitment !== id) fail('wrong commitment');
  if (w.header.position === 0) {
    if (e.body.kind !== GENESIS || e.body.genesis !== undefined) fail('position zero must contain genesis');
  } else {
    if (e.body.kind === GENESIS) fail('genesis may only occupy position zero');
    if (e.body.genesis === undefined) {
      if (!options.allowOrigin) fail('origin requires explicit adoption authorization');
      if (w.header.activation !== undefined || w.header.requires !== undefined) fail('origin header carries dependency evidence');
    } else if (e.body.genesis !== w.header.genesis) fail('body is addressed to wrong genesis');
  }
  if (e.body.kind.startsWith(SYSTEM_PREFIX)) {
    if (w.header.activation !== undefined) fail('system header carries activation');
    if (w.header.requires !== undefined && e.body.kind !== ATTACH) fail('non-attach header carries requirements');
  } else if (w.header.requires !== undefined) fail('application header carries requirements');
  // Missing evidence is allowed for an unbound kind or unavailable attach;
  // the existing foundation fold records that semantic refusal.
  return freeze({ position: w.header.position, event: e.body, id, header: w.header, headerHash: headerHash(w.header), actorSig: e.sig, committed: w.committed });
}
