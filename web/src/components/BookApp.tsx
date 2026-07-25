"use client";

import React, { useState, useEffect } from "react";
import { Book, ChapterMeta } from "../types/book";
import BookReader from "./BookReader";

interface Props {
  chapters: ChapterMeta[];
  books: Record<string, Book>;
}

export default function BookApp({ chapters, books }: Props) {
  const [selected, setSelected] = useState(chapters[0]?.filename || "");
  const book = books[selected] || null;

  useEffect(() => {
    if (!selected && chapters.length > 0) {
      setSelected(chapters[0].filename);
    }
  }, [chapters, selected]);

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f1ea]">
        <p className="text-stone-500">Select a chapter to begin.</p>
      </div>
    );
  }

  return (
    <BookReader
      book={book}
      chapters={chapters}
      selectedFilename={selected}
      onSelectChapter={(filename) => setSelected(filename)}
    />
  );
}
