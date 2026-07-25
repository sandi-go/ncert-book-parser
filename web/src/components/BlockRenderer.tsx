import React from "react";
import { Block } from "../types/book";

interface Props {
  block: Block;
  imagesBase?: string;
  compact?: boolean;
}

/** Light cleanup of Marker / LaTeX-ish text for readable display */
function formatText(raw?: string): string {
  if (!raw) return "";
  let t = raw;

  // common latex leftovers from Marker fast mode
  t = t.replace(/\\times/g, "×");
  t = t.replace(/\\div/g, "÷");
  t = t.replace(/\\geq/g, "≥");
  t = t.replace(/\\leq/g, "≤");
  t = t.replace(/\\neq/g, "≠");
  t = t.replace(/\\pm/g, "±");
  t = t.replace(/\\cdot/g, "·");
  t = t.replace(/\\ldots/g, "…");
  t = t.replace(/\\dots/g, "…");
  t = t.replace(/\\rupee\{?\}?/gi, "₹");
  t = t.replace(/\\Rs\.?/gi, "₹");
  t = t.replace(/\$\\mathrm\{Rs\}\$/gi, "₹");
  t = t.replace(/\\mathrm\{([^}]+)\}/g, "$1");
  t = t.replace(/\\text\{([^}]+)\}/g, "$1");
  t = t.replace(/\\mathrm/g, "");
  t = t.replace(/n\^\{?th\}?/gi, "nᵗʰ");
  t = t.replace(/\^\{th\}/gi, "ᵗʰ");
  t = t.replace(/\^\{st\}/gi, "ˢᵗ");
  t = t.replace(/\^\{nd\}/gi, "ⁿᵈ");
  t = t.replace(/\^\{rd\}/gi, "ʳᵈ");
  t = t.replace(/\$([^$]+)\$/g, "$1"); // strip simple $...$
  t = t.replace(/\\left\(/g, "(");
  t = t.replace(/\\right\)/g, ")");
  t = t.replace(/\\,/g, " ");
  t = t.replace(/\\;/g, " ");
  t = t.replace(/\\ /g, " ");
  t = t.replace(/\{\s*/g, "");
  t = t.replace(/\s*\}/g, "");
  t = t.replace(/[ \t]+\n/g, "\n");
  t = t.replace(/\n{3,}/g, "\n\n");
  t = t.replace(/[ \t]{2,}/g, " ");
  return t.trim();
}

function imageSrc(image: string, imagesBase: string): string {
  if (image.startsWith("http") || image.startsWith("/")) return image;
  const base = (imagesBase || "data").replace(/\/$/, "");
  return `/${base}/${image}`.replace(/\/+/g, "/");
}

/** Detect NCERT callout / box titles */
function isCalloutTitle(text: string): boolean {
  const t = text.toLowerCase().replace(/[^a-z\s]/g, "").trim();
  return (
    t === "think and reflect" ||
    t.startsWith("think and reflect") ||
    t === "try these" ||
    t.startsWith("try these") ||
    t === "note" ||
    t === "remark" ||
    t.startsWith("do this") ||
    t.startsWith("activity")
  );
}

function isExerciseTitle(text: string): boolean {
  return /exercise\s*set/i.test(text) || /^exercise\s*\d/i.test(text);
}

