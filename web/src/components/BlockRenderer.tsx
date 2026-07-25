import React from "react";
import { Block } from "../types/book";

interface Props {
  block: Block;
  imagesBase?: string;
  compact?: boolean;
}

function cleanText(text?: string): string {
  if (!text) return "";
  return text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function imageSrc(image: string, imagesBase: string): string {
  if (image.startsWith("http") || image.startsWith("/")) return image;
  const base = (imagesBase || "data").replace(/\/$/, "");
  // image is like "images/img_0001_xxx.png"
  return `/${base}/${image}`.replace(/\/+/g, "/");
}

export default function BlockRenderer({ block, imagesBase = "data", compact = false }: Props) {
  const type = (block.type || "").toLowerCase();
  const text = cleanText(block.text);
  const mt = compact ? "mt-0 mb-1" : "my-3";

  // Headings
  if (
    type.includes("sectionheader") ||
    type.includes("title") ||
    type === "heading" ||
    type.includes("section_header")
  ) {
    const level = Math.min(Math.max(block.level || 1, 1), 4);
    const sizes = [
      "text-xl sm:text-2xl font-bold",
      "text-lg sm:text-xl font-bold",
      "text-base sm:text-lg font-semibold",
      "text-base font-semibold",
    ];
    const Tag = (`h${level}` as "h1" | "h2" | "h3" | "h4");
    return (
      <Tag className={`font-serif text-[#1a1520] leading-snug ${sizes[level - 1]} ${compact ? "mb-1" : "mt-6 mb-3"}`}>
        {text}
      </Tag>
    );
  }

  // Images
  if (type.includes("picture") || type.includes("figure") || type.includes("image") || type.includes("diagram")) {
    if (block.image) {
      const src = imageSrc(block.image, imagesBase);
      return (
        <figure className={`${compact ? "my-1" : "my-4"} text-center`}>
          <img
            src={src}
            alt={text || "Figure"}
            className="max-w-full h-auto mx-auto rounded-sm border border-[#ddd5c4] shadow-sm bg-white"
            loading="lazy"
            onError={(e) => {
              // show broken path for debug
              const el = e.currentTarget;
              el.style.display = "none";
              const sib = el.nextElementSibling as HTMLElement | null;
              if (sib) sib.style.display = "block";
            }}
          />
          <div className="hidden text-xs text-red-600 mt-1">Image missing: {src}</div>
          {text && (
            <figcaption className="text-xs sm:text-sm text-[#6b6355] mt-1 font-serif italic leading-relaxed">
              {text}
            </figcaption>
          )}
        </figure>
      );
    }
  }

  // Tables
  if (type.includes("table")) {
    if (block.html) {
      return (
        <div
          className={`${mt} overflow-x-auto book-table text-sm`}
          dangerouslySetInnerHTML={{ __html: block.html }}
        />
      );
    }
    if (text) {
      return (
        <pre className={`${mt} p-2 bg-[#f7f3ea] border border-[#e0d8c8] rounded text-xs sm:text-sm overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed`}>
          {text}
        </pre>
      );
    }
  }

  // Lists
  if (type.includes("listgroup") || type === "list") {
    return (
      <ul className={`${compact ? "my-1" : "my-2"} ml-0 space-y-1 list-none`}>
        {block.children?.map((child, i) => (
          <BlockRenderer key={child.id || i} block={child} imagesBase={imagesBase} compact={compact} />
        ))}
        {!block.children?.length && text && (
          <li className="flex gap-2 text-[#2a2418] font-serif leading-7 text-[15px]">
            <span className="text-[#8a7f6a] shrink-0">•</span>
            <span className="whitespace-pre-wrap">{text}</span>
          </li>
        )}
      </ul>
    );
  }

  if (type.includes("listitem") || type === "list_item") {
    return (
      <li className="flex gap-2 my-0.5 text-[#2a2418] font-serif leading-7 text-[15px]">
        <span className="text-[#8a7f6a] shrink-0 select-none">•</span>
        <div className="min-w-0 flex-1">
          {text && <span className="whitespace-pre-wrap">{text}</span>}
          {block.children?.map((child, i) => (
            <BlockRenderer key={child.id || i} block={child} imagesBase={imagesBase} compact={compact} />
          ))}
        </div>
      </li>
    );
  }

  // Equations
  if (type.includes("equation") || type.includes("math") || type.includes("formula")) {
    return (
      <div className={`${compact ? "my-1 py-1" : "my-4 py-2"} px-2 bg-[#f7f3ea] border-l-4 border-[#6b8cae] rounded-r text-center font-serif text-[#1a1520] overflow-x-auto`}>
        <span className="whitespace-pre-wrap text-base sm:text-lg">{text || block.html || ""}</span>
      </div>
    );
  }

  if (type.includes("caption") || type.includes("footnote")) {
    return (
      <p className="my-1 text-xs sm:text-sm text-[#6b6355] font-serif italic leading-relaxed whitespace-pre-wrap">
        {text}
      </p>
    );
  }

  if (type.includes("pageheader") || type.includes("page_header") || type.includes("pagefooter")) {
    return null;
  }

  // Text
  if (text) {
    const lines = text.split("\n").filter((l) => l.trim().length > 0);
    const shortLines = lines.length > 1 && lines.every((l) => l.length < 90);
    return (
      <p
        className={`${compact ? "my-0.5" : "my-2"} font-serif text-[#2a2418] leading-7 text-[15px] sm:text-[16px] whitespace-pre-wrap ${
          shortLines ? "" : ""
        }`}
      >
        {text}
      </p>
    );
  }

  if (block.html) {
    return (
      <div
        className={`${mt} font-serif text-[#2a2418] leading-7 book-html text-[15px]`}
        dangerouslySetInnerHTML={{ __html: block.html }}
      />
    );
  }

  if (block.children && block.children.length > 0) {
    return (
      <div className="space-y-1">
        {block.children.map((child, i) => (
          <BlockRenderer key={child.id || i} block={child} imagesBase={imagesBase} compact={compact} />
        ))}
      </div>
    );
  }

  return null;
}
