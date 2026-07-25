import fs from "fs";
import path from "path";
import BookApp from "../components/BookApp";
import { Book, ChapterMeta } from "../types/book";

async function loadChapters(): Promise<{ chapters: ChapterMeta[]; books: Record<string, Book> }> {
  const dataDir = path.join(process.cwd(), "public", "data");
  const chapters: ChapterMeta[] = [];
  const books: Record<string, Book> = {};

  try {
    if (!fs.existsSync(dataDir)) return { chapters, books };

    const files = fs
      .readdirSync(dataDir)
      .filter((f) => f.endsWith(".json"))
      .sort();

    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(dataDir, file), "utf-8");
        const book = JSON.parse(raw) as Book;
        books[file] = book;
        chapters.push({
          filename: file,
          title: book.title || file.replace(/\.json$/, ""),
          total_pages: book.total_pages || book.pages?.length || 0,
          source_file: book.source_file,
        });
      } catch (e) {
        console.error("Failed to parse", file, e);
      }
    }
  } catch (e) {
    console.error("Failed to load chapters:", e);
  }

  return { chapters, books };
}

export default async function Home() {
  const { chapters, books } = await loadChapters();

  if (chapters.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f1ea]">
        <div className="text-center max-w-lg p-8">
          <h1 className="text-2xl font-serif font-bold mb-4 text-stone-800">No chapters loaded</h1>
          <p className="text-stone-600 mb-6">
            Parse a chapter and put the JSON in{" "}
            <code className="bg-stone-200 px-2 py-1 rounded text-sm">web/public/data/</code>
          </p>
          <pre className="text-left text-sm bg-stone-900 text-green-400 p-4 rounded-lg overflow-x-auto">
{`python parse_chapter.py chapter.pdf \\
  --out ../web/public/data/chapter1.json \\
  --title "Chapter 1" --mode fast`}
          </pre>
        </div>
      </div>
    );
  }

  return <BookApp chapters={chapters} books={books} />;
}
