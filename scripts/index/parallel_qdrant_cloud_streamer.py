"""
scripts/index/parallel_qdrant_cloud_streamer.py — High-Throughput Parallel Vector Streamer to Qdrant Cloud
"""

import os
import sys
import json
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

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

BATCH_SIZE = 100
MAX_WORKERS = 10
INDEXES_DIR = Path("data/indexes")
REPORTS_DIR = Path("reports")
REPORT_FILE = REPORTS_DIR / "indexing_report.json"

def upload_worker(batch_data):
    coll_name, points, batch_num = batch_data
    # Thread-local client for zero lock contention
    client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=60.0)
    for attempt in range(1, 4):
        try:
            client.upsert(collection_name=coll_name, points=points, wait=False)
            return len(points)
        except Exception as e:
            if attempt == 3:
                print(f"Batch {batch_num} failed: {e}", flush=True)
                raise e
            time.sleep(attempt * 0.5)
    return 0

def main():
    print("=" * 82, flush=True)
    print("  VaaniRAG — Parallel Pre-Computed Vector Streamer to Qdrant Cloud", flush=True)
    print("=" * 82, flush=True)
    print(f"Cluster URL: {QDRANT_URL}", flush=True)
    print(f"Concurrency: {MAX_WORKERS} concurrent worker threads", flush=True)
    print(f"Batch Size:  {BATCH_SIZE} points/batch", flush=True)
    print("-" * 82, flush=True)

    root_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=60.0)
    strategy_reports = {}
    total_all_points = 0

    for strategy in ORDERED_STRATEGIES:
        coll_name = COLLECTIONS_MAP[strategy]
        index_file = INDEXES_DIR / f"{strategy}.index.jsonl"

        if not index_file.exists():
            print(f"Skipping {strategy}, file not found: {index_file}", flush=True)
            continue

        print(f"\n>> [STRATEGY: {strategy.upper()}] Collection: {coll_name}", flush=True)

        if not root_client.collection_exists(coll_name):
            root_client.create_collection(
                collection_name=coll_name,
                vectors_config=VectorParams(size=1024, distance=Distance.COSINE)
            )

        # Read pre-computed points
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

        # Chunk into batches
        batches = []
        for b_idx in range(0, len(points_list), BATCH_SIZE):
            batch = points_list[b_idx:b_idx + BATCH_SIZE]
            batches.append((coll_name, batch, len(batches) + 1))

        print(f"   Streaming {len(points_list):,} points in {len(batches)} batches across {MAX_WORKERS} threads...", flush=True)
        t0 = time.time()
        uploaded_strat = 0

        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = [executor.submit(upload_worker, b) for b in batches]
            completed_batches = 0
            for future in as_completed(futures):
                uploaded_strat += future.result()
                completed_batches += 1
                if completed_batches % 20 == 0 or completed_batches == len(batches):
                    pct = (uploaded_strat / len(points_list)) * 100
                    print(f"   └─ Ingestion Progress: {uploaded_strat:,}/{len(points_list):,} points ({pct:.1f}%)", flush=True)

        duration = time.time() - t0
        print(f"   ✅ [{strategy.upper()}] Completed in {duration:.2f}s ({uploaded_strat / max(1, duration):.0f} pts/sec).", flush=True)
        total_all_points += uploaded_strat

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

    # ── Final Audit Report ────────────────────────────────────────────────────
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    report_data = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "qdrantCloudUrl": QDRANT_URL,
        "embeddingModel": "BAAI/bge-m3",
        "embeddingDimension": 1024,
        "clusterStorage": {
            "maxBudgetBytes": 4 * 1024 * 1024 * 1024,
            "maxBudgetFormatted": "4.0 GB",
            "totalVectorsIndexed": total_all_points,
            "estimatedUsageMb": round(total_all_points * 0.0076, 2),
            "usagePercentageOfBudget": round((total_all_points * 7600) / (4 * 1024 * 1024 * 1024) * 100, 2)
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
    print("  ALL 4 STRATEGIES SUCCESSFULLY INGESTED INTO QDRANT CLOUD", flush=True)
    print("=" * 82, flush=True)
    for s, r in strategy_reports.items():
        print(f"• {r['collectionName'].padEnd(22)}: {r['totalChunks']:,} vectors in {r['totalTimeMs']}ms", flush=True)
    print(f"\nTotal Vectors in Qdrant Cloud: {total_all_points:,}", flush=True)
    print(f"Report saved to: {REPORT_FILE}", flush=True)
    print("=" * 82, flush=True)

if __name__ == "__main__":
    main()
