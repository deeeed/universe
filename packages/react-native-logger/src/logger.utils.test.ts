/* eslint-disable @typescript-eslint/no-explicit-any */
import { safeStringify, coerceToString } from './logger.utils';

describe('logger.utils', () => {
  describe('safeStringify', () => {
    it('should stringify a simple object', () => {
      const obj = { a: 1, b: 'string', c: true };
      expect(safeStringify(obj)).toBe('{"a":1,"b":"string","c":true}');
    });

    it('should handle circular references', () => {
      const obj: any = { a: 1 };
      obj.b = obj;
      expect(safeStringify(obj)).toBe('{"a":1,"b":"[Circular]"}');
    });

    it('should use the provided space parameter', () => {
      const obj = { a: 1, b: 'string' };
      expect(safeStringify(obj, 2)).toBe('{\n  "a": 1,\n  "b": "string"\n}');
    });

    it('should handle nested objects with circular references', () => {
      const obj: any = { a: 1, b: { c: 2 } };
      obj.b.d = obj;
      expect(safeStringify(obj)).toBe('{"a":1,"b":{"c":2,"d":"[Circular]"}}');
    });

    it('should handle arrays with circular references', () => {
      const arr: any[] = [1, 2, 3];
      arr.push(arr);
      expect(safeStringify(arr)).toBe('[1,2,3,"[Circular]"]');
    });
  });

  describe('coerceToString', () => {
    it('should return an empty string for undefined', () => {
      expect(coerceToString(undefined)).toBe('');
    });

    it('should return the same string for string input', () => {
      expect(coerceToString('test')).toBe('test');
    });

    it('should stringify numbers', () => {
      expect(coerceToString(123)).toBe('123');
    });

    it('should stringify booleans', () => {
      expect(coerceToString(true)).toBe('true');
      expect(coerceToString(false)).toBe('false');
    });

    it('should stringify null', () => {
      expect(coerceToString(null)).toBe('null');
    });

    it('should stringify arrays', () => {
      expect(coerceToString([1, 2, 3])).toBe('[1,2,3]');
    });

    it('should stringify objects', () => {
      expect(coerceToString({ a: 1, b: 'test' })).toBe('{"a":1,"b":"test"}');
    });

    it('should handle circular references', () => {
      const obj: any = { a: 1 };
      obj.b = obj;
      expect(coerceToString(obj)).toBe('{"a":1,"b":"[Circular]"}');
    });

    it('should handle complex nested structures', () => {
      const complex = {
        a: 1,
        b: [2, 3, { c: 4 }],
        d: { e: 5, f: [6, 7] },
      };
      expect(coerceToString(complex)).toBe(
        '{"a":1,"b":[2,3,{"c":4}],"d":{"e":5,"f":[6,7]}}'
      );
    });
  });
});
