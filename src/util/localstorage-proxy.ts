// LocalStorageSync: A function that creates an object that syncs top-level properties to localStorage
export function LocalStorageSync<T extends Record<string, unknown>>(
  initial: T
): T {
  // Initialize from localStorage or use initial values
  const stored = localStorage.getItem("localStorageSync");
  let target: T;
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      target = { ...initial, ...parsed };
    } catch {
      target = { ...initial };
    }
  } else {
    target = { ...initial };
  }

  // Create proxy to intercept property access
  return new Proxy(target, {
    get(obj, prop) {
      const key = String(prop);
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : obj[key as keyof T];
    },
    set(obj, prop, value) {
      const key = String(prop);
      if (value === null) {
        localStorage.removeItem(key);
        delete obj[key as keyof T];
      } else {
        localStorage.setItem(key, JSON.stringify(value));
        obj[key as keyof T] = value;
      }
      return true;
    },
  }) as T;
}
