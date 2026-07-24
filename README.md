# NCERT Book Parser

**World-class Go microservice** that turns any NCERT textbook / chapter PDF into rich, structured, page-by-page JSON.

Designed specifically so every paragraph, header, image caption, and question becomes a first-class object that you can later feed into a question-generation pipeline.

## Why this exists

NCERT PDFs are the gold standard for Indian school content, but extracting clean, hierarchical data (chapter → page → para / question / figure) is surprisingly hard. Most generic PDF tools either lose layout or produce flat text. This service:

- Uses **pdftotext** (poppler) + **mutool** for high-fidelity text + future image extraction
- Detects chapters, section headers, paragraphs, and questions with NCERT-aware heuristics
- Gives every content unit a stable **ID** so you can reference `p-ch1-12-3` or `q-ch3-45-2` later when generating questions
- Returns a clean JSON that is ready for RAG, Q-gen, or indexing

## JSON Shape (high level)

```json
{
  "meta": {
    "title": "...",
    "subject": "Science",
    "class": "10",
    "total_pages": 42,
    "parser_version": "0.1.0-alpha"
  },
  "chapters": [
    {
      "id": "ch-1",
      "number": 1,
      "title": "Chemical Reactions and Equations",
      "pages": [
        {
          "id": "page-5",
          "page_number": 5,
          "headers": [...],
          "paragraphs": [
            {
              "id": "p-ch-1-5-1",
              "text": "A chemical reaction is a process ...",
              "order": 1
            }
          ],
          "images": [],
          "in_page_questions": []
        }
      ],
      "chapter_questions": [
        {
          "id": "q-ch-1-12-1",
          "number": "1.",
          "text": "Why should a magnesium ribbon be cleaned before burning in air?",
          "type": "short",
          "page_number": 12
        }
      ]
    }
  ],
  "content_index": {
    "p-ch-1-5-1": { "type": "paragraph", "chapter_id": "ch-1", "page_id": "page-5", "id": "p-ch-1-5-1" }
  }
}
```

You can now pick any `id` and generate questions only on that paragraph / question / page.

## API

### `POST /api/v1/parse`

- **Content-Type**: `multipart/form-data`
- **Field**: `file` → the PDF
- **Optional fields**:
  - `title`
  - `subject`
  - `class`
  - `chapter_number`

**Example**

```bash
curl -X POST http://localhost:8080/api/v1/parse \
  -F "file=@ncert_class10_science_ch1.pdf" \
  -F "class=10" \
  -F "subject=Science" \
  -F "title=Chemical Reactions and Equations"
```

### `GET /health`

## Running

Requires:

- Go 1.22+
- `pdftotext` + `pdfinfo` (poppler-utils)
- `mutool` (mupdf-tools) – optional but recommended

```bash
go run ./cmd/server
# or
go build -o ncert-parser ./cmd/server
./ncert-parser
```

Env:

- `PORT` (default 8080)
- `TMP_DIR` (default system temp)

## Roadmap (next iterations in the loop)

- [ ] Proper image extraction + caption association (mutool extract + nearby text)
- [ ] Better chapter boundary detection using font size / TOC
- [ ] MCQ option parsing (A/B/C/D)
- [ ] Marks detection ("[2 Marks]")
- [ ] Hindi / bilingual support
- [ ] Streaming / async job API for large books
- [ ] Docker image
- [ ] Benchmarks against real NCERT PDFs

## License

MIT
