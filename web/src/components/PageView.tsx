"use client";

import React from "react";
import { Block } from "../types/book";
import BlockRenderer from "./BlockRenderer";

interface Props {
  blocks: Block[];
  imagesBase: string;
}

/** Get approximate [minX, minY, maxX, maxY] from polygon bbox */
function getBounds(bbox?: number[][]): { minX: number; minY: number; maxX: number; maxY: number } | null {
  if (!bbox || bbox.length < 2) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const pt of bbox) {
    if (!pt || pt.length < 2) continue;
    minX = Math.min(minX, pt[0]);
    minY = Math.min(minY, pt[1]);
    maxX = Math.max(maxX, pt[0]);
    maxY = Math.max(maxY, pt[1]);
  }
  if (!isFinite(minX)) return null;
  return { minX, minY, maxX, maxY };
}

/**
 * Group blocks into rows when they sit side-by-side (similar Y, different X).
 * Falls back to sequential single-column if no bbox data.
 */
function groupIntoRows(blocks: Block[]): Block[][] {
  const withBounds = blocks.map((b, i) => ({
    block: b,
    bounds: getBounds(b.bbox),
    index: i,
  }));

  // If almost no bbox info, just sequential
  const hasBbox = withBounds.filter((x) => x.bounds).length > blocks.length * 0.3;
  if (!hasBbox) {
    return blocks.map((b) => [b]);
  }

  // Sort by top Y then left X
  const sorted = [...withBounds].sort((a, b) => {
    const ay = a.bounds?.minY ?? a.index * 1000;
    const by = b.bounds?.minY ?? b.index * 1000;
    if (Math.abs(ay - by) > 18) return ay - by;
    const ax = a.bounds?.minX ?? 0;
    const bx = b.bounds?.minX ?? 0;
    return ax - bx;
  });

  const rows: typeof withBounds[] = [];
  let currentRow: typeof withBounds = [];
  let currentY: number | null = null;

  for (const item of sorted) {
    const y = item.bounds?.minY ?? null;
    if (currentY === null || y === null || Math.abs(y - currentY) <= 22) {
      currentRow.push(item);
      if (y !== null) currentY = currentY === null ? y : Math.min(currentY, y);
    } else {
      if (currentRow.length) rows.push(currentRow);
      currentRow = [item];
      currentY = y;
    }
  }
  if (currentRow.length) rows.push(currentRow);

  return rows.map((row) =>
    row
      .sort((a, b) => (a.bounds?.minX ?? 0) - (b.bounds?.minX ?? 0))
      .map((x) => x.block)
  );
}

export default function PageView({ blocks, imagesBase }: Props) {
  const rows = groupIntoRows(blocks);

  return (
    <div className="book-page space-y-1">
      {rows.map((row, ri) => {
        const multi = row.length > 1;
        return (
          <div
            key={ri}
            className={
              multi
                ? "grid gap-6 my-3 items-start"
                : "my-1"
            }
            style={
              multi
                ? { gridTemplateColumns: `repeat(${Math.min(row.length, 3)}, minmax(0, 1fr))` }
                : undefined
            }
          >
            {row.map((block, bi) => (
              <div key={block.id || `${ri}-${bi}`} className={multi ? "min-w-0" : ""}>
                <BlockRenderer block={block} imagesBase={imagesBase} />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
