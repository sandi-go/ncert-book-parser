import fs from "fs";
import path from "path";
import BookReader from "@/components/BookReader";
import { Book } from "@/types/book";

async function getBook(): Promise<Book | null> {
  const dataDir = path.join(process.cwd(), "public", "data");
  
  try {
    if (!fs.existsSync(dataDir)) return null;
    
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith(".json"));
    if (files.length === 0) return null;

    const jsonPath = path.join(dataDir, files[0]);
    const raw = fs.readFileSync(jsonPath, "utf-8");
    return JSON.parse(raw) as Book;
  } catch (e) {
    console.error("Failed to load book JSON:", e);
    return null;
  }
}

export default async function Home() {
  const book = await getBook();

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center max-w-md p-8">
          <h1 className="text-2xl font-bold mb-4">No book loaded</h1>
          <p className="text-gray-600 mb-6">
            Place a Marker-parsed chapter JSON file inside{" "}
            <code className="bg-gray-100 px-2 py-1 rounded">web/public/data/</code>
          </p>
          <pre className="text-left text-sm bg-gray-900 text-green-400 p-4 rounded overflow-x-auto">
{`# 1. Parse a chapter
cd parser
python parse_chapter.py chapter1.pdf --out ../web/public/data/chapter1.json --title "Chapter 1"

# 2. Run the UI
cd ../web
npm run dev`}
          </pre>
        </div>
      </div>
    );
  }

  return <BookReader book={book} />;
}
