"use client";

import React, { useState, useEffect } from "react";
import { Book, ChapterMeta } from "../types/book";
import PageView from "./PageView";

interface Props {
  book: Book;
  chapters: ChapterMeta[];
  selectedFilename: string;
  onSelectChapter: (filename: string) => void;
}

export default function BookReader({
  book,
  chapters,
  selectedFilename,
  onSelectChapter,
}: Props) {
  const [currentPage, setCurrentPage] = useState(0);
  const total = book.total_pages || book.pages?.length || 0;
  const page = book.pages?.[currentPage];

  useEffect(() => {
    setCurrentPage(0);
  }, [selectedFilename]);

  const goPrev = () => setCurrentPage((p) => Math.max(0, p - 1));
  const goNext = () => setCurrentPage((p) => Math.min(total - 1, p + 1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="min-h-screen bg-[#e8e4db]">
      <header className="bg-[#2c2416] text-[#f5f0e6] sticky top-0 z-20 shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="text-xs uppercase tracking-widest text-[#c4b89a] shrink-0">NCERT</span>
            <select
              value={selectedFilename}
              onChange={(e) => onSelectChapter(e.target.value)}
              className="bg-[#3d3220] border border-[#5a4a30] text-[#f5f0e6] rounded-md px-3 py-1.5 text-sm max-w-full truncate focus:outline-none focus:ring-1 focus:ring-[#c4b89a]"
            >
              {chapters.map((ch) => (
                <option key={ch.filename} value={ch.filename}>
                  {ch.title} ({ch.total_pages}p)
                </option>
              ))}
            </select>
          </div>
          <div className="text-sm text-[#c4b89a] tabular-nums">
            Page {currentPage + 1} / {total}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 sm:px-6 py-8 pb-28">
        <div className="bg-[#fffcf5] shadow-[0_2px_20px_rgba(0,0,0,0.12)] rounded-sm border border-[#ddd5c4] min-h-[70vh]">
          <div className="border-b border-[#ebe4d4] px-6 py-2 flex justify-between text-xs text-[#8a7f6a]">
            <span className="font-serif italic truncate max-w-[70%]">{book.title}</span>
            <span className="tabular-nums">{page?.page_number ?? currentPage + 1}</span>
          </div>

          <div className="px-4 sm:px-8 py-6">
            {page ? (
              <PageView page={page} imagesBase={book.images_base_path || "data"} />
            ) : (
              <p className="text-[#a39880] italic text-center py-20">No content on this page.</p>
            )}
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-[#2c2416] text-[#f5f0e6] border-t border-[#4a3d28] z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <button
            onClick={goPrev}
            disabled={currentPage === 0}
            className="px-4 py-2 rounded bg-[#4a3d28] hover:bg-[#5a4d38] disabled:opacity-30 disabled:cursor-not-allowed text-sm transition"
          >
            ← Prev
          </button>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={total}
              value={currentPage + 1}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1 && val <= total) setCurrentPage(val - 1);
              }}
              className="w-14 text-center bg-[#3d3220] border border-[#5a4a30] rounded py-1 text-sm tabular-nums"
            />
            <span className="text-sm text-[#c4b89a]">/ {total}</span>
          </div>

          <button
            onClick={goNext}
            disabled={currentPage >= total - 1}
            className="px-4 py-2 rounded bg-[#4a3d28] hover:bg-[#5a4d38] disabled:opacity-30 disabled:cursor-not-allowed text-sm transition"
          >
            Next →
          </button>
        </div>
      </footer>
    </div>
  );
}