export default function BlockRenderer({ block, imagesBase = "data", compact = false }: Props) {
  const type = (block.type || "").toLowerCase();
  const text = formatText(block.text);

  // ---------- Headings ----------
  if (
    type.includes("sectionheader") ||
    type.includes("title") ||
    type === "heading" ||
    type.includes("section_header")
  ) {
    // Callout-style headings (Think and Reflect)
    if (isCalloutTitle(text)) {
      return (
        <div className="mt-6 mb-0 rounded-t-md bg-[#f3c7a8] border border-[#e8b090] border-b-0 px-4 py-2">
          <h3 className="font-serif font-bold text-[#8b2942] text-base m-0">{text}</h3>
        </div>
      );
    }

    if (isExerciseTitle(text)) {
      return (
        <div className="mt-8 mb-4 flex justify-center">
          <span className="inline-block bg-[#e8a0b0] text-[#6b1a2a] font-serif font-bold text-sm tracking-wide px-5 py-1.5 rounded-full uppercase">
            {text}
          </span>
        </div>
      );
    }

    const level = Math.min(Math.max(block.level || 1, 1), 4);
    const sizes = [
      "text-xl sm:text-2xl font-bold mt-8 mb-3",
      "text-lg sm:text-xl font-bold mt-7 mb-3",
      "text-base sm:text-lg font-semibold mt-6 mb-2",
      "text-base font-semibold mt-5 mb-2",
    ];
    const Tag = (`h${level}` as "h1" | "h2" | "h3" | "h4");
    return (
      <Tag className={`font-serif text-[#1a1520] leading-snug ${sizes[level - 1]}`}>
        {text}
      </Tag>
    );
  }

  // ---------- Images ----------
  if (
    type.includes("picture") ||
    type.includes("figure") ||
    type.includes("image") ||
    type.includes("diagram")
  ) {
    if (block.image) {
      const src = imageSrc(block.image, imagesBase);
      return (
        <figure className="my-5 text-center">
          <img
            src={src}
            alt={text || "Figure"}
            className="max-w-full h-auto mx-auto rounded-sm border border-[#ddd5c4] shadow-sm bg-white"
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
          className="my-5 overflow-x-auto book-table text-sm clear-both"
          dangerouslySetInnerHTML={{ __html: block.html }}
        />
      );
    }
    if (text) {
      return (
        <pre className="my-4 p-3 bg-[#f7f3ea] border border-[#e0d8c8] rounded text-sm overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed clear-both">
          {text}
        </pre>
      );
    }
  }

  // ---------- Lists ----------
  if (type.includes("listgroup") || type === "list") {
    return (
      <ul className="my-3 ml-0 space-y-2 list-none">
        {block.children?.map((child, i) => (
          <BlockRenderer key={child.id || i} block={child} imagesBase={imagesBase} />
        ))}
        {!block.children?.length && text && (
          <li className="flex gap-2 text-[#2a2418] font-serif leading-7 text-[16px]">
            <span className="text-[#8a7f6a] shrink-0">•</span>
            <span className="whitespace-pre-wrap">{text}</span>
          </li>
        )}
      </ul>
    );
  }

  if (type.includes("listitem") || type === "list_item") {
    return (
      <li className="flex gap-2.5 my-1.5 text-[#2a2418] font-serif leading-7 text-[16px]">
        <span className="text-[#8a7f6a] shrink-0 select-none mt-0.5">•</span>
        <div className="min-w-0 flex-1">
          {text && <span className="whitespace-pre-wrap">{text}</span>}
          {block.children?.map((child, i) => (
            <BlockRenderer key={child.id || i} block={child} imagesBase={imagesBase} />
          ))}
        </div>
      </li>
    );
  }

  // ---------- Equations ----------
  if (type.includes("equation") || type.includes("math") || type.includes("formula")) {
    return (
      <div className="my-4 px-4 py-3 bg-[#f7f3ea] border-l-4 border-[#6b8cae] rounded-r text-center font-serif text-[#1a1520] text-lg leading-relaxed overflow-x-auto">
        <span className="whitespace-pre-wrap">{text || formatText(block.html) || ""}</span>
      </div>
    );
  }

  if (type.includes("caption") || type.includes("footnote")) {
    return (
      <p className="my-2 text-sm text-[#6b6355] font-serif italic leading-relaxed whitespace-pre-wrap">
        {text}
      </p>
    );
  }

  if (type.includes("pageheader") || type.includes("page_header") || type.includes("pagefooter")) {
    return null;
  }

  // ---------- Text / Paragraph ----------
  if (text) {
    // Body of a callout that follows "Think and Reflect" title — soft box
    // We style normal paragraphs cleanly with good separation
    const lines = text.split("\n").filter((l) => l.trim().length > 0);
    const shortLines = lines.length > 1 && lines.every((l) => l.length < 90);

    // Example N: ... → slight emphasis
    const isExample = /^example\s*\d+/i.test(text);

    return (
      <p
        className={`my-3 font-serif text-[#2a2418] leading-[1.75] text-[16px] whitespace-pre-wrap clear-both ${
          isExample ? "mt-5" : ""
        }`}
      >
        {isExample ? (
          <>
            <strong className="text-[#8b2942]">{text.split(":")[0]}:</strong>
            {text.includes(":") ? text.slice(text.indexOf(":") + 1) : ""}
          </>
        ) : (
          text
        )}
      </p>
    );
  }

  if (block.html) {
    return (
      <div
        className="my-3 font-serif text-[#2a2418] leading-[1.75] book-html text-[16px] clear-both"
        dangerouslySetInnerHTML={{ __html: block.html }}
      />
    );
  }

  if (block.children && block.children.length > 0) {
    return (
      <div className="space-y-1">
        {block.children.map((child, i) => (
          <BlockRenderer key={child.id || i} block={child} imagesBase={imagesBase} />
        ))}
      </div>
    );
  }

  return null;
}
