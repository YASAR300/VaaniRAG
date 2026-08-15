#!/usr/bin/env python3
"""
scripts/ingest/download_dataset.py — Phase 6: MSMARCO-XI Multi-Language Ingestion

Pulls all 13 Indic language subsets of ai4bharat/MSMARCO-XI:
  as (Assamese), bn (Bengali), gu (Gujarati), hi (Hindi), kn (Kannada),
  ml (Malayalam), mr (Marathi), ne (Nepali), or (Odia), pa (Punjabi),
  ta (Tamil), te (Telugu), ur (Urdu).

Output:
  data/raw/<lang_code>.jsonl (one JSONL file per language)

Usage:
  python scripts/ingest/download_dataset.py                          # Ingest all 13 languages (default)
  python scripts/ingest/download_dataset.py --split validation       # Fast evaluation / validation subset
  python scripts/ingest/download_dataset.py --languages hi,ta       # Dev/test specific languages
  python scripts/ingest/download_dataset.py --limit 1000             # Cap records for rapid testing
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import List, Dict, Any, Optional

# Ensure standard output can render all Indic scripts cleanly on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# 13 Indic languages required by the hackathon organizers
ALL_LANGUAGES = [
    "as", "bn", "gu", "hi", "kn", "ml", "mr", "ne", "or", "pa", "ta", "te", "ur"
]

LANGUAGE_NAMES = {
    "as": "Assamese",
    "bn": "Bengali",
    "gu": "Gujarati",
    "hi": "Hindi",
    "kn": "Kannada",
    "ml": "Malayalam",
    "mr": "Marathi",
    "ne": "Nepali",
    "or": "Odia",
    "pa": "Punjabi",
    "ta": "Tamil",
    "te": "Telugu",
    "ur": "Urdu",
}

# Parquet file mapping on Hugging Face repo ai4bharat/MSMARCO-XI
LANGUAGE_FILES = {
    "as": {"train": "train/asmtrain.parquet", "validation": "validation/asmval.parquet"},
    "bn": {"train": "train/bentrain.parquet", "validation": "validation/benval.parquet"},
    "gu": {"train": "train/gujtrain.parquet", "validation": "validation/gujval.parquet"},
    "hi": {"train": "train/hintrain.parquet", "validation": "validation/hinval.parquet"},
    "kn": {"train": "train/kantrain.parquet", "validation": "validation/kanval.parquet"},
    "ml": {"train": "train/maltrain.parquet", "validation": "validation/malval.parquet"},
    "mr": {"train": "train/martrain.parquet", "validation": "validation/marval.parquet"},
    "ne": {"train": "train/neptrain.parquet", "validation": "validation/nepval.parquet"},
    "or": {"train": "train/oritrain.parquet", "validation": "validation/orival.parquet"},
    "pa": {"train": "train/pantrain.parquet", "validation": "validation/panval.parquet"},
    "ta": {"train": "train/tamtrain.parquet", "validation": "validation/tamval.parquet"},
    "te": {"train": "validation/telval.parquet", "validation": "validation/telval.parquet"},
    "ur": {"train": "train/urdtrain.parquet", "validation": "validation/urdval.parquet"},
}

REPO_ID = "ai4bharat/MSMARCO-XI"

# Force all Hugging Face downloads and cache to live strictly inside this project folder (D: drive)
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
PROJECT_CACHE_DIR = PROJECT_ROOT / "data" / ".hf_cache"
PROJECT_CACHE_DIR.mkdir(parents=True, exist_ok=True)

os.environ["HF_HOME"] = str(PROJECT_CACHE_DIR)
os.environ["HUGGINGFACE_HUB_CACHE"] = str(PROJECT_CACHE_DIR)
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"


def download_and_load_parquet(filename: str) -> Any:
    """Download a parquet file directly into the local project directory and return a pandas DataFrame."""
    from huggingface_hub import hf_hub_download
    import pandas as pd

    local_path = hf_hub_download(
        repo_id=REPO_ID,
        filename=filename,
        repo_type="dataset",
        local_dir=str(PROJECT_CACHE_DIR),
        local_dir_use_symlinks=False
    )
    return pd.read_parquet(local_path)


def process_and_extract_passages(df_records: List[Dict[str, Any]], lang: str) -> List[Dict[str, Any]]:
    """
    Extract individual passages tagged with query and language metadata.
    MSMARCO-XI schema:
      - query: Translated query
      - Answer / Eng_Answer: Answers
      - passages: {
          'Translated_passages': [...],
          'English_passages': [...],
          'is_selected': [...]
        }
      - source_lang, target_lang, meta
    """
    extracted = []

    for idx, row in enumerate(df_records):
        query_text = row.get("query") or row.get("Eng_Query") or ""
        answer_text = row.get("Answer") or row.get("Eng_Answer") or ""
        source_lang = row.get("source_lang", "en")
        target_lang = row.get("target_lang", lang)
        meta = row.get("meta", {})
        query_id = row.get("query_id", idx)

        passages_obj = row.get("passages", {})
        if isinstance(passages_obj, dict):
            translated_passages = passages_obj.get("Translated_passages")
            if translated_passages is None:
                translated_passages = []
            elif hasattr(translated_passages, "tolist"):
                translated_passages = translated_passages.tolist()

            english_passages = passages_obj.get("English_passages")
            if english_passages is None:
                english_passages = []
            elif hasattr(english_passages, "tolist"):
                english_passages = english_passages.tolist()

            is_selected = passages_obj.get("is_selected")
            if is_selected is None:
                is_selected = []
            elif hasattr(is_selected, "tolist"):
                is_selected = is_selected.tolist()

            for p_idx, p_text in enumerate(translated_passages):
                if not p_text or not str(p_text).strip():
                    continue
                selected = bool(is_selected[p_idx]) if p_idx < len(is_selected) else False
                eng_text = english_passages[p_idx] if p_idx < len(english_passages) else None

                extracted.append({
                    "raw_id": f"{lang}_{query_id}_{p_idx}",
                    "text": str(p_text).strip(),
                    "english_text": str(eng_text).strip() if eng_text else None,
                    "language": lang,
                    "query": str(query_text).strip(),
                    "answer": str(answer_text).strip(),
                    "is_selected": selected,
                    "source_lang": str(source_lang),
                    "target_lang": str(target_lang),
                    "meta": meta if isinstance(meta, dict) else {},
                })
        elif isinstance(row.get("text"), str) and row.get("text").strip():
            extracted.append({
                "raw_id": f"{lang}_{query_id}",
                "text": str(row["text"]).strip(),
                "language": lang,
                "query": str(query_text).strip(),
                "answer": str(answer_text).strip(),
                "is_selected": True,
                "source_lang": str(source_lang),
                "target_lang": str(target_lang),
                "meta": meta if isinstance(meta, dict) else {},
            })

    return extracted


def ingest_language(lang: str, split: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
    """Fetch parquet rows for a specific language and extract passages."""
    files_info = LANGUAGE_FILES.get(lang, {})
    filenames = []

    if split == "both":
        filenames = [files_info.get("validation"), files_info.get("train")]
    elif split == "train":
        filenames = [files_info.get("train", files_info.get("validation"))]
    else:  # validation
        filenames = [files_info.get("validation", files_info.get("train"))]

    filenames = list(dict.fromkeys([f for f in filenames if f]))

    all_rows = []
    for fn in filenames:
        try:
            print(f"[{lang}] Fetching {fn} from Hugging Face...")
            df = download_and_load_parquet(fn)
            if limit and len(df) > limit:
                df = df.iloc[:limit]
            all_rows.extend(df.to_dict(orient="records"))
            print(f"[{lang}] Loaded {len(df):,} rows from {fn}")
            if limit and len(all_rows) >= limit:
                all_rows = all_rows[:limit]
                break
        except Exception as e:
            print(f"[{lang}] Warning: Could not fetch {fn}: {e}")

    if not all_rows:
        return []

    return process_and_extract_passages(all_rows, lang)


def main():
    parser = argparse.ArgumentParser(description="Download all 13 Indic language subsets of MSMARCO-XI")
    parser.add_argument(
        "--languages",
        type=str,
        default=",".join(ALL_LANGUAGES),
        help="Comma-separated language codes (default: all 13 languages: as,bn,gu,hi,kn,ml,mr,ne,or,pa,ta,te,ur)"
    )
    parser.add_argument(
        "--split",
        type=str,
        choices=["validation", "train", "both"],
        default="validation",
        help="Dataset split to download (default: validation - ideal for high-speed indexing & retrieval)"
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="data/raw",
        help="Directory to save raw JSONL files (default: data/raw)"
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Optional limit on records per language (for development testing)"
    )
    args = parser.parse_args()

    target_languages = [l.strip() for l in args.languages.split(",") if l.strip()]
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 75)
    print("  VaaniRAG — MSMARCO-XI Ingestion (All 13 Indic Languages)")
    print("=" * 75)
    print(f"Target Languages ({len(target_languages)}): {', '.join(target_languages)}")
    print(f"Split:            {args.split}")
    print(f"Output Directory: {output_dir.resolve()}")
    if args.limit:
        print(f"Limit per lang:   {args.limit:,}")
    print("-" * 75)

    summary = []

    for lang in target_languages:
        lang_name = LANGUAGE_NAMES.get(lang, "Unknown")
        print(f"\n>> [{lang}] Ingesting {lang_name}...")

        passages = ingest_language(lang, split=args.split, limit=args.limit)

        if not passages:
            print(f"[{lang}] ❌ No passages extracted.")
            summary.append({"lang": lang, "name": lang_name, "count": 0, "status": "FAILED"})
            continue

        out_file = output_dir / f"{lang}.jsonl"
        with open(out_file, "w", encoding="utf-8") as f:
            for p in passages:
                f.write(json.dumps(p, ensure_ascii=False) + "\n")

        count = len(passages)
        print(f"[{lang}] ✅ Saved {count:,} passages to {out_file.name}")
        summary.append({
            "lang": lang,
            "name": lang_name,
            "count": count,
            "status": "SUCCESS",
            "file": str(out_file)
        })

    # Print summary table
    print("\n" + "=" * 75)
    print("  INGESTION SUMMARY TABLE")
    print("=" * 75)
    print(f"{'Code':<6} | {'Language':<14} | {'Passages Extracted':<18} | {'Status':<10}")
    print("-" * 75)
    total_count = 0
    for s in summary:
        print(f"{s['lang']:<6} | {s['name']:<14} | {s['count']:<18,d} | {s['status']:<10}")
        total_count += s['count']
    print("-" * 75)
    print(f"Total Passages Across All Languages: {total_count:,}")
    print("=" * 75)


if __name__ == "__main__":
    main()
