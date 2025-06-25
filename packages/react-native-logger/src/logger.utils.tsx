/**
 * Safely stringifies an object, handling circular references.
 * @param obj - The object to stringify.
 * @param space - The space argument for JSON.stringify.
 * @returns The stringified object.
 */
export const safeStringify = (
  obj: unknown,
  space?: string | number
): string => {
  const cache = new Set();
  const result = JSON.stringify(
    obj,
    (_key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (cache.has(value)) {
          return '[Circular]';
        }
        cache.add(value);
      }
      return value;
    },
    space
  );
  cache.clear();
  return result;
};

/**
 * Converts an unknown parameter to a string.
 * @param param - The parameter to convert.
 * @returns The stringified parameter.
 */
export const coerceToString = (param: unknown): string => {
  if (param === undefined) {
    return '';
  }

  if (typeof param === 'string') {
    return param;
  }

  try {
    return JSON.stringify(param);
  } catch {
    return safeStringify(param);
  }
};
