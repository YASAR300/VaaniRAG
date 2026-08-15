#!/usr/bin/env python3
"""
scripts/ingest/clean_dataset.py — Phase 6: MSMARCO-XI Preprocessing & Cleaning Pipeline

Cleans and normalizes raw JSONL datasets across all 13 Indic languages:
  1. Unicode NFC normalization (essential for Indic script matra/character consistency)
  2. Whitespace & invisible character normalization
  3. Minimum character threshold filtering (drops empty/garbage/truncated fragments)
  4. Exact and near-duplicate removal (per language)
  5. Metadata preservation (source_lang, target_lang, translation meta, query_context)
  6. Outputs schema-compliant data/clean/<lang>.jsonl and data/clean/all_languages.jsonl

Usage:
  python scripts/ingest/clean_dataset.py
  python scripts/ingest/clean_dataset.py --input-dir data/raw --output-dir data/clean
"""

import os
import sys
import re
import json
import hashlib
import argparse
import unicodedata
from pathlib import Path
from typing import Dict, Any, List, Tuple, Set

# Ensure standard output can render all Indic scripts cleanly on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Minimum character length for a valid factual passage.
# Reasoning: In Indic scripts (Devanagari, Dravidian, etc.), 15 characters typically
# represents only 2-3 words. Anything shorter lacks sufficient semantic context for RAG.
MIN_PASSAGE_LENGTH = 15

# Whitespace and invisible formatting regex
RE_WHITESPACE = re.compile(r'[\r\t\f\v ]+')
RE_NEWLINES = re.compile(r'\n{3,}')
RE_INVISIBLE = re.compile(r'[\u200B-\u200D\uFEFF]')  # Zero-width spaces / joiners


def normalize_indic_text(text: str) -> str:
    """
    Apply Unicode NFC normalization and clean formatting whitespace.
    NFC (Canonical Decomposition, followed by Canonical Composition) ensures that
    composite Indic graphemes (consonant + vowel sign / matra) are normalized into
    consistent canonical code points across different keyboard inputs and translation models.
    """
    if not text or not isinstance(text, str):
        return ""

    # 1. Unicode NFC Normalization
    text = unicodedata.normalize("NFC", text)

    # 2. Strip invisible control / zero-width characters
    text = RE_INVISIBLE.sub("", text)

    # 3. Replace non-breaking spaces with standard space
    text = text.replace("\u00a0", " ")

    # 4. Collapse consecutive spaces/tabs
    text = RE_WHITESPACE.sub(" ", text)

    # 5. Collapse excessive line breaks
    text = RE_NEWLINES.sub("\n\n", text)

    return text.strip()


def compute_content_fingerprint(text: str) -> str:
    """
    Compute a normalized fingerprint for near-duplicate detection.
    Strips punctuation and spaces to compare underlying text structure.
    """
    # Remove punctuation and whitespace for fuzzy structural match
    clean = re.sub(r'[^\w]', '', text.lower())
    return hashlib.md5(clean.encode('utf-8')).hexdigest()


def generate_stable_id(language: str, text: str, index: int) -> str:
    """Generate a deterministic, traceable unique ID for each cleaned chunk."""
    content_hash = hashlib.sha256(f"{language}:{text}".encode('utf-8')).hexdigest()[:16]
    return f"{language}_{index}_{content_hash}"


