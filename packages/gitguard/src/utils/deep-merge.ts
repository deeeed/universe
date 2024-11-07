import type { DeepPartial } from "../types/config.types.js";

export function deepMerge<T extends object>(...objects: DeepPartial<T>[]): T {
  const isObject = (obj: unknown): obj is Record<string, unknown> =>
    Boolean(obj && typeof obj === "object" && !Array.isArray(obj));

  return objects.reduce((prev: Partial<T>, obj: DeepPartial<T>) => {
    if (!obj) return prev;

    Object.keys(obj).forEach((key) => {
      const k = key as keyof T;
      const pVal = prev[k];
      const oVal = obj[k];

      if (isObject(pVal) && isObject(oVal)) {
        prev[k] = deepMerge(pVal, oVal) as T[keyof T];
      } else {
        prev[k] = (oVal ?? prev[k]) as T[keyof T];
      }
    });

    return prev;
  }, {}) as T;
}
