import React from "react";
import { Block } from "@/types/book";

interface Props {
  block: Block;
  imagesBase?: string;
}

export default function BlockRenderer({ block, imagesBase = "" }: Props) {
  const type = (block.type || "").toLowerCase();

  // Headings
  if (type.includes("sectionheader") || type.includes("title") || type === "heading") {
    const level = block.level || 1;
    const Tag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements;
    return (
      <Tag className={`font-bold text-gray-900 mt-6 mb-3 ${
        level === 1 ? "text-2xl" : level === 2 ? "text-xl" : "text-lg"
      }`}>
        {block.text}
      </Tag>
    );
  }

  // Images / Figures
  if (type.includes("picture") || type.includes("figure") || type.includes("image")) {
    if (block.image) {
      const src = block.image.startsWith("http") || block.image.startsWith("/")
        ? block.image
        : `/${imagesBase}/${block.image}`.replace(/\/+/g, "/");
      return (
        <figure className="my-6 text-center">
          <img
            src={src}
            alt={block.text || "Figure"}
            className="max-w-full h-auto mx-auto rounded border"
          />
          {block.text && (
            <figcaption className="text-sm text-gray-600 mt-2 italic">
              {block.text}
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
          className="my-4 overflow-x-auto prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: block.html }}
        />
      );
    }
    return (
      <pre className="my-4 p-3 bg-gray-50 border rounded text-sm overflow-x-auto">
        {block.text}
      </pre>
    );
  }

  // Lists
  if (type.includes("list") || type.includes("listitem")) {
    return (
      <li className="ml-5 my-1 text-gray-800 leading-relaxed">
        {block.text}
        {block.children?.map((child, i) => (
          <BlockRenderer key={i} block={child} imagesBase={imagesBase} />
        ))}
      </li>
    );
  }

  // Equations
  if (type.includes("equation") || type.includes("math")) {
    return (
      <div className="my-4 p-3 bg-gray-50 border-l-4 border-blue-400 font-mono text-center">
        {block.text || block.html}
      </div>
    );
  }

  // Default: Paragraph / Text
  if (block.text) {
    return (
      <p className="my-3 text-gray-800 leading-7 text-justify">
        {block.text}
      </p>
    );
  }

  // Recursive children
  if (block.children && block.children.length > 0) {
    return (
      <>
        {block.children.map((child, i) => (
          <BlockRenderer key={i} block={child} imagesBase={imagesBase} />
        ))}
      </>
    );
  }

  return null;
}
