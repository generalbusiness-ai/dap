/** Await explicit capture-key custody before loading the production Page.
 * Capture callers supply one actor; no saved room or old key record is found
 * by discovery. The bootstrap document runs no Page code or native request. */
import { b64url, isScopeId, isScopeRef, keyIdOfSecret, unb64url } from "@generalbusiness/dap-bytes";
import type { KeyId, ScopeRef } from "@generalbusiness/dap-contract";

interface CaptureSetupRoute {
  request(): { method(): string; url(): string };
  fulfill(response: { status: number; contentType: string; headers: Record<string, string>; body: string }): Promise<void>;
}
interface CaptureSetupPage {
  route(match: (url: URL) => boolean, handler: (route: CaptureSetupRoute) => Promise<void>): Promise<void>;
  goto(url: string): Promise<unknown>;
  evaluate<A>(body: (arg: A) => Promise<void>, arg: A): Promise<void>;
  close(): Promise<void>;
}
export interface CaptureSetupContext { newPage(): Promise<CaptureSetupPage> }
export interface CaptureSetup {
  service: string;
  place: { directory: string; membership: unknown };
  secret: string;
  register?: ScopeRef;
  label?: string;
}
const unavailable = () => new Error("Capture key setup did not finish.");

/** The caller awaits this before creating its ordinary Page. A separate,
 * page-scoped static route gives the setup only the selected service origin. */
