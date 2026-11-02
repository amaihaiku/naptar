// Small assertion adapter for the Node.js built-in test runner. No browser or IPC pool required.
import assert from "node:assert/strict";
import { it as nodeIt, describe, before as beforeAll } from "node:test";
export { describe, beforeAll };
export function it(
  name: string,
  run: () => unknown | Promise<unknown>,
  timeout = 30000,
) {
  return nodeIt(name, { timeout }, async () => {
    await run();
  });
}
export function each<T>(rows: readonly T[]) {
  return (
    name: string,
    run: (...args: any[]) => unknown | Promise<unknown>,
  ) => {
    for (const row of rows) {
      const args = Array.isArray(row) ? row : [row];
      it(`${name} [${args.join(", ")}]`, () => run(...args));
    }
  };
}
export function expect(actual: any) {
  return {
    toBe: (expected: any) => assert.strictEqual(actual, expected),
    toEqual: (expected: any) => assert.deepStrictEqual(actual, expected),
    toBeNull: () => assert.strictEqual(actual, null),
    toHaveLength: (expected: number) =>
      assert.strictEqual(actual.length, expected),
    toContain: (expected: any) =>
      assert.ok(
        actual.includes(expected),
        `Expected ${String(actual)} to contain ${expected}`,
      ),
    toBeGreaterThan: (expected: number) =>
      assert.ok(actual > expected, `Expected ${actual} > ${expected}`),
    toBeGreaterThanOrEqual: (expected: number) =>
      assert.ok(actual >= expected, `Expected ${actual} >= ${expected}`),
    toBeLessThanOrEqual: (expected: number) =>
      assert.ok(actual <= expected, `Expected ${actual} <= ${expected}`),
    toBeCloseTo: (expected: number, digits = 2) =>
      assert.ok(
        Math.abs(actual - expected) < Math.pow(10, -digits) / 2,
        `Expected ${actual} close to ${expected}`,
      ),
    toThrow: () => assert.throws(actual),
    not: {
      toContain: (expected: any) =>
        assert.ok(
          !actual.includes(expected),
          `Expected ${String(actual)} not to contain ${expected}`,
        ),
    },
  };
}
