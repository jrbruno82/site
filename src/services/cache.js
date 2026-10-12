const store = new Map();

export function withCache(key, loader, ttlMs = 300000) {
  const cached = store.get(key);
  if (cached && Date.now() - cached.timestamp < ttlMs) {
    return Promise.resolve(cached.value);
  }

  return Promise.resolve(loader()).then((value) => {
    store.set(key, { value, timestamp: Date.now() });
    return value;
  });
}

export function clearCache() {
  store.clear();
}
