import React from "react";
import { Block } from "../types/book";

interface Props {
  block: Block;
  imagesBase?: string;
  nested?: boolean;
}

function formatText(raw?: string): string {
  if (!raw) return "";
  let t = raw;

  t = t.replace(/\\quad/g, " ");
  t = t.replace(/\\qquad/g, "  ");
  t = t.replace(/\\,/g, " ");
  t = t.replace(/\\;/g, " ");
  t = t.replace(/\\!/g, "");
  t = t.replace(/\\ /g, " ");
  t = t.replace(/~/g, " ");

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

  t = t.replace(/\\rupee\{?\}?/gi, "₹");
  t = t.replace(/\\Rs\.?/gi, "₹");
  t = t.replace(/\$\\mathrm\{Rs\}\$/gi, "₹");

  t = t.replace(/\\mathrm\{([^}]+)\}/g, "$1");
  t = t.replace(/\\text\{([^}]+)\}/g, "$1");
  t = t.replace(/\\textbf\{([^}]+)\}/g, "$1");
  t = t.replace(/\\mathit\{([^}]+)\}/g, "$1");
  t = t.replace(/\\mathrm/g, "");
  t = t.replace(/\\left\(/g, "(");
  t = t.replace(/\\right\)/g, ")");
  t = t.replace(/\\left\[/g, "[");
  t = t.replace(/\\right\]/g, "]");

  t = t.replace(/n\^\{?th\}?/gi, "nᵗʰ");
  t = t.replace(/\^\{th\}/gi, "ᵗʰ");
  t = t.replace(/\^\{st\}/gi, "ˢᵗ");
  t = t.replace(/\^\{nd\}/gi, "ⁿᵈ");
  t = t.replace(/\^\{rd\}/gi, "ʳᵈ");

  t = t.replace(/([A-Za-z0-9)])\^\{([^}]+)\}/g, "$1<sup>$2</sup>");
  t = t.replace(/([A-Za-z0-9)])\^([A-Za-z0-9]+)/g, "$1<sup>$2</sup>");
  t = t.replace(/([A-Za-z0-9)])_\{([^}]+)\}/g, "$1<sub>$2</sub>");
  t = t.replace(/([A-Za-z0-9)])_([A-Za-z0-9]+)/g, "$1<sub>$2</sub>");

  t = t.replace(/\$([^$]*)\$/g, "$1");
  t = t.replace(/(?<![<\/])\{(?![^<]*>)/g, "");
  t = t.replace(/(?<![<\/])\}(?![^<]*>)/g, "");

  t = t.replace(/[ \t]+\n/g, "\n");
  t = t.replace(/\n{3,}/g, "\n\n");
  t = t.replace(/[ \t]{2,}/g, " ");
  return t.trim();
}

/** Bold common NCERT term phrases inside already-formatted text */
function emphasizeTerms(html: string): string {
  const terms = [
    "one-variable polynomials",
    "univariate polynomials",
    "cubic polynomials",
    "quadratic polynomials",
    "linear polynomials",
    "constant polynomials",
    "polynomials",
    "degree",
  ];
  let out = html;
  for (const term of terms) {
    const re = new RegExp(`\\b(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})\\b`, "gi");
    out = out.replace(re, `<strong class="term">$1</strong>`);
  }
  // avoid double-wrapping
  out = out.replace(/<strong class="term"><strong class="term">/g, `<strong class="term">`);
  out = out.replace(/<\/strong><\/strong>/g, "</strong>");
  return out;
}

function RichText({ text, className }: { text: string; className?: string }) {
  const withTerms = emphasizeTerms(text);
  const hasHtml = /<sup>|<sub>|<strong/.test(withTerms);
  if (hasHtml) {
    return <span className={className} dangerouslySetInnerHTML={{ __html: withTerms }} />;
  }
  return <span className={className}>{text}</span>;
}

