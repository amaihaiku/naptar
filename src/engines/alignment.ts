import type { Box } from "../model";
type Rect = Pick<Box, "x" | "y" | "w" | "h">;
export function emptySpaceTargets(
  moving: Rect,
  peers: Rect[],
  page: Rect,
  axis: "x" | "y",
) {
  const cross = axis === "x" ? "y" : "x";
  const length = axis === "x" ? "w" : "h";
  const crossLength = axis === "x" ? "h" : "w";
  const start = page[axis],
    end = start + page[length];
  const intervals = peers
    .filter(
      (peer) =>
        peer[cross] < moving[cross] + moving[crossLength] &&
        peer[cross] + peer[crossLength] > moving[cross],
    )
    .map(
      (peer) =>
        [
          Math.max(start, peer[axis]),
          Math.min(end, peer[axis] + peer[length]),
        ] as const,
    )
    .filter(([a, b]) => a < b)
    .sort((a, b) => a[0] - b[0]);
  const gaps: Array<[number, number]> = [];
  let cursor = start;
  for (const [a, b] of intervals) {
    if (a > cursor) gaps.push([cursor, a]);
    cursor = Math.max(cursor, b);
  }
  if (cursor < end) gaps.push([cursor, end]);
  return gaps
    .filter(([a, b]) => b - a >= moving[length])
    .flatMap(([a, b]) =>
      (
        [
          [0.5, "1/2"],
          [1 / 3, "1/3"],
          [2 / 3, "2/3"],
        ] as const
      ).map(([ratio, label]) => ({ position: a + (b - a) * ratio, label })),
    );
}
