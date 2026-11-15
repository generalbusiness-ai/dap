/** Forward lazily; materialize only truthful descriptors and guarded values. */
export function guardObject<T extends object>(value: T, read: (key: PropertyKey) => unknown): T {
  const mirror = Array.isArray(value) ? [] : Object.create(Object.getPrototypeOf(value));
  Object.setPrototypeOf(mirror, Object.getPrototypeOf(value));
  const keys = new Set(Reflect.ownKeys(value));
  const descriptors = new Map<PropertyKey, PropertyDescriptor | undefined>();
  const values = new Map<PropertyKey, unknown>();
  for (const key of keys) {
    if (Array.isArray(value) && key === "length") {
      const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
      descriptors.set(key, descriptor);
      Object.defineProperty(mirror, key, descriptor);
      values.set(key, descriptor.value);
    } else Object.defineProperty(mirror, key, { configurable: true, enumerable: true, writable: true, value: undefined });
  }
  if (!Object.isExtensible(value)) Object.preventExtensions(mirror);
  const descriptorOf = (key: PropertyKey): PropertyDescriptor | undefined => {
    if (!descriptors.has(key)) descriptors.set(key, Object.getOwnPropertyDescriptor(value, key));
    return descriptors.get(key);
  };
  const resolved = (key: PropertyKey): unknown => {
    const descriptor = descriptorOf(key);
    if ((!descriptor || "value" in descriptor) && values.has(key)) return values.get(key);
    const answer = read(key);
    if (!descriptor || "value" in descriptor) values.set(key, answer);
    return answer;
  };
  return new Proxy(mirror, {
    get: (_target, key) => resolved(key),
    getOwnPropertyDescriptor: (target, key) => {
      const descriptor = descriptorOf(key);
      if (!descriptor) return undefined;
      // Public missing values use data properties plus the read resolver.
      // Existing represented accessors retain their getter/setter identity.
      const guarded = "value" in descriptor ? { ...descriptor, value: resolved(key) } : descriptor;
      // Resolve before restoring frozen flags. Future reads reuse this exact
      // guarded value, including a child of a nonwritable data property.
      Object.defineProperty(target, key, guarded);
      return guarded;
    },
  }) as T;
}
