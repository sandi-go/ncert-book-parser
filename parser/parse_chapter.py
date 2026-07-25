#!/usr/bin/env python3
"""
Parse a single NCERT chapter PDF using Marker and produce a clean Book JSON
suitable for the Next.js reader.

Images are extracted from per-block base64 (JSON output) and saved to disk.
BBox / polygon preserved for accurate UI placement.

Usage:
    python parse_chapter.py path/to/chapter.pdf --out ../web/public/data/chapter1.json --title "Chapter 1" --mode fast
"""

from __future__ import annotations

import argparse
import base64
import io
import json
import re
from pathlib import Path
from typing import Any

from marker.converters.pdf import PdfConverter
from marker.models import create_model_dict
from marker.config.parser import ConfigParser

try:
    from PIL import Image
except ImportError:
    Image = None  # type: ignore


def _get(obj: Any, key: str, default=None):
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def _as_list(obj: Any):
    if obj is None:
        return []
    if isinstance(obj, list):
        return obj
    try:
        return list(obj)
    except TypeError:
        return []


def save_base64_image(data: str, filepath: Path) -> bool:
    """Decode base64 (raw or data-URL) and save as image file."""
    try:
        if "," in data and data.strip().startswith("data:"):
            data = data.split(",", 1)[1]
        raw = base64.b64decode(data)
        filepath.parent.mkdir(parents=True, exist_ok=True)

        if Image is not None:
            img = Image.open(io.BytesIO(raw))
            if img.mode not in ("RGB", "L"):
                img = img.convert("RGB")
            img.save(filepath, format="PNG")
        else:
            with open(filepath, "wb") as f:
                f.write(raw)
        return True
    except Exception as e:
        print(f"  ! failed to save image {filepath.name}: {e}")
        return False


def collect_images_from_tree(block: Any, images_dir: Path, images_map: dict[str, str], counter: list[int]):
    """
    Recursively walk Marker JSON blocks and extract embedded base64 images.
    Marker puts images on leaf Picture/Figure blocks under block.images = {block_id: base64}.
    """
    block_id = str(_get(block, "id") or "")
    block_type = str(_get(block, "block_type") or "")

    # 1) images dict on the block itself
    images = _get(block, "images") or {}
    if isinstance(images, dict):
        for key, val in images.items():
            if not val or not isinstance(val, str):
                continue
            counter[0] += 1
            safe = re.sub(r"[^a-zA-Z0-9._-]+", "_", str(key))[:80]
            filename = f"img_{counter[0]:04d}_{safe}.png"
            filepath = images_dir / filename
            if save_base64_image(val, filepath):
                # map both the dict key and the block id
                rel = f"images/{filename}"
                images_map[str(key)] = rel
                if block_id:
                    images_map[block_id] = rel

    # 2) also check top-level rendered.images style (PIL / bytes) if somehow present
    # handled separately by caller

    for child in _as_list(_get(block, "children")):
        collect_images_from_tree(child, images_dir, images_map, counter)


def normalize_bbox(bbox, polygon) -> list[float] | None:
    """
    Return [x1, y1, x2, y2] in PDF coordinates.
    Marker provides bbox as list[float] and/or polygon as 4 corners.
    """
    if bbox and isinstance(bbox, (list, tuple)) and len(bbox) >= 4:
        try:
            return [float(bbox[0]), float(bbox[1]), float(bbox[2]), float(bbox[3])]
        except (TypeError, ValueError):
            pass

    if polygon and isinstance(polygon, (list, tuple)) and len(polygon) >= 2:
        try:
            xs = [float(p[0]) for p in polygon if p is not None]
            ys = [float(p[1]) for p in polygon if p is not None]
            if xs and ys:
                return [min(xs), min(ys), max(xs), max(ys)]
        except (TypeError, ValueError, IndexError):
            pass
    return None


def clean_block(block: Any, images_map: dict[str, str], page_bbox: list[float] | None) -> dict | None:
    if block is None:
        return None

    block_type = _get(block, "block_type")
    if block_type is None:
        return None
    block_type = str(block_type)

    # skip headers/footers noise
    if block_type in ("PageHeader", "PageFooter", "Header", "Footer"):
        return None

    block_id = str(_get(block, "id") or "")
    result: dict[str, Any] = {
        "id": block_id or None,
        "type": block_type,
    }

    html = _get(block, "html")
    text = _get(block, "text")

    if text and str(text).strip():
        result["text"] = str(text).strip()
    elif html:
        clean = re.sub(r"<[^>]+>", " ", str(html))
        clean = re.sub(r"\s+", " ", clean).strip()
        # skip pure content-ref placeholders
        if clean and "content-ref" not in clean.lower():
            result["text"] = clean
        # keep html for tables etc.
        if block_type in ("Table", "Form") or "<table" in str(html).lower():
            result["html"] = str(html)

    section_hierarchy = _get(block, "section_hierarchy")
    if section_hierarchy:
        if isinstance(section_hierarchy, dict) and section_hierarchy:
            try:
                result["level"] = max(int(k) for k in section_hierarchy.keys())
            except Exception:
                result["level"] = 1
        elif isinstance(section_hierarchy, (int, float)):
            result["level"] = int(section_hierarchy)

    bbox = normalize_bbox(_get(block, "bbox"), _get(block, "polygon"))
    if bbox:
        result["bbox"] = bbox  # [x1,y1,x2,y2]
        # also store page-relative percentages for the UI (0-100)
        if page_bbox and page_bbox[2] > page_bbox[0] and page_bbox[3] > page_bbox[1]:
            pw = page_bbox[2] - page_bbox[0]
            ph = page_bbox[3] - page_bbox[1]
            result["rel"] = {
                "x": round((bbox[0] - page_bbox[0]) / pw * 100, 2),
                "y": round((bbox[1] - page_bbox[1]) / ph * 100, 2),
                "w": round((bbox[2] - bbox[0]) / pw * 100, 2),
                "h": round((bbox[3] - bbox[1]) / ph * 100, 2),
            }

    # images
    if block_type in ("Picture", "Figure", "Image", "Diagram"):
        if block_id and block_id in images_map:
            result["image"] = images_map[block_id]
        else:
            # try any key that contains the id tail
            for k, v in images_map.items():
                if block_id and (block_id in k or k in block_id):
                    result["image"] = v
                    break

    children_out = []
    for child in _as_list(_get(block, "children")):
        c = clean_block(child, images_map, page_bbox)
        if c:
            children_out.append(c)
    if children_out:
        result["children"] = children_out

    # drop empty noise blocks
    if (
        not result.get("text")
        and not result.get("html")
        and not result.get("image")
        and not result.get("children")
    ):
        return None

    return result


