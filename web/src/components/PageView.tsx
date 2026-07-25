"use client";

import React from "react";
import { Block, Page } from "../types/book";
import BlockRenderer from "./BlockRenderer";

interface Props {
  page: Page;
  imagesBase: string;
}

function isImageBlock(b: Block): boolean {
  const t = (b.type || "").toLowerCase();
  return t.includes("picture") || t.includes("figure") || t.includes("image") || t.includes("diagram");
}

function isCaptionBlock(b: Block): boolean {
  const t = (b.type || "").toLowerCase();
  if (t.includes("caption")) return true;
  // Marker sometimes emits Fig. as plain Text
  const text = (b.text || "").trim();
  return /^(fig\.?|figure)\s*\d/i.test(text);
}

/**
 * Merge a following caption into the image block so they render as one unit
 * (caption always under the image, centered).
 */
function attachCaptions(blocks: Block[]): Block[] {
  const out: Block[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const cur = blocks[i];
    const next = blocks[i + 1];

    if (isImageBlock(cur) && next && isCaptionBlock(next)) {
      const captionText = (next.text || "").trim();
      out.push({
        ...cur,
        // prefer explicit caption; don't overwrite if image already has text that isn't a path
        text: captionText || cur.text,
      });
      i++; // skip caption block
      continue;
    }

    // orphan caption with no image above — still show centered as caption
    if (isCaptionBlock(cur) && !isImageBlock(cur)) {
      out.push({ ...cur, type: "Caption" });
      continue;
    }

    out.push(cur);
  }
  return out;
}

function boundsOf(block: Block): { x1: number; y1: number; x2: number; y2: number } | null {
  if (block.rel) {
    return {
      x1: block.rel.x,
      y1: block.rel.y,
      x2: block.rel.x + block.rel.w,
      y2: block.rel.y + block.rel.h,
    };
  }
  if (block.bbox && block.bbox.length >= 4) {
    return { x1: block.bbox[0], y1: block.bbox[1], x2: block.bbox[2], y2: block.bbox[3] };
  }
  return null;
}

function groupRows(blocks: Block[]): Block[][] {
  if (blocks.length === 0) return [];

  const items = blocks.map((b, i) => ({ b, i, bounds: boundsOf(b) }));
  const hasGeo = items.filter((x) => x.bounds).length >= Math.max(2, blocks.length * 0.35);

  if (!hasGeo) {
    return blocks.map((b) => [b]);
  }

  const rows: Block[][] = [];
  let i = 0;
  while (i < items.length) {
    const cur = items[i];
    const row: Block[] = [cur.b];
    let j = i + 1;

    while (j < items.length) {
      const next = items[j];
      if (!cur.bounds || !next.bounds) break;

      const sameBand =
        Math.abs(cur.bounds.y1 - next.bounds.y1) < 4 ||
        (next.bounds.y1 >= cur.bounds.y1 - 2 && next.bounds.y1 <= cur.bounds.y2 - 2);

      const sideBySide = next.bounds.x1 >= cur.bounds.x2 - 2 || cur.bounds.x1 >= next.bounds.x2 - 2;

      if (sameBand && sideBySide && Math.abs(cur.bounds.x1 - next.bounds.x1) > 15) {
        row.push(next.b);
        j++;
      } else {
        break;
      }
    }

    if (row.length > 1) {
      row.sort((a, b) => {
        const ba = boundsOf(a);
        const bb = boundsOf(b);
        return (ba?.x1 ?? 0) - (bb?.x1 ?? 0);
      });
    }

    rows.push(row);
    i = j;
  }

  return rows;
}

export default function PageView({ page, imagesBase }: Props) {
  const blocks = attachCaptions(page.blocks || []);
  const rows = groupRows(blocks);

  return (
    <div className="book-page">
      {rows.map((row, ri) => {
        if (row.length === 1) {
          return (
            <div key={ri} className="block-row single">
              <BlockRenderer block={row[0]} imagesBase={imagesBase} />
            </div>
          );
        }
        return (
          <div
            key={ri}
            className="block-row multi grid gap-4 my-3 items-start"
            style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}
          >
            {row.map((block, bi) => (
              <div key={block.id || `${ri}-${bi}`} className="min-w-0">
                <BlockRenderer block={block} imagesBase={imagesBase} />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
