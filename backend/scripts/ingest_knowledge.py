from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path
import sys
import re

_repo_root = Path(__file__).resolve().parents[2]
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))

from backend.src.database import SupabaseDatabase
from backend.src.gemini_engine import GeminiEngine


@dataclass(frozen=True)
class KnowledgeItem:
    content: str
    category: str | None


def _split_blocks(text: str) -> list[str]:
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    if "\n---\n" in normalized:
        return [b.strip() for b in normalized.split("\n---\n") if b.strip()]
    blocks: list[str] = []
    current: list[str] = []
    for line in normalized.split("\n"):
        if line.strip():
            current.append(line)
            continue
        if current:
            blocks.append("\n".join(current).strip())
            current = []
    if current:
        blocks.append("\n".join(current).strip())
    return [b for b in blocks if b]


_CATEGORY_HEADER_RE = re.compile(r"^===\s*カテゴリ[:：]\s*.+?\(([^)]+)\)\s*===\s*$", re.IGNORECASE)


def _extract_category_header(line: str) -> str | None:
    m = _CATEGORY_HEADER_RE.match(line.strip())
    if not m:
        return None
    value = (m.group(1) or "").strip()
    return value or None


def _split_items(text: str) -> list[KnowledgeItem]:
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    current_category: str | None = None
    current_lines: list[str] = []
    items: list[KnowledgeItem] = []

    def flush() -> None:
        nonlocal current_lines
        if not current_lines:
            return
        block = "\n".join(current_lines).strip()
        current_lines = []
        if not block:
            return
        item = _parse_block(block, default_category=current_category)
        if item.content:
            items.append(item)

    for raw_line in normalized.split("\n"):
        line = raw_line.rstrip("\n")
        header_category = _extract_category_header(line)
        if header_category is not None:
            flush()
            current_category = header_category
            continue

        if line.strip() == "---":
            flush()
            continue

        if not line.strip():
            flush()
            continue

        if line.lstrip().startswith("【") and "】" in line:
            if current_lines:
                flush()
            current_lines.append(line)
            continue

        current_lines.append(line)

    flush()
    return items


def _parse_block(block: str, default_category: str | None) -> KnowledgeItem:
    lines = block.split("\n")
    category = default_category
    content_lines: list[str] = []
    for i, line in enumerate(lines):
        if i == 0:
            trimmed = line.strip()
            lowered = trimmed.lower()
            if lowered.startswith("category:") or lowered.startswith("category="):
                category = trimmed.split(":", 1)[1].strip() if ":" in trimmed else trimmed.split("=", 1)[1].strip()
                category = category or default_category
                continue
            if trimmed.startswith("カテゴリ:") or trimmed.startswith("カテゴリ："):
                category = trimmed.split(":", 1)[1].strip() if ":" in trimmed else trimmed.split("：", 1)[1].strip()
                category = category or default_category
                continue
            header_category = _extract_category_header(trimmed)
            if header_category is not None:
                category = header_category
                continue
            if trimmed.startswith("【") and "】" in trimmed:
                end = trimmed.find("】")
                maybe = trimmed[1:end].strip()
                rest = trimmed[end + 1 :].strip()
                if maybe:
                    category = category or maybe
                if rest:
                    content_lines.append(rest)
                continue
        content_lines.append(line)
    content = "\n".join(content_lines).strip()
    return KnowledgeItem(content=content, category=category)


def load_knowledge_items(path: Path, default_category: str | None) -> list[KnowledgeItem]:
    text = path.read_text(encoding="utf-8")
    items = _split_items(text)
    if default_category and default_category.strip():
        return [KnowledgeItem(content=i.content, category=i.category or default_category.strip()) for i in items]
    return items


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", required=True)
    parser.add_argument("--category", default=None)
    parser.add_argument("--threshold", type=float, default=0.6)
    parser.add_argument("--count", type=int, default=2)
    parser.add_argument("--no-embedding", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--reset", action="store_true")
    args = parser.parse_args()

    file_path = Path(args.file)
    if not file_path.exists():
        raise SystemExit(f"file not found: {file_path}")

    items = load_knowledge_items(file_path, default_category=args.category)
    if not items:
        print("no items")
        return 0

    category_counts: dict[str, int] = {}
    for it in items:
        key = it.category or ""
        category_counts[key] = int(category_counts.get(key, 0)) + 1
    for key in sorted(category_counts.keys()):
        label = key if key else "(none)"
        print(f"category {label}: {category_counts[key]}")

    database = SupabaseDatabase()
    engine = None if args.no_embedding or args.dry_run else GeminiEngine()

    inserted = 0
    updated = 0
    skipped = 0

    if args.reset and not args.dry_run:
        database.delete_all_knowledge()

    for item in items:
        existing_id = database.find_knowledge_id_by_content(item.content)
        if args.dry_run:
            if existing_id:
                skipped += 1
            else:
                inserted += 1
            continue

        embedding = None
        if engine is not None:
            embedding = engine.embed_text(item.content)

        saved_id = database.upsert_knowledge(
            content=item.content,
            embedding=embedding,
            category=item.category,
        )
        if existing_id and saved_id:
            updated += 1
        else:
            inserted += 1

        if engine is not None:
            try:
                matches = database.match_knowledge(
                    query_embedding=embedding or [],
                    match_threshold=float(args.threshold),
                    match_count=int(args.count),
                )
                if matches:
                    top = matches[0]
                    print(f"match: similarity={top.get('similarity', 0.0):.3f} id={top.get('id','')}")
            except Exception:
                pass

    print(f"items={len(items)} inserted={inserted} updated={updated} skipped={skipped}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