def clean_language_file(
    input_file: Path,
    output_file: Path,
    lang_code: str
) -> Tuple[int, int, int, int]:
    """
    Process a single language raw JSONL file.
    Returns: (raw_count, clean_count, dup_count, short_count)
    """
    if not input_file.exists():
        return (0, 0, 0, 0)

    seen_fingerprints: Set[str] = set()
    cleaned_records: List[Dict[str, Any]] = []

    raw_count = 0
    dup_count = 0
    short_count = 0

    with open(input_file, "r", encoding="utf-8") as f:
        for line_idx, line in enumerate(f):
            line = line.strip()
            if not line:
                continue

            raw_count += 1
            try:
                record = json.loads(line)
            except Exception:
                continue

            raw_text = record.get("text", "")
            cleaned_text = normalize_indic_text(raw_text)

            # 1. Filter out empty or too-short passages
            if len(cleaned_text) < MIN_PASSAGE_LENGTH:
                short_count += 1
                continue

            # 2. Check for duplicate passages
            fingerprint = compute_content_fingerprint(cleaned_text)
            if fingerprint in seen_fingerprints:
                dup_count += 1
                continue

            seen_fingerprints.add(fingerprint)

            # 3. Format into standardized Phase 6 schema
            stable_id = generate_stable_id(lang_code, cleaned_text, len(cleaned_records))
            query_ctx = record.get("query") or record.get("Eng_Query") or None
            if query_ctx:
                query_ctx = normalize_indic_text(query_ctx)

            clean_entry = {
                "id": stable_id,
                "text": cleaned_text,
                "english_text": record.get("english_text"),
                "language": lang_code,
                "query_context": query_ctx,
                "source_lang": record.get("source_lang", "en"),
                "target_lang": record.get("target_lang", lang_code),
                "is_selected": record.get("is_selected", False),
                "meta": record.get("meta", {}),
            }
            cleaned_records.append(clean_entry)

    # Write cleaned output
    output_file.parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as f:
        for item in cleaned_records:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")

    return (raw_count, len(cleaned_records), dup_count, short_count)


def main():
    parser = argparse.ArgumentParser(description="Clean and preprocess MSMARCO-XI dataset")
    parser.add_argument(
        "--input-dir",
        type=str,
        default="data/raw",
        help="Directory with raw JSONL files (default: data/raw)"
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="data/clean",
        help="Directory to save cleaned JSONL files (default: data/clean)"
    )
    parser.add_argument(
        "--combine",
        action="store_true",
        default=True,
        help="Also write a combined all_languages.jsonl file (default: True)"
    )
    args = parser.parse_args()

    input_dir = Path(args.input_dir)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 75)
    print("  VaaniRAG — MSMARCO-XI Dataset Cleaning & Preprocessing")
    print("=" * 75)
    print(f"Input Directory:  {input_dir.resolve()}")
    print(f"Output Directory: {output_dir.resolve()}")
    print(f"Min Length:       {MIN_PASSAGE_LENGTH} characters")
    print(f"Normalization:    Unicode NFC + Whitespace Cleanup + Deduplication")
    print("-" * 75)

    raw_files = list(input_dir.glob("*.jsonl"))
    if not raw_files:
        print(f"⚠️ No .jsonl files found in {input_dir}. Please run download_dataset.py first.")
        return

    summary = []
    all_cleaned_records = []

    for raw_file in sorted(raw_files):
        lang_code = raw_file.stem
        out_file = output_dir / f"{lang_code}.jsonl"

        print(f">> Cleaning language: [{lang_code}] from {raw_file.name}...")
        raw_c, clean_c, dup_c, short_c = clean_language_file(raw_file, out_file, lang_code)

        summary.append({
            "lang": lang_code,
            "raw": raw_c,
            "clean": clean_c,
            "dups": dup_c,
            "short": short_c
        })

        if args.combine and out_file.exists():
            with open(out_file, "r", encoding="utf-8") as f:
                for line in f:
                    all_cleaned_records.append(line.strip())

    # Write combined file if requested
    if args.combine and all_cleaned_records:
        combined_file = output_dir / "all_languages.jsonl"
        with open(combined_file, "w", encoding="utf-8") as f:
            for line in all_cleaned_records:
                f.write(line + "\n")
        print(f"\n✅ Created combined corpus: {combined_file.name} ({len(all_cleaned_records):,} passages)")

    # Print summary table
    print("\n" + "=" * 75)
    print("  CLEANING SUMMARY")
    print("=" * 75)
    print(f"{'Lang':<6} | {'Raw In':<10} | {'Cleaned Out':<12} | {'Dups Dropped':<14} | {'Too Short':<10}")
    print("-" * 75)
    total_raw = total_clean = total_dups = total_short = 0
    for s in summary:
        print(f"{s['lang']:<6} | {s['raw']:<10,d} | {s['clean']:<12,d} | {s['dups']:<14,d} | {s['short']:<10,d}")
        total_raw += s['raw']
        total_clean += s['clean']
        total_dups += s['dups']
        total_short += s['short']
    print("-" * 75)
    print(f"{'TOTAL':<6} | {total_raw:<10,d} | {total_clean:<12,d} | {total_dups:<14,d} | {total_short:<10,d}")
    print("=" * 75)


if __name__ == "__main__":
    main()