function imageSrc(image: string, imagesBase: string): string {
  if (image.startsWith("http") || image.startsWith("/")) return image;
  const base = (imagesBase || "data").replace(/\/$/, "");
  return `/${base}/${image}`.replace(/\/+/g, "/");
}

function isExerciseTitle(text: string): boolean {
  return /exercise\s*set/i.test(text) || /^exercise\s*\d/i.test(text);
}

/** Split "1. ... 2. ... 3. ..." even when space after dot is missing */
function splitNumberedItems(text: string): string[] | null {
  const plain = text.replace(/<[^>]+>/g, "");
  // allow "1.Find" or "1. Find" or "1) Find"
  if (!/^\s*1\s*[\.)]\s*\S/.test(plain)) return null;

  const parts = plain.split(/(?=\s*[2-9]\d*\s*[\.)]\s*\S)|(?=\s*1\d\s*[\.)]\s*\S)/);
  const items = parts.map((p) => p.trim()).filter(Boolean);
  if (items.length < 2) return null;
  if (!items.every((it) => /^\d+\s*[\.)]/.test(it))) return null;
  return items;
}

/** Split "(i) ... (ii) ... (iii) ..." roman lists */
function splitRomanItems(text: string): string[] | null {
  const plain = text.replace(/<[^>]+>/g, "");
  // must contain at least (i) and (ii)
  if (!/\(\s*i\s*\)/i.test(plain) || !/\(\s*ii\s*\)/i.test(plain)) return null;

  // Split before (i) (ii) (iii) (iv) (v) (vi) (vii) (viii) (ix) (x)
  const parts = plain.split(/(?=\(\s*(?:x|ix|viii|vii|vi|v|iv|iii|ii|i)\s*\))/i);
  const items = parts.map((p) => p.trim()).filter(Boolean);

  // Keep only parts that start with (roman)
  const romanItems = items.filter((it) => /^\(\s*(?:x|ix|viii|vii|vi|v|iv|iii|ii|i)\s*\)/i.test(it));
  if (romanItems.length < 2) return null;
  return romanItems;
}

function parseRomanLabel(item: string): { label: string; body: string } {
  const m = item.match(/^\(\s*((?:x|ix|viii|vii|vi|v|iv|iii|ii|i))\s*\)\s*([\s\S]*)$/i);
  if (m) return { label: `(${m[1].toLowerCase()})`, body: formatText(m[2]) };
  return { label: "•", body: formatText(item) };
}

function parseNumberLabel(item: string): { label: string; body: string } {
  const m = item.match(/^(\d+)\s*[\.)]\s*([\s\S]*)$/);
  if (m) return { label: `${m[1]}.`, body: formatText(m[2]) };
  return { label: "•", body: formatText(item) };
}

/**
 * Smart list renderer:
 * 1) numbered 1. 2. 3.
 * 2) roman (i) (ii) (iii)
 * 3) numbered items that themselves contain roman sublists
 */
