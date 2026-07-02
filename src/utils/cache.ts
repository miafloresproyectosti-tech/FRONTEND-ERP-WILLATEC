type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();
const inFlightRequests = new Map<string, Promise<unknown>>();

const now = () => Date.now();

function readLocalCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed || parsed.expiresAt <= now()) {
      localStorage.removeItem(key);
      return null;
    }

    memoryCache.set(key, parsed);
    return parsed.value;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

function writeCache<T>(key: string, value: T, ttlMs: number, persist: boolean) {
  const entry: CacheEntry<T> = {
    expiresAt: now() + ttlMs,
    value,
  };

  memoryCache.set(key, entry);

  if (!persist) return;

  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // localStorage can fail in private mode or when quota is full.
  }
}

export function clearCache(key: string) {
  memoryCache.delete(key);
  inFlightRequests.delete(key);
  localStorage.removeItem(key);
}

export function clearCacheByPrefix(prefix: string) {
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }

  for (const key of inFlightRequests.keys()) {
    if (key.startsWith(prefix)) {
      inFlightRequests.delete(key);
    }
  }

  try {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(prefix)) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // localStorage can fail in private mode or when quota is full.
  }
}

export async function cachedRequest<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: { ttlMs: number; persist?: boolean; force?: boolean }
): Promise<T> {
  const persist = options.persist ?? true;

  if (!options.force) {
    const memoryEntry = memoryCache.get(key) as CacheEntry<T> | undefined;
    if (memoryEntry && memoryEntry.expiresAt > now()) {
      return memoryEntry.value;
    }

    if (persist) {
      const localValue = readLocalCache<T>(key);
      if (localValue !== null) return localValue;
    }

    const currentRequest = inFlightRequests.get(key) as Promise<T> | undefined;
    if (currentRequest) return currentRequest;
  }

  const request = fetcher()
    .then((value) => {
      writeCache(key, value, options.ttlMs, persist);
      return value;
    })
    .finally(() => {
      inFlightRequests.delete(key);
    });

  inFlightRequests.set(key, request);
  return request;
}