export async function initializeCapture(context: CaptureSetupContext, kept: CaptureSetup): Promise<void> {
  const service = new URL(kept.service);
  if (!["http:", "https:"].includes(service.protocol) || service.username || service.password || service.search || service.hash
    || !isScopeId(kept.place.directory) || !isScopeRef(kept.place.membership)
    || kept.register !== undefined && !isScopeRef(kept.register)
    || kept.label !== undefined && (typeof kept.label !== "string" || !kept.label.trim() || kept.label.length > 256)) throw unavailable();
  if (typeof kept.secret !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(kept.secret)) throw unavailable();
  const secret = unb64url(kept.secret);
  let publicKey: KeyId;
  try {
    if (!secret || secret.length !== 32 || b64url(secret) !== kept.secret) throw unavailable();
    publicKey = keyIdOfSecret(secret);
  } finally { secret?.fill(0); }
  const place = { directory: kept.place.directory, membership: structuredClone(kept.place.membership) };
  const register = kept.register === undefined ? undefined : structuredClone(kept.register);
  const settings = JSON.stringify({ place, publicKey, ...(register ? { register } : {}),
    ...(kept.label === undefined ? {} : { label: { text: kept.label, place, ...(register ? { register } : {}) } }) });
  const pageAddress = new URL(kept.service.replace(/\/+$/, "") + "/page/");
  const bootstrap = new URL(".dap-capture-key-setup", pageAddress);
  const page = await context.newPage();
  try {
    await page.route(url => url.href === bootstrap.href, async route => {
      const request = route.request();
      if (request.method() !== "GET" || request.url() !== bootstrap.href) throw unavailable();
      await route.fulfill({ status: 200, contentType: "text/html", headers: {
        "cache-control": "no-store", "content-security-policy": "default-src 'none'; img-src data:; frame-ancestors 'none'; base-uri 'none'",
      }, body: '<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><title>Capture key setup</title>' });
    });
    await page.goto(bootstrap.href);
    await page.evaluate(async input => {
      const fail = () => new Error("Capture key setup did not finish.");
      if (window.top !== window || location.href !== input.bootstrap || location.origin !== input.origin
        || !globalThis.indexedDB || !navigator.locks || !crypto.subtle) throw fail();
      const decode = (value: string) => {
        const raw = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
        const bytes = new Uint8Array(raw.length);
        for (let n = 0; n < raw.length; n++) bytes[n] = raw.charCodeAt(n);
        return bytes;
      };
      const seed = decode(input.secret), encoded = new Uint8Array(48);
      let active = true, database: IDBDatabase | undefined;
      const transactions = new Set<IDBTransaction>();
      const milliseconds = 30_000, started = performance.now();
      const current = () => {
        const now = performance.now();
        if (!active || !Number.isFinite(started) || !Number.isFinite(now) || now < started || now - started >= milliseconds) {
          active = false; throw fail();
        }
      };
      let timer: ReturnType<typeof setTimeout> | undefined;
      const deadline = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          active = false;
          for (const transaction of transactions) { try { transaction.abort(); } catch { /* Already terminal. */ } }
          database?.close(); reject(fail());
        }, milliseconds);
      });
      const work = Promise.resolve().then(() => navigator.locks.request("artroom-page-key-custody-1", async () => {
        current();
        if (seed.length !== 32 || localStorage.getItem("artroom-page:v2") !== null) throw fail();
        current();
        database = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open("artroom-page-private-1", 1);
          request.onupgradeneeded = () => {
            try {
              current();
              if (!request.result.objectStoreNames.contains("keys")) { current(); request.result.createObjectStore("keys"); }
            } catch {
              try { request.transaction?.abort(); } catch { /* Already terminal. */ }
              reject(fail());
            }
          };
          request.onerror = request.onblocked = () => reject(fail());
          request.onsuccess = () => {
            try { current(); resolve(request.result); }
            catch { request.result.close(); reject(fail()); }
          };
        });
        current();
        database.onversionchange = () => { active = false; database?.close(); };
        const transaction = <T>(mode: IDBTransactionMode, run: (store: IDBObjectStore, done: (value: T) => void, refuse: () => void) => void): Promise<T> => {
          current();
          return new Promise<T>((resolve, reject) => {
            const tx = database!.transaction("keys", mode); transactions.add(tx);
            let value: T, ready = false;
            const refuse = () => { try { tx.abort(); } catch { /* Already terminal. */ } reject(fail()); };
            tx.oncomplete = () => {
              transactions.delete(tx);
              try { current(); if (!ready) throw fail(); resolve(value!); } catch { reject(fail()); }
            };
            tx.onerror = tx.onabort = () => { transactions.delete(tx); reject(fail()); };
            try { run(tx.objectStore("keys"), next => { value = next; ready = true; }, refuse); } catch { refuse(); }
          });
        };
        const slot = "ed25519:" + input.publicKey;
        const read = () => transaction<unknown>("readonly", (store, done, refuse) => {
          const request = store.get(slot);
          request.onsuccess = () => { try { current(); done(request.result); } catch { refuse(); } };
        });
        const before = await read(); current();
        if (before === undefined) {
          encoded.set(Uint8Array.of(0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20));
          encoded.set(seed, 16);
          const privateKey = await crypto.subtle.importKey("pkcs8", encoded, { name: "Ed25519" }, false, ["sign"]);
          current();
          await transaction<void>("readwrite", (store, done, refuse) => {
            const request = store.get(slot);
            request.onsuccess = () => {
              try {
                current();
                if (request.result !== undefined) { refuse(); return; }
                current(); store.put({ v: 1, publicKey: input.publicKey, privateKey }, slot); done(undefined);
              } catch { refuse(); }
            };
          });
        }
        const value = await read(); current();
        if (!value || typeof value !== "object" || Array.isArray(value)) throw fail();
        const row = value as { v?: unknown; publicKey?: unknown; privateKey?: unknown };
        if (Object.keys(row).length !== 3 || row.v !== 1 || row.publicKey !== input.publicKey || !(row.privateKey instanceof CryptoKey)
          || row.privateKey.type !== "private" || row.privateKey.extractable !== false || row.privateKey.algorithm.name !== "Ed25519"
          || row.privateKey.usages.length !== 1 || row.privateKey.usages[0] !== "sign") throw fail();
        const publicBytes = decode(input.publicKey.slice(4)), challenge = crypto.getRandomValues(new Uint8Array(32));
        let signature = new Uint8Array(0);
        try {
          const verifier = await crypto.subtle.importKey("raw", publicBytes, { name: "Ed25519" }, false, ["verify"]); current();
          signature = new Uint8Array(await crypto.subtle.sign({ name: "Ed25519" }, row.privateKey, challenge)); current();
          if (!await crypto.subtle.verify({ name: "Ed25519" }, verifier, signature, challenge)) throw fail();
          current();
        } finally { publicBytes.fill(0); challenge.fill(0); signature?.fill(0); }
        current();
        if (localStorage.getItem("artroom-page:v2") !== null) throw fail();
        current(); localStorage.setItem("artroom-page:v2", input.settings);
        current();
        if (localStorage.getItem("artroom-page:v2") !== input.settings) throw fail();
        current();
      }));
      try { await Promise.race([work, deadline]); current(); }
      finally {
        active = false; if (timer !== undefined) clearTimeout(timer);
        for (const transaction of transactions) { try { transaction.abort(); } catch { /* Already terminal. */ } }
        database?.close(); seed.fill(0); encoded.fill(0);
      }
    }, { bootstrap: bootstrap.href, origin: pageAddress.origin, publicKey, secret: kept.secret, settings });
  } finally { await page.close(); }
}
