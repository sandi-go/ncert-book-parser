import React from "react";
import { Block } from "../types/book";

interface Props {
  block: Block;
  imagesBase?: string;
  compact?: boolean;
  /** When true, wrap this text as callout body under Think and Reflect */
  calloutBody?: boolean;
}

/** Convert Marker / LaTeX leftovers into readable book-like text + light HTML for superscripts */
function formatText(raw?: string): string {
  if (!raw) return "";
  let t = raw;

  // spacing / noise commands
  t = t.replace(/\\quad/g, " ");
  t = t.replace(/\\qquad/g, "  ");
  t = t.replace(/\\,/g, " ");
  t = t.replace(/\\;/g, " ");
  t = t.replace(/\\!/g, "");
  t = t.replace(/\\ /g, " ");
  t = t.replace(/~/g, " ");

  // operators
  t = t.replace(/\\times/g, "×");
  t = t.replace(/\\div/g, "÷");
  t = t.replace(/\\geq/g, "≥");
  t = t.replace(/\\leq/g, "≤");
  t = t.replace(/\\neq/g, "≠");
  t = t.replace(/\\pm/g, "±");
  t = t.replace(/\\mp/g, "∓");
  t = t.replace(/\\cdot/g, "·");
  t = t.replace(/\\ldots/g, "…");
  t = t.replace(/\\dots/g, "…");
  t = t.replace(/\\infty/g, "∞");
  t = t.replace(/\\approx/g, "≈");
  t = t.replace(/\\equiv/g, "≡");

  // degree / circ — °C °F
  t = t.replace(/\^\{\\circ\}/g, "°");
  t = t.replace(/\^\\circ/g, "°");
  t = t.replace(/\\circ/g, "°");
  t = t.replace(/\^\{?\\circ\}?\s*C/gi, "°C");
  t = t.replace(/\^\{?\\circ\}?\s*F/gi, "°F");
  t = t.replace(/\^\{?circ\}?C/gi, "°C");
  t = t.replace(/\^\{?circ\}?F/gi, "°F");
  t = t.replace(/\^\circ\s*C/gi, "°C");
  t = t.replace(/\^\circ\s*F/gi, "°F");
  t = t.replace(/°\s*C/g, "°C");
  t = t.replace(/°\s*F/g, "°F");

  // currency
  t = t.replace(/\\rupee\{?\}?/gi, "₹");
  t = t.replace(/\\Rs\.?/gi, "₹");
  t = t.replace(/\$\\mathrm\{Rs\}\$/gi, "₹");

  // text wrappers
  t = t.replace(/\\mathrm\{([^}]+)\}/g, "$1");
  t = t.replace(/\\text\{([^}]+)\}/g, "$1");
  t = t.replace(/\\textbf\{([^}]+)\}/g, "$1");
  t = t.replace(/\\mathit\{([^}]+)\}/g, "$1");
  t = t.replace(/\\mathrm/g, "");
  t = t.replace(/\\left\(/g, "(");
  t = t.replace(/\\right\)/g, ")");
  t = t.replace(/\\left\[/g, "[");
  t = t.replace(/\\right\]/g, "]");

  // ordinals
  t = t.replace(/n\^\{?th\}?/gi, "nᵗʰ");
  t = t.replace(/\^\{th\}/gi, "ᵗʰ");
  t = t.replace(/\^\{st\}/gi, "ˢᵗ");
  t = t.replace(/\^\{nd\}/gi, "ⁿᵈ");
  t = t.replace(/\^\{rd\}/gi, "ʳᵈ");

  // simple superscripts: x^2, x^{10}, a^n → HTML <sup>
  // do this before stripping braces carelessly
  t = t.replace(/([A-Za-z0-9)])\^\{([^}]+)\}/g, "$1<sup>$2</sup>");
  t = t.replace(/([A-Za-z0-9)])\^([A-Za-z0-9]+)/g, "$1<sup>$2</sup>");

  // subscripts: x_1, x_{12}
  t = t.replace(/([A-Za-z0-9)])_\{([^}]+)\}/g, "$1<sub>$2</sub>");
  t = t.replace(/([A-Za-z0-9)])_([A-Za-z0-9]+)/g, "$1<sub>$2</sub>");

  // strip remaining $...$
  t = t.replace(/\$([^$]*)\$/g, "$1");

  // leftover braces that are empty noise (careful not to break HTML tags)
  t = t.replace(/(?<![<\/])\{(?![^<]*>)/g, "");
  t = t.replace(/(?<![<\/])\}(?![^<]*>)/g, "");

  // whitespace
  t = t.replace(/[ \t]+\n/g, "\n");
  t = t.replace(/\n{3,}/g, "\n\n");
  t = t.replace(/[ \t]{2,}/g, " ");
  return t.trim();
}

/** Render text that may contain <sup>/<sub> as safe HTML */
function RichText({ text, className }: { text: string; className?: string }) {
  const hasHtml = /<sup>|<sub>/.test(text);
  if (hasHtml) {
    return <span className={className} dangerouslySetInnerHTML={{ __html: text }} />;
  }
  return <span className={className}>{text}</span>;
}

