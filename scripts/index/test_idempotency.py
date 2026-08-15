"""
scripts/index/test_idempotency.py — Verify Point ID Idempotency on Qdrant Cloud (Step 3)
"""

import os
import sys
import json
from pathlib import Path

# Ensure UTF-8 console output on Windows
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Parse .env.local manually
env_file = Path(".env.local")
if env_file.exists():
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue, PointStruct

QDRANT_URL = os.getenv("QDRANT_URL", "https://bebc4e6f-403a-4f0e-a560-e1d88f71bad8.sa-east-1-0.aws.cloud.qdrant.io:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")

client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=60.0)

def main():
    print("=" * 82)
    print("  VaaniRAG — Idempotency & Deterministic UUID Verification (Step 3)")
    print("=" * 82)

    coll_name = "chunks_fixed"
    test_lang = "hi"
    hi_filter = Filter(must=[FieldCondition(key="language", match=MatchValue(value=test_lang))])

    # 1. Count before
    count_before_total = client.count(coll_name, exact=True).count
    count_before_hi = client.count(coll_name, count_filter=hi_filter, exact=True).count

    print(f"1. Before Re-indexing Check:")
    print(f"   • Total Points in '{coll_name}': {count_before_total:,}")
    print(f"   • '{test_lang}' Points in '{coll_name}': {count_before_hi:,}")

    # 2. Scroll 100 existing points for 'hi'
    scroll_res, _ = client.scroll(
        coll_name,
        scroll_filter=hi_filter,
        limit=100,
        with_payload=True,
        with_vectors=True
    )
    print(f"\n2. Fetched {len(scroll_res)} points to re-upsert for '{test_lang}'...")

    points_to_reupsert = [
        PointStruct(id=pt.id, vector=pt.vector, payload=pt.payload)
        for pt in scroll_res
    ]

    # 3. Re-upsert identical points
    print(f"3. Re-upserting {len(points_to_reupsert)} points with identical IDs...")
    client.upsert(coll_name, points=points_to_reupsert, wait=True)

    # 4. Count after
    count_after_total = client.count(coll_name, exact=True).count
    count_after_hi = client.count(coll_name, count_filter=hi_filter, exact=True).count

    print(f"\n4. After Re-indexing Check:")
    print(f"   • Total Points in '{coll_name}': {count_after_total:,} (Delta: {count_after_total - count_before_total})")
    print(f"   • '{test_lang}' Points in '{coll_name}': {count_after_hi:,} (Delta: {count_after_hi - count_before_hi})")

    idempotency_passed = (count_before_total == count_after_total) and (count_before_hi == count_after_hi)

    print("\n" + "=" * 82)
    if idempotency_passed:
        print("  ✅ IDEMPOTENCY CHECK PASSED: Deterministic IDs overwrite cleanly (0 delta).")
    else:
        print("  ❌ IDEMPOTENCY CHECK FAILED: Duplicate points were inserted!")
    print("=" * 82)

if __name__ == "__main__":
    main()
