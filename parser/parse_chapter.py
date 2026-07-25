#!/usr/bin/env python3
"""
Parse a single NCERT chapter PDF using Marker and produce a clean Book JSON
suitable for the Next.js reader.

Usage:
    python parse_chapter.py path/to/chapter.pdf --out data/chapter-1.json

Requires:
    pip install -r requirements.txt
    (GPU recommended for balanced mode, CPU also works with --mode fast)
"""

import argparse
import json
import re
from pathlib import Path
from typing import Any

from marker.converters.pdf import PdfConverter
from marker.models import create_model_dict
from marker.config.parser import ConfigParser


def extract_images_from_rendered(rendered, out_dir: Path) -> dict[str, str]:
    """Save images to disk and return mapping of image_id -> relative path."""
    images_map = {}
    if not hasattr(rendered, "images") or not rendered.images:
        return images_map

    out_dir.mkdir(parents=True, exist_ok=True)

    for img_id, img_data in rendered.images.items():
        filename = f"{str(img_id).replace('/', '_')}.png"
        filepath = out_dir / filename

        if hasattr(img_data, "save"):
            img_data.save(filepath)
        elif isinstance(img_data, bytes):
            with open(filepath, "wb") as f:
                f.write(img_data)
        else:
            continue

        images_map[str(img_id)] = f"images/{filename}"
    return images_map


def clean_block(block: Any, images_map: dict) -> dict | None:
    """Convert Marker block into a simple UI-friendly structure."""
    if block is None:
        return None

    block_type = getattr(block, "block_type", None) or (block.get("block_type") if isinstance(block, dict) else None)
    if block_type is None:
        return None

    # Skip page headers/footers
    if str(block_type) in ("PageHeader", "PageFooter", "Header", "Footer"):
        return None

    result = {
        "id": getattr(block, "id", None) or (block.get("id") if isinstance(block, dict) else None),
        "type": str(block_type),
    }

    html = getattr(block, "html", None) or (block.get("html") if isinstance(block, dict) else None)
    text = getattr(block, "text", None) or (block.get("text") if isinstance(block, dict) else None)

    if text:
        result["text"] = text.strip()
    elif html:
        clean = re.sub(r"<[^>]+>", "", html).strip()
        if clean:
            result["text"] = clean
        result["html"] = html

    section_hierarchy = getattr(block, "section_hierarchy", None) or (block.get("section_hierarchy") if isinstance(block, dict) else None)
    if section_hierarchy:
        if isinstance(section_hierarchy, dict):
            result["level"] = max(section_hierarchy.values()) if section_hierarchy else 1
        else:
            result["level"] = section_hierarchy

    polygon = getattr(block, "polygon", None) or (block.get("polygon") if isinstance(block, dict) else None)
    if polygon:
        result["bbox"] = polygon

    children = getattr(block, "children", None) or (block.get("children") if isinstance(block, dict) else None) or []
    cleaned_children = []
    for child in children:
        c = clean_block(child, images_map)
        if c:
            cleaned_children.append(c)
    if cleaned_children:
        result["children"] = cleaned_children

    if str(block_type) in ("Picture", "Figure", "Image"):
        img_id = str(result.get("id") or "")
        if img_id and img_id in images_map:
            result["image"] = images_map[img_id]

    return result


def parse_chapter(pdf_path: str, output_path: str, mode: str = "balanced", title: str = None):
    pdf_path = Path(pdf_path)
    output_path = Path(output_path)
    images_dir = output_path.parent / "images"

    print(f"Parsing: {pdf_path}")
    print(f"Mode: {mode}")

    config = {
        "output_format": "json",
        "mode": mode,
    }
    config_parser = ConfigParser(config)

    converter = PdfConverter(
        config=config_parser.generate_config_dict(),
        artifact_dict=create_model_dict(),
        processor_list=config_parser.get_processors(),
        renderer=config_parser.get_renderer(),
    )

    rendered = converter(str(pdf_path))

    images_map = extract_images_from_rendered(rendered, images_dir)

    pages = []
    children = getattr(rendered, "children", None) or []

    for page_idx, page_block in enumerate(children):
        page_data = {
            "page_number": page_idx + 1,
            "blocks": []
        }

        page_children = getattr(page_block, "children", None) or (page_block.get("children") if isinstance(page_block, dict) else []) or []
        for block in page_children:
            cleaned = clean_block(block, images_map)
            if cleaned:
                page_data["blocks"].append(cleaned)

        if not page_data["blocks"]:
            text = getattr(page_block, "text", None) or (page_block.get("text") if isinstance(page_block, dict) else None)
            if text:
                page_data["blocks"].append({
                    "type": "Text",
                    "text": text.strip()
                })

        pages.append(page_data)

    book = {
        "title": title or pdf_path.stem.replace("_", " ").title(),
        "source_file": pdf_path.name,
        "total_pages": len(pages),
        "pages": pages,
        "images_base_path": "data/images"
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(book, f, ensure_ascii=False, indent=2)

    print(f"✓ Saved clean JSON → {output_path}")
    print(f"  Pages: {len(pages)}")
    print(f"  Images: {len(images_map)} saved to {images_dir}")
    return book


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Parse NCERT chapter PDF with Marker")
    parser.add_argument("pdf", help="Path to chapter PDF")
    parser.add_argument("--out", "-o", required=True, help="Output JSON path")
    parser.add_argument("--title", default=None, help="Chapter title")
    parser.add_argument("--mode", default="balanced", choices=["balanced", "fast"],
                        help="balanced = best quality (GPU preferred), fast = CPU friendly")
    args = parser.parse_args()

    parse_chapter(args.pdf, args.out, mode=args.mode, title=args.title)