function imageSrc(image: string, imagesBase: string): string {
  if (image.startsWith("http") || image.startsWith("/")) return image;
  const base = (imagesBase || "data").replace(/\/$/, "");
  return `/${base}/${image}`.replace(/\/+/g, "/");
}

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

/**
 * If Marker dumped several numbered questions into one text blob,
 * split them into separate items: "1. ... 2. ... 3. ..."
 */
function splitNumberedItems(text: string): string[] | null {
  // Must start with 1. or 1)
  if (!/^\s*1[\.\)]\s/.test(text)) return null;

  // Split on " 2. " / " 3. " etc when they look like new items
  const parts = text.split(/(?=\s[2-9]\d*[\.)]\s)|(?=\s1\d[\.)]\s)/);
  const items = parts.map((p) => p.trim()).filter(Boolean);

  // Only treat as list if we got multiple real items
  if (items.length < 2) return null;
  // each should start with a number
  if (!items.every((it) => /^\d+[\.)]\s/.test(it))) return null;
  return items;
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
        <RichText text={text} />
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
              <RichText text={text} />
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
          {text.replace(/<[^>]+>/g, "")}
        </pre>
      );
    }
  }

  // ---------- Lists ----------
  if (type.includes("listgroup") || type === "list") {
    return (
      <ol className="my-4 ml-0 space-y-3 list-none">
        {block.children?.map((child, i) => (
          <BlockRenderer key={child.id || i} block={child} imagesBase={imagesBase} />
        ))}
        {!block.children?.length && text && (
          <li className="flex gap-2 text-[#2a2418] font-serif leading-7 text-[16px]">
            <span className="text-[#8a7f6a] shrink-0">•</span>
            <RichText text={text} className="whitespace-pre-wrap" />
          </li>
        )}
      </ol>
    );
  }

  if (type.includes("listitem") || type === "list_item") {
    // Try to extract leading number "1." / "2)"
    const m = text.match(/^(\d+)[\.)]\s*([\s\S]*)$/);
    const num = m?.[1];
    const body = m ? m[2] : text;

    return (
      <li className="flex gap-3 my-2 text-[#2a2418] font-serif leading-7 text-[16px]">
        <span className="text-[#5a5040] shrink-0 select-none font-semibold min-w-[1.5rem] text-right">
          {num ? `${num}.` : "•"}
        </span>
        <div className="min-w-0 flex-1">
          {body && <RichText text={body} className="whitespace-pre-wrap" />}
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
        <RichText text={text || formatText(block.html) || ""} className="whitespace-pre-wrap" />
      </div>
    );
  }

  if (type.includes("caption") || type.includes("footnote")) {
    return (
      <p className="my-2 text-sm text-[#6b6355] font-serif italic leading-relaxed whitespace-pre-wrap">
        <RichText text={text} />
      </p>
    );
  }

  if (type.includes("pageheader") || type.includes("page_header") || type.includes("pagefooter")) {
    return null;
  }

  // ---------- Text / Paragraph ----------
  if (text) {
    // Split merged exercise lists: "1. ... 2. ... 3. ..."
    const items = splitNumberedItems(text);
    if (items) {
      return (
        <ol className="my-4 space-y-4 list-none">
          {items.map((item, i) => {
            const m = item.match(/^(\d+)[\.)]\s*([\s\S]*)$/);
            const num = m?.[1] ?? String(i + 1);
            const body = formatText(m?.[2] ?? item);
            return (
              <li key={i} className="flex gap-3 text-[#2a2418] font-serif leading-7 text-[16px]">
                <span className="text-[#5a5040] shrink-0 font-semibold min-w-[1.5rem] text-right">
                  {num}.
                </span>
                <RichText text={body} className="min-w-0 flex-1 whitespace-pre-wrap" />
              </li>
            );
          })}
        </ol>
      );
    }

    const isExample = /^example\s*\d+/i.test(text.replace(/<[^>]+>/g, ""));

    // Heuristic: short question after callout title often is "Think and Reflect" body.
    // We can't know previous sibling easily here, so style short standalone questions
    // that look like reflection prompts with a light bordered box.
    const plain = text.replace(/<[^>]+>/g, "");
    const looksLikeCalloutBody =
      plain.length < 220 &&
      /\?\s*$/.test(plain) &&
      !/^\d+[\.)]/.test(plain) &&
      !/^example/i.test(plain);

    if (looksLikeCalloutBody) {
      return (
        <div className="mb-5 rounded-b-md border border-[#e8b090] border-t-0 bg-[#fdf6ef] px-4 py-3">
          <p className="m-0 font-serif text-[#2a2418] leading-[1.75] text-[16px]">
            <RichText text={text} />
          </p>
        </div>
      );
    }

    return (
      <p
        className={`my-3 font-serif text-[#2a2418] leading-[1.75] text-[16px] whitespace-pre-wrap clear-both ${
          isExample ? "mt-5" : ""
        }`}
      >
        {isExample ? (
          <>
            <strong className="text-[#8b2942]">
              <RichText text={text.split(":")[0]} />:
            </strong>
            {text.includes(":") ? (
              <RichText text={text.slice(text.indexOf(":") + 1)} />
            ) : null}
          </>
        ) : (
          <RichText text={text} />
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