def parse_chapter(pdf_path: str, output_path: str, mode: str = "fast", title: str | None = None):
    pdf_path = Path(pdf_path)
    output_path = Path(output_path)
    images_dir = output_path.parent / "images"
    images_dir.mkdir(parents=True, exist_ok=True)

    print(f"Parsing: {pdf_path}")
    print(f"Mode: {mode}")

    config = {
        "output_format": "json",
        "mode": mode,
        # ensure images are extracted
        "disable_image_extraction": False,
    }
    config_parser = ConfigParser(config)

    converter = PdfConverter(
        config=config_parser.generate_config_dict(),
        artifact_dict=create_model_dict(),
        processor_list=config_parser.get_processors(),
        renderer=config_parser.get_renderer(),
    )

    rendered = converter(str(pdf_path))

    # --- Collect images from JSON tree (base64 on blocks) ---
    images_map: dict[str, str] = {}
    counter = [0]
    pages_raw = _as_list(_get(rendered, "children"))

    for page_block in pages_raw:
        collect_images_from_tree(page_block, images_dir, images_map, counter)

    # also try top-level rendered.images (markdown/html style)
    top_images = _get(rendered, "images") or {}
    if isinstance(top_images, dict):
        for img_id, img_data in top_images.items():
            counter[0] += 1
            safe = re.sub(r"[^a-zA-Z0-9._-]+", "_", str(img_id))[:80]
            filename = f"img_{counter[0]:04d}_{safe}.png"
            filepath = images_dir / filename
            saved = False
            if hasattr(img_data, "save"):
                try:
                    img_data.save(filepath)
                    saved = True
                except Exception:
                    pass
            elif isinstance(img_data, (bytes, bytearray)):
                filepath.write_bytes(img_data)
                saved = True
            elif isinstance(img_data, str):
                saved = save_base64_image(img_data, filepath)
            if saved:
                images_map[str(img_id)] = f"images/{filename}"

    print(f"  Extracted {len(images_map)} image refs → {images_dir}")

    # --- Build clean pages ---
    pages = []
    for page_idx, page_block in enumerate(pages_raw):
        page_bbox = normalize_bbox(_get(page_block, "bbox"), _get(page_block, "polygon"))

        page_data: dict[str, Any] = {
            "page_number": page_idx + 1,
            "blocks": [],
        }
        if page_bbox:
            page_data["bbox"] = page_bbox
            # aspect ratio for UI (width/height)
            pw = page_bbox[2] - page_bbox[0]
            ph = page_bbox[3] - page_bbox[1]
            if ph > 0:
                page_data["aspect"] = round(pw / ph, 4)

        for block in _as_list(_get(page_block, "children")):
            cleaned = clean_block(block, images_map, page_bbox)
            if cleaned:
                page_data["blocks"].append(cleaned)

        pages.append(page_data)

    book = {
        "title": title or pdf_path.stem.replace("_", " ").title(),
        "source_file": pdf_path.name,
        "total_pages": len(pages),
        "pages": pages,
        "images_base_path": "data",
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(book, f, ensure_ascii=False, indent=2)

    print(f"✓ Saved → {output_path}")
    print(f"  Pages: {len(pages)}")
    print(f"  Images on disk: {len(list(images_dir.glob('img_*.png')))}")
    return book


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Parse NCERT chapter PDF with Marker")
    parser.add_argument("pdf", help="Path to chapter PDF")
    parser.add_argument("--out", "-o", required=True, help="Output JSON path")
    parser.add_argument("--title", default=None, help="Chapter title")
    parser.add_argument(
        "--mode",
        default="fast",
        choices=["balanced", "fast"],
        help="balanced = best quality (needs Docker+GPU), fast = CPU/GPU friendly",
    )
    args = parser.parse_args()
    parse_chapter(args.pdf, args.out, mode=args.mode, title=args.title)
