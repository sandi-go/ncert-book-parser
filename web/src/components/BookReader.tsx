"use client";

import React, { useState } from "react";
import { Book } from "@/types/book";
import BlockRenderer from "./BlockRenderer";

interface Props {
  book: Book;
}

export default function BookReader({ book }: Props) {
  const [currentPage, setCurrentPage] = useState(0);
  const page = book.pages[currentPage];
  const total = book.total_pages;

  const goPrev = () => setCurrentPage((p) => Math.max(0, p - 1));
  const goNext = () => setCurrentPage((p) => Math.min(total - 1, p + 1));

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-800 truncate">
            {book.title}
          </h1>
          <div className="text-sm text-gray-500">
            Page {currentPage + 1} / {total}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <article className="bg-white shadow-sm rounded-lg p-8 min-h-[70vh]">
          {page?.blocks?.length > 0 ? (
            page.blocks.map((block, idx) => (
              <BlockRenderer
                key={block.id || idx}
                block={block}
                imagesBase={book.images_base_path || "data/images"}
              />
            ))
          ) : (
            <p className="text-gray-400 italic">No content on this page.</p>
          )}
        </article>
      </main>

      {/* Simple Pagination */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={goPrev}
            disabled={currentPage === 0}
            className="px-5 py-2 rounded-md bg-gray-800 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-700 transition"
          >
            ← Previous
          </button>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={total}
              value={currentPage + 1}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1 && val <= total) {
                  setCurrentPage(val - 1);
                }
              }}
              className="w-16 text-center border rounded py-1"
            />
            <span className="text-gray-500 text-sm">of {total}</span>
          </div>

          <button
            onClick={goNext}
            disabled={currentPage === total - 1}
            className="px-5 py-2 rounded-md bg-gray-800 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-700 transition"
          >
            Next →
          </button>
        </div>
      </footer>
    </div>
  );
}
