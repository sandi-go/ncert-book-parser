import React from "react";
import { Block } from "../types/book";

interface Props {
  block: Block;
  imagesBase?: string;
}

function cleanText(text?: string): string {
  if (!text) return "";
  // Preserve intentional line breaks, collapse excessive spaces only
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default function BlockRenderer({ block, imagesBase = "" }: Props) {
  const type = (block.type || "").toLowerCase();
  const text = cleanText(block.text);

  // ---------- Headings ----------
  if (
    type.includes("sectionheader") ||
    type.includes("title") ||
    type === "heading" ||
    type.includes("section_header")
  ) {
    const level = Math.min(Math.max(block.level || 1, 1), 4);
    const sizes = ["text-2xl mt-8 mb-4", "text-xl mt-7 mb-3", "text-lg mt-6 mb-2", "text-base mt-5 mb-2"];
    const Tag = (`h${level}` as "h1" | "h2" | "h3" | "h4");
    return (
      <Tag
        className={`font-serif font-bold text-[#1a1520] tracking-tight leading-snug ${sizes[level - 1]}`}
      >
        {text}
      </Tag>
    );
  }

  // ---------- Images / Figures ----------
  if (type.includes("picture") || type.includes("figure") || type.includes("image")) {
    if (block.image) {
      let src = block.image;
      if (!src.startsWith("http") && !src.startsWith("/")) {
        // avoid double "images/"
        const base = imagesBase.replace(/\/$/, "");
        const img = src.replace(/^images\//, "");
        src = `/${base}/${img}`.replace(/\/+/g, "/");
      }
      return (
        <figure className="my-6 text-center">
          <img
            src={src}
            alt={text || "Figure"}
            className="max-w-full h-auto mx-auto rounded-sm border border-[#ddd5c4] shadow-sm"
            loading="lazy"
          />
          {text && (
            <figcaption className="text-sm text-[#6b6355] mt-2 font-serif italic leading-relaxed">
              {text}
            </figcaption>
          )}
        </figure>
      );
    }
  }

  // ---------- Tables ----------
  if (type.includes("table")) {
    if (block.html) {
      return (
        <div
          className="my-5 overflow-x-auto book-table text-sm"
          dangerouslySetInnerHTML={{ __html: block.html }}
        />
      );
    }
    if (text) {
      return (
        <pre className="my-4 p-3 bg-[#f7f3ea] border border-[#e0d8c8] rounded text-sm overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed text-[#2a2418]">
          {text}
        </pre>
      );
    }
  }

  // ---------- Code ----------
  if (type.includes("code")) {
    return (
      <pre className="my-4 p-3 bg-[#2a2418] text-[#e8e0d0] rounded text-sm overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
        {text}
      </pre>
    );
  }

  // ---------- Lists ----------
  if (type.includes("listgroup") || type === "list") {
    return (
      <ul className="my-3 ml-1 space-y-1.5 list-none">
        {block.children?.map((child, i) => (
          <BlockRenderer key={child.id || i} block={child} imagesBase={imagesBase} />
        ))}
        {!block.children?.length && text && (
          <li className="flex gap-2 text-[#2a2418] font-serif leading-7">
            <span className="text-[#8a7f6a] shrink-0">•</span>
            <span className="whitespace-pre-wrap">{text}</span>
          </li>
        )}
      </ul>
    );
  }

  if (type.includes("listitem") || type === "list_item") {
    return (
      <li className="flex gap-2 my-1 text-[#2a2418] font-serif leading-7">
        <span className="text-[#8a7f6a] shrink-0 select-none">•</span>
        <div className="min-w-0 flex-1">
          {text && <span className="whitespace-pre-wrap">{text}</span>}
          {block.children?.map((child, i) => (
            <BlockRenderer key={child.id || i} block={child} imagesBase={imagesBase} />
          ))}
        </div>
      </li>
    );
  }

  // ---------- Equations / Math ----------
  if (type.includes("equation") || type.includes("math") || type.includes("formula")) {
    return (
      <div className="my-5 px-4 py-3 bg-[#f7f3ea] border-l-4 border-[#6b8cae] rounded-r text-center font-serif text-[#1a1520] text-lg leading-relaxed overflow-x-auto">
        <span className="whitespace-pre-wrap">{text || block.html || ""}</span>
      </div>
    );
  }

  // ---------- Caption / Footnote ----------
  if (type.includes("caption") || type.includes("footnote") || type.includes("footer")) {
    return (
      <p className="my-2 text-sm text-[#6b6355] font-serif italic leading-relaxed whitespace-pre-wrap">
        {text}
      </p>
    );
  }

  // ---------- Page header (usually skip, but show subtly if present) ----------
  if (type.includes("pageheader") || type.includes("page_header")) {
    return null;
  }

  // ---------- Default: Text / Paragraph ----------
  if (text) {
    // If text has multiple lines that look like short lines (poem / exercise items),
    // preserve line breaks instead of justifying into one blob
    const lines = text.split("\n").filter((l) => l.trim().length > 0);
    const shortLines = lines.length > 1 && lines.every((l) => l.length < 80);

    if (shortLines) {
      return (
        <div className="my-3 font-serif text-[#2a2418] leading-8 whitespace-pre-wrap">
          {text}
        </div>
      );
    }

    return (
      <p className="my-3 font-serif text-[#2a2418] leading-8 text-[17px] whitespace-pre-wrap">
        {text}
      </p>
    );
  }

  // ---------- HTML fallback (richer Marker output) ----------
  if (block.html) {
    return (
      <div
        className="my-3 font-serif text-[#2a2418] leading-8 book-html prose prose-stone max-w-none"
        dangerouslySetInnerHTML={{ __html: block.html }}
      />
    );
  }

  // ---------- Recursive children ----------
  if (block.children && block.children.length > 0) {
    return (
      <div className="my-1 space-y-1">
        {block.children.map((child, i) => (
          <BlockRenderer key={child.id || i} block={child} imagesBase={imagesBase} />
        ))}
      </div>
    );
  }

  return null;
}