function renderSmartList(text: string, nested = false) {
  const numbered = splitNumberedItems(text);
  if (numbered) {
    return (
      <ol className={nested ? "space-y-2 list-none" : "my-4 space-y-3 list-none"}>
        {numbered.map((item, i) => {
          const { label, body } = parseNumberLabel(item);
          // body may still have (i)(ii) sub-items
          const sub = splitRomanItems(body);
          return (
            <li key={i} className="flex gap-3 text-[#2a2418] leading-7 text-[16px]">
              <span className="text-[#5a5040] shrink-0 font-semibold min-w-[1.5rem] text-right">
                {label}
              </span>
              <div className="min-w-0 flex-1">
                {sub ? (
                  <>
                    {/* lead-in before first (i), if any */}
                    {(() => {
                      const lead = body.split(/\(\s*i\s*\)/i)[0]?.trim();
                      return lead ? (
                        <p className="mb-2">
                          <RichText text={lead} />
                        </p>
                      ) : null;
                    })()}
                    <ol className="mt-1 space-y-1.5 list-none ml-1">
                      {sub.map((s, j) => {
                        const r = parseRomanLabel(s);
                        return (
                          <li key={j} className="flex gap-2">
                            <span className="text-[#5a5040] shrink-0 min-w-[2rem]">{r.label}</span>
                            <RichText text={r.body} className="whitespace-pre-wrap" />
                          </li>
                        );
                      })}
                    </ol>
                  </>
                ) : (
                  <RichText text={body} className="whitespace-pre-wrap" />
                )}
              </div>
            </li>
          );
        })}
      </ol>
    );
  }

  const roman = splitRomanItems(text);
  if (roman) {
    // optional lead-in sentence before (i)
    const leadMatch = text.replace(/<[^>]+>/g, "").split(/\(\s*i\s*\)/i);
    const lead = leadMatch[0]?.trim();

    return (
      <div className={nested ? "" : "my-3"}>
        {lead && lead.length > 3 && (
          <p className="mb-2 text-[#2a2418] leading-7 text-[16px]">
            <RichText text={formatText(lead)} />
          </p>
        )}
        <ol className="space-y-2 list-none">
          {roman.map((item, i) => {
            const { label, body } = parseRomanLabel(item);
            return (
              <li key={i} className="flex gap-2 text-[#2a2418] leading-7 text-[16px]">
                <span className="text-[#5a5040] shrink-0 min-w-[2.25rem]">{label}</span>
                <RichText text={body} className="whitespace-pre-wrap flex-1" />
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  // single numbered item
  const m = text.replace(/<[^>]+>/g, "").match(/^(\d+)\s*[\.)]\s*([\s\S]*)$/);
  if (m) {
    return (
      <ol className={nested ? "list-none" : "my-3 list-none"}>
        <li className="flex gap-3 text-[#2a2418] leading-7 text-[16px]">
          <span className="text-[#5a5040] shrink-0 font-semibold min-w-[1.5rem] text-right">
            {m[1]}.
          </span>
          <RichText text={formatText(m[2])} className="whitespace-pre-wrap flex-1" />
        </li>
      </ol>
    );
  }

  return null;
}

export default function BlockRenderer({ block, imagesBase = "data", nested = false }: Props) {
  const type = (block.type || "").toLowerCase();
  const text = formatText(block.text);

  // ---------- Callout ----------
  if (type === "callout") {
    const title = text || "Think and Reflect";
    const children = block.children || [];
    return (
      <div className="callout-box">
        <div className="callout-box-header">
          <h3>{title}</h3>
        </div>
        <div className="callout-box-body">
          {children.length > 0 ? (
            children.map((child, i) => (
              <BlockRenderer key={child.id || i} block={child} imagesBase={imagesBase} nested />
            ))
          ) : (
            <p className="text-[#8a7f6a] italic text-sm"> </p>
          )}
        </div>
      </div>
    );
  }

  // ---------- Headings ----------
  if (
    type.includes("sectionheader") ||
    type.includes("title") ||
    type === "heading" ||
    type.includes("section_header")
  ) {
    if (isExerciseTitle(text)) {
      return (
        <div className="mt-8 mb-4 flex justify-center">
          <span className="inline-block bg-[#e8a0b0] text-[#6b1a2a] font-bold text-sm tracking-wide px-5 py-1.5 rounded-full uppercase">
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
      <Tag className={`text-[#1a1520] leading-snug ${sizes[level - 1]}`}>
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
        <figure className="my-6 mx-auto flex flex-col items-center text-center max-w-full">
          <img
            src={src}
            alt={text || "Figure"}
            className="max-w-full h-auto rounded-sm border border-[#ddd5c4] shadow-sm bg-white"
            loading="lazy"
          />
          {text && (
            <figcaption className="mt-2 max-w-prose text-sm text-[#6b6355] italic leading-relaxed text-center px-2">
              <RichText text={text} />
            </figcaption>
          )}
        </figure>
      );
    }
  }

  if (type.includes("caption")) {
    return (
      <p className="my-2 text-center text-sm text-[#6b6355] italic leading-relaxed">
        <RichText text={text} />
      </p>
    );
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

  // ---------- Native list types ----------
  if (type.includes("listgroup") || type === "list") {
    if (block.children?.length) {
      return (
        <ol className={nested ? "space-y-2 list-none" : "my-4 space-y-3 list-none"}>
          {block.children.map((child, i) => (
            <BlockRenderer key={child.id || i} block={child} imagesBase={imagesBase} nested={nested} />
          ))}
        </ol>
      );
    }
    if (text) {
      const smart = renderSmartList(text, nested);
      if (smart) return smart;
    }
  }

  if (type.includes("listitem") || type === "list_item") {
    const m = text.match(/^(\d+)\s*[\.)]\s*([\s\S]*)$/);
    const num = m?.[1];
    const body = m ? m[2] : text;
    const sub = body ? splitRomanItems(body) : null;

    return (
      <li className={`flex gap-3 text-[#2a2418] leading-7 text-[16px] ${nested ? "my-1" : "my-2"}`}>
        <span className="text-[#5a5040] shrink-0 select-none font-semibold min-w-[1.5rem] text-right">
          {num ? `${num}.` : "•"}
        </span>
        <div className="min-w-0 flex-1">
          {sub ? (
            <ol className="space-y-1.5 list-none">
              {sub.map((s, j) => {
                const r = parseRomanLabel(s);
                return (
                  <li key={j} className="flex gap-2">
                    <span className="min-w-[2.25rem] shrink-0">{r.label}</span>
                    <RichText text={r.body} className="whitespace-pre-wrap" />
                  </li>
                );
              })}
            </ol>
          ) : (
            body && <RichText text={body} className="whitespace-pre-wrap" />
          )}
          {block.children?.map((child, i) => (
            <BlockRenderer key={child.id || i} block={child} imagesBase={imagesBase} nested />
          ))}
        </div>
      </li>
    );
  }

  // ---------- Equations ----------
  if (type.includes("equation") || type.includes("math") || type.includes("formula")) {
    return (
      <div className="my-4 px-4 py-3 bg-[#f7f3ea] border-l-4 border-[#6b8cae] rounded-r text-center text-[#1a1520] text-lg leading-relaxed overflow-x-auto">
        <RichText text={text || formatText(block.html) || ""} className="whitespace-pre-wrap" />
      </div>
    );
  }

  if (type.includes("footnote")) {
    return (
      <p className="my-2 text-sm text-[#6b6355] italic leading-relaxed whitespace-pre-wrap">
        <RichText text={text} />
      </p>
    );
  }

  if (type.includes("pageheader") || type.includes("page_header") || type.includes("pagefooter")) {
    return null;
  }

  // ---------- Text ----------
  if (text) {
    const smart = renderSmartList(text, nested);
    if (smart) return smart;

    const isExample = /^example\s*\d+/i.test(text.replace(/<[^>]+>/g, ""));

    return (
      <p
        className={`${nested ? "my-1" : "my-3"} text-[#2a2418] leading-[1.75] text-[16px] whitespace-pre-wrap clear-both ${
          isExample ? "mt-5" : ""
        }`}
      >
        {isExample ? (
          <>
            <strong className="text-[#8b2942]">
              <RichText text={text.split(":")[0]} />:
            </strong>
            {text.includes(":") ? <RichText text={text.slice(text.indexOf(":") + 1)} /> : null}
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
        className="my-3 text-[#2a2418] leading-[1.75] book-html text-[16px] clear-both"
        dangerouslySetInnerHTML={{ __html: block.html }}
      />
    );
  }

  if (block.children && block.children.length > 0) {
    return (
      <div className="space-y-1">
        {block.children.map((child, i) => (
          <BlockRenderer key={child.id || i} block={child} imagesBase={imagesBase} nested={nested} />
        ))}
      </div>
    );
  }

  return null;
}
