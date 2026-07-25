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
  const text = (b.text || "").trim();
  return /^(fig\.?|figure)\s*\d/i.test(text);
}

function isCalloutTitleBlock(b: Block): boolean {
  const text = (b.text || "").toLowerCase().replace(/[^a-z\s]/g, "").trim();
  if (!text) return false;
  return (
    text === "think and reflect" ||
    text.startsWith("think and reflect") ||
    text === "try these" ||
    text.startsWith("try these") ||
    text.startsWith("do this") ||
    text.startsWith("activity")
  );
}

/**
 * Only blocks that truly belong inside the peach box:
 * - short questions (?)
 * - numbered / roman list items
 * NOT long narrative notes that come after the box in the book.
 */
function isCalloutBodyBlock(b: Block): boolean {
  const t = (b.type || "").toLowerCase();
  const text = (b.text || "").trim();
  if (!text) return false;

  // never pull these into the box
  if (isCalloutTitleBlock(b)) return false;
  if (isImageBlock(b) || isCaptionBlock(b)) return false;
  if (t.includes("table")) return false;
  if (/^example\s*\d+/i.test(text)) return false;
  if (/exercise\s*set/i.test(text)) return false;
  if (/^\d+\.\d+\s/i.test(text) && text.length < 100) return false;

  if (
    t.includes("sectionheader") ||
    t.includes("title") ||
    t === "heading" ||
    t.includes("section_header")
  ) {
    return false;
  }

  // narrative openers that sit AFTER the box in NCERT
  if (
    /^(note that|thus,|therefore,|hence,|we observe|observe that|in this chapter|as we have|let us|now we)/i.test(
      text
    )
  ) {
    return false;
  }

  // long paragraph without question/list markers → body text, not callout
  const isListLike =
    /^\d+\s*[\.)]/.test(text) ||
    /\(\s*(?:i|ii|iii|iv|v)\s*\)/i.test(text) ||
    /^[-•]/.test(text);

  const isQuestion = /\?\s*$/.test(text) || (text.includes("?") && text.length < 280);

  if (text.length > 180 && !isListLike && !isQuestion) {
    return false;
  }

  // accept short prompts, questions, and list items
  if (isQuestion || isListLike || text.length < 200) {
    return true;
  }

  return false;
}

function attachCaptions(blocks: Block[]): Block[] {
  const out: Block[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const cur = blocks[i];
    const next = blocks[i + 1];

    if (isImageBlock(cur) && next && isCaptionBlock(next)) {
      const captionText = (next.text || "").trim();
      out.push({
        ...cur,
        text: captionText || cur.text,
      });
      i++;
      continue;
    }

    if (isCaptionBlock(cur) && !isImageBlock(cur)) {
      out.push({ ...cur, type: "Caption" });
      continue;
    }

    out.push(cur);
  }
  return out;
}

/**
 * Group "Think and Reflect" + only the following body blocks that belong in the box.
 * Stops as soon as a non-body block appears (so "Note that..." stays outside).
 */
function groupCallouts(blocks: Block[]): Block[] {
  const out: Block[] = [];
  let i = 0;
  while (i < blocks.length) {
    const cur = blocks[i];
    if (isCalloutTitleBlock(cur)) {
      const title = (cur.text || "Think and Reflect").trim();
      const body: Block[] = [];
      let j = i + 1;
      // only consume consecutive body-eligible blocks
      while (j < blocks.length && isCalloutBodyBlock(blocks[j])) {
        body.push(blocks[j]);
        j++;
        // safety: callout boxes in NCERT are small — max ~6 body blocks
        if (body.length >= 6) break;
      }
      out.push({
        id: cur.id || `callout-${i}`,
        type: "Callout",
        text: title,
        children: body,
      });
      i = j;
      continue;
    }
    out.push(cur);
    i++;
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
    if ((cur.b.type || "").toLowerCase() === "callout") {
      rows.push([cur.b]);
      i++;
      continue;
    }

    const row: Block[] = [cur.b];
    let j = i + 1;

    while (j < items.length) {
      const next = items[j];
      if ((next.b.type || "").toLowerCase() === "callout") break;
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
  const blocks = groupCallouts(attachCaptions(page.blocks || []));
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
