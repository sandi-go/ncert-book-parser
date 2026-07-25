# NCERT Book Rebuilder

Parse any NCERT chapter PDF with **Marker** → clean structured JSON → simple Next.js reader that rebuilds the book content page-by-page.

## Goal

Take a chapter PDF → extract high-quality structured content (text, headings, images, tables, equations) → rebuild the same chapter in a clean web UI with simple pagination.

## Folder Structure

```
ncert-book-parser/
├── parser/                 # Python + Marker
│   ├── parse_chapter.py
│   └── requirements.txt
├── web/                    # Next.js Book Reader
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   └── types/
│   └── public/data/        # Put parsed JSON + images here
└── README.md
```

## 1. Parse a Chapter (Python + Marker)

```bash
cd parser
pip install -r requirements.txt

# Balanced mode (best quality, GPU recommended)
python parse_chapter.py /path/to/ncert_chapter.pdf \
  --out ../web/public/data/chapter1.json \
  --title "Chemical Reactions and Equations" \
  --mode balanced

# Or fast mode (CPU friendly)
python parse_chapter.py /path/to/ncert_chapter.pdf \
  --out ../web/public/data/chapter1.json \
  --mode fast
```

This will:
- Run Marker with JSON output
- Extract images into `web/public/data/images/`
- Produce a clean, UI-ready JSON

## 2. Run the Reader UI

```bash
cd web
npm install
npm run dev
```

Open http://localhost:3000

The UI is deliberately **very simple**:
- Chapter title on top
- Content of current page
- Simple Previous / Next + page number input at the bottom
- No fancy page-turning animations

## JSON Shape (what the UI expects)

```json
{
  "title": "Chemical Reactions and Equations",
  "source_file": "chapter1.pdf",
  "total_pages": 18,
  "images_base_path": "data/images",
  "pages": [
    {
      "page_number": 1,
      "blocks": [
        {
          "type": "SectionHeader",
          "text": "1. Chemical Reactions and Equations",
          "level": 1
        },
        {
          "type": "Text",
          "text": "A chemical reaction is a process..."
        },
        {
          "type": "Picture",
          "image": "images/xyz.png",
          "text": "Figure 1.1"
        }
      ]
    }
  ]
}
```

## Notes

- Marker gives excellent structure (headings hierarchy, reading order, images, tables).
- The current UI renders blocks in reading order. It is content-faithful, not pixel-perfect PDF recreation.
- For multiple chapters later we can add a chapter selector.

## Next improvements (when you want)

- Better table rendering
- Math equations with KaTeX
- Multi-chapter support + TOC
- Search inside chapter
