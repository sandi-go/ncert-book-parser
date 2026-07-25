"use client";

import React from "react";
import { Block, Page } from "../types/book";
import BlockRenderer from "./BlockRenderer";

interface Props {
  page: Page;
  imagesBase: string;
}

/**
 * Accurate placement mode:
 * If enough blocks have `rel` percentages, render them inside a
 * position:relative page using absolute positioning — preserves
 * left/right columns and vertical spacing from the PDF.
 *
 * Fallback: sequential flow with smart row grouping.
 */
export default function PageView({ page, imagesBase }: Props) {
  const blocks = page.blocks || [];
  const withRel = blocks.filter((b) => b.rel && b.rel.w > 0 && b.rel.h > 0);
  const useAbsolute = withRel.length >= Math.max(2, blocks.length * 0.4);

  const aspect = page.aspect && page.aspect > 0 ? page.aspect : 0.707; // A4-ish default
  // height as % of width container → padding-bottom trick
  const heightPct = (1 / aspect) * 100;

  if (useAbsolute) {
    return (
      <div
        className="relative w-full bg-transparent"
        style={{ paddingBottom: `${heightPct}%` }}
      >
        <div className="absolute inset-0">
          {blocks.map((block, i) => {
            const rel = block.rel;
            if (!rel) {
              // no coords — append in normal flow at bottom area
              return (
                <div
                  key={block.id || i}
                  className="relative px-1 py-1"
                  style={{ marginTop: "0.25rem" }}
                >
                  <BlockRenderer block={block} imagesBase={imagesBase} />
                </div>
              );
            }
            return (
              <div
                key={block.id || i}
                className="absolute overflow-hidden"
                style={{
                  left: `${rel.x}%`,
                  top: `${rel.y}%`,
                  width: `${Math.max(rel.w, 8)}%`,
                  // min height hint; content can grow
                  minHeight: `${rel.h}%`,
                }}
              >
                <BlockRenderer block={block} imagesBase={imagesBase} compact />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Sequential fallback with row detection
  return (
    <div className="book-page space-y-2">
      {blocks.map((block, i) => (
        <div key={block.id || i} className="my-1">
          <BlockRenderer block={block} imagesBase={imagesBase} />
        </div>
      ))}
    </div>
  );
}
