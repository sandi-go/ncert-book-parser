import React from "react";
import { Block } from "../types/book";

interface Props {
  block: Block;
  imagesBase?: string;
  /** Render without outer margins (inside callout) */
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

function isExerciseTitle(text: string): boolean {
  return /exercise\s*set/i.test(text) || /^exercise\s*\d/i.test(text);
}

function splitNumberedItems(text: string): string[] | null {
  if (!/^\s*1[\.\)]\s/.test(text)) return null;
  const parts = text.split(/(?=\s[2-9]\d*[\.)]\s)|(?=\s1\d[\.)]\s)/);
  const items = parts.map((p) => p.trim()).filter(Boolean);
  if (items.length < 2) return null;
  if (!items.every((it) => /^\d+[\.)]\s/.test(it))) return null;
  return items;
}

function renderListItems(text: string) {
  const items = splitNumberedItems(text);
  if (items) {
    return (
      <ol>
        {items.map((item, i) => {
          const m = item.match(/^(\d+)[\.)]\s*([\s\S]*)$/);
          const num = m?.[1] ?? String(i + 1);
          const body = formatText(m?.[2] ?? item);
          return (
            <li key={i}>
              <span className="font-semibold shrink-0 min-w-[1.25rem]">{num}.</span>
              <RichText text={body} className="whitespace-pre-wrap" />
            </li>
          );
        })}
      </ol>
    );
  }

  const m = text.match(/^(\d+)[\.)]\s*([\s\S]*)$/);
  if (m) {
    return (
      <ol>
        <li>
          <span className="font-semibold shrink-0 min-w-[1.25rem]">{m[1]}.</span>
          <RichText text={formatText(m[2])} className="whitespace-pre-wrap" />
        </li>
      </ol>
    );
  }

  return (
    <p>
      <RichText text={text} />
    </p>
  );
}

export default function BlockRenderer({ block, imagesBase = "data", nested = false }: Props) {
  const type = (block.type || "").toLowerCase();
  const text = formatText(block.text);

  // ---------- Full Callout box (Think and Reflect) ----------
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

  // ---------- Lists ----------
  if (type.includes("listgroup") || type === "list") {
    return (
      <ol className={nested ? "" : "my-4 ml-0 space-y-3 list-none"}>
        {block.children?.map((child, i) => (
          <BlockRenderer key={child.id || i} block={child} imagesBase={imagesBase} nested={nested} />
        ))}
        {!block.children?.length && text && renderListItems(text)}
      </ol>
    );
  }

  if (type.includes("listitem") || type === "list_item") {
    const m = text.match(/^(\d+)[\.)]\s*([\s\S]*)$/);
    const num = m?.[1];
    const body = m ? m[2] : text;

    return (
      <li className={`flex gap-3 text-[#2a2418] leading-7 text-[16px] ${nested ? "my-1" : "my-2"}`}>
        <span className="text-[#5a5040] shrink-0 select-none font-semibold min-w-[1.5rem] text-right">
          {num ? `${num}.` : "•"}
        </span>
        <div className="min-w-0 flex-1">
          {body && <RichText text={body} className="whitespace-pre-wrap" />}
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
    // Inside callout → render as list items when numbered
    if (nested) {
      return renderListItems(text);
    }

    const items = splitNumberedItems(text);
    if (items) {
      return (
        <ol className="my-4 space-y-4 list-none">
          {items.map((item, i) => {
            const m = item.match(/^(\d+)[\.)]\s*([\s\S]*)$/);
            const num = m?.[1] ?? String(i + 1);
            const body = formatText(m?.[2] ?? item);
            return (
              <li key={i} className="flex gap-3 text-[#2a2418] leading-7 text-[16px]">
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

    return (
      <p
        className={`my-3 text-[#2a2418] leading-[1.75] text-[16px] whitespace-pre-wrap clear-both ${
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
