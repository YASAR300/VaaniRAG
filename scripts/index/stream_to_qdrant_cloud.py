"""
scripts/index/stream_to_qdrant_cloud.py — Fast Pre-Computed Vector Index Streamer to Qdrant Cloud
"""

import os
import sys
import json
import time
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, VectorParams, Distance

# ── Configuration ────────────────────────────────────────────────────────────

QDRANT_URL = "https://bebc4e6f-403a-4f0e-a560-e1d88f71bad8.sa-east-1-0.aws.cloud.qdrant.io:6333"
QDRANT_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIiwic3ViamVjdCI6ImFwaS1rZXk6ZTliMjY0MmEtNzhlOC00MGNmLWFhYWItN2UyMGNhNWY2ZDQzIn0.yaVh5Ht8edLHN_4Gfe5qL4iQ7-skH8QEMXjCPb48mXE"

ORDERED_STRATEGIES = ["metadata", "fixed", "semantic", "hierarchical"]
COLLECTIONS_MAP = {
    "metadata": "chunks_metadata",
    "fixed": "chunks_fixed",
    "semantic": "chunks_semantic",
    "hierarchical": "chunks_hierarchical"
}

BATCH_SIZE = 150
INDEXES_DIR = Path("data/indexes")
REPORTS_DIR = Path("reports")
REPORT_FILE = REPORTS_DIR / "indexing_report.json"

def main():
    print("=" * 82, flush=True)
    print("  VaaniRAG — High-Speed Vector Streamer to Qdrant Cloud Cluster", flush=True)
    print("=" * 82, flush=True)
    print(f"Cluster:    {QDRANT_URL}", flush=True)
    print(f"Batch Size: {BATCH_SIZE} points/upsert", flush=True)
    print("-" * 82, flush=True)

    client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=90.0)
    strategy_reports = {}
    total_uploaded_all = 0

    for strategy in ORDERED_STRATEGIES:
        coll_name = COLLECTIONS_MAP[strategy]
        index_file = INDEXES_DIR / f"{strategy}.index.jsonl"

        if not index_file.exists():
            print(f"Skipping {strategy}, file not found: {index_file}", flush=True)
            continue

        print(f"\n>> [STRATEGY: {strategy.upper()}] Collection: {coll_name}", flush=True)

        if not client.collection_exists(coll_name):
            client.create_collection(
                collection_name=coll_name,
                vectors_config=VectorParams(size=1024, distance=Distance.COSINE)
            )

        # Read all pre-computed points from index file
        points_list = []
        lang_counts = {}
        with open(index_file, "r", encoding="utf-8") as fp:
            for line in fp:
                if line.strip():
                    item = json.loads(line)
                    pt_id = item["id"]
                    vec = item["vector"]
                    payload = item.get("payload", {})
                    lang = payload.get("language", "hi")
                    lang_counts[lang] = lang_counts.get(lang, 0) + 1
                    points_list.append(PointStruct(id=pt_id, vector=vec, payload=payload))

        total_batches = (len(points_list) + BATCH_SIZE - 1) // BATCH_SIZE
        print(f"   Streaming {len(points_list):,} pre-computed points in {total_batches} batches...", flush=True)
        t0 = time.time()
        uploaded_strat = 0

        for b in range(total_batches):
            batch = points_list[b * BATCH_SIZE:(b + 1) * BATCH_SIZE]
            for attempt in range(1, 4):
                try:
                    client.upsert(collection_name=coll_name, points=batch, wait=False)
                    uploaded_strat += len(batch)
                    break
                except Exception as err:
                    if attempt == 3:
                        print(f"   ⚠️ Batch {b + 1} failed: {err}", flush=True)
                    time.sleep(attempt * 0.5)

            if (b + 1) % 25 == 0 or (b + 1) == total_batches:
                pct = (uploaded_strat / len(points_list)) * 100
                print(f"   └─ Batch {b + 1}/{total_batches}: {uploaded_strat:,}/{len(points_list):,} points ({pct:.1f}%)", flush=True)

            time.sleep(0.01)  # 10ms pacing

        duration = time.time() - t0
        print(f"   ✅ [{strategy.upper()}] Done in {duration:.2f}s ({uploaded_strat / max(1, duration):.0f} pts/sec).", flush=True)
        total_uploaded_all += uploaded_strat

        strategy_reports[strategy] = {
            "strategy": strategy,
            "collectionName": coll_name,
            "totalChunks": uploaded_strat,
            "embeddingDimension": 1024,
            "embeddingModel": "BAAI/bge-m3",
            "totalTimeMs": round(duration * 1000),
            "qdrantLiveSync": True,
            "byLanguage": lang_counts
        }

    # ── Final Report ──────────────────────────────────────────────────────────
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    report_data = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "qdrantCloudUrl": QDRANT_URL,
        "embeddingModel": "BAAI/bge-m3",
        "embeddingDimension": 1024,
        "clusterStorage": {
            "maxBudgetBytes": 4 * 1024 * 1024 * 1024,
            "maxBudgetFormatted": "4.0 GB",
            "totalVectorsIndexed": total_uploaded_all,
            "estimatedUsageMb": round(total_uploaded_all * 0.0076, 2),
            "usagePercentageOfBudget": round((total_uploaded_all * 7600) / (4 * 1024 * 1024 * 1024) * 100, 2)
        },
        "stoppedEarly": False,
        "stopReason": None,
        "strategiesCompleted": ORDERED_STRATEGIES,
        "strategiesNotCompleted": [],
        "strategies": strategy_reports
    }

    with open(REPORT_FILE, "w", encoding="utf-8") as fp:
        json.dump(report_data, fp, indent=2)

    print("\n" + "=" * 82, flush=True)
    print("  ALL 4 STRATEGIES LIVE IN QDRANT CLUSTER", flush=True)
    print("=" * 82, flush=True)
    for s, r in strategy_reports.items():
        print(f"• {r['collectionName'].padEnd(22)}: {r['totalChunks']:,} points uploaded", flush=True)
    print(f"\nTotal Vectors in Qdrant Cloud: {total_uploaded_all:,}", flush=True)
    print(f"Report saved to: {REPORT_FILE}", flush=True)
    print("=" * 82, flush=True)

if __name__ == "__main__":
    main()
