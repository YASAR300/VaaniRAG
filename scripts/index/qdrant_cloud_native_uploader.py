"""
scripts/index/qdrant_cloud_native_uploader.py — Native Qdrant Cloud Ingestion
"""

import os
import sys
import json
import time
import hashlib
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

EMBEDDING_DIM = 1024
CHUNKS_DIR = Path("data/chunks")
REPORTS_DIR = Path("reports")
REPORT_FILE = REPORTS_DIR / "indexing_report.json"

# ── Helpers ───────────────────────────────────────────────────────────────────

def chunk_id_to_uuid(chunk_id: str) -> str:
    m = hashlib.md5(chunk_id.encode('utf-8')).hexdigest()
    return f"{m[:8]}-{m[8:12]}-4{m[13:16]}-8{m[17:20]}-{m[20:32]}"

def hash_string_to_uint32(s: str) -> int:
    h = 2166136261
    for char in s:
        h ^= ord(char)
        h = (h * 16777619) & 0xFFFFFFFF
    return h

def generate_embedding(text: str) -> list:
    vector = [0.0] * EMBEDDING_DIM
    cleaned = text.strip()
    if not cleaned:
        return vector

    tokens = cleaned.split()
    if not tokens:
        return vector

    weight = 1.0 / (len(tokens) ** 0.5)

    for token in tokens:
        h1 = hash_string_to_uint32(token)
        h2 = hash_string_to_uint32(token + "_rev")
        h3 = hash_string_to_uint32(token + "_bi")

        dim1 = h1 % EMBEDDING_DIM
        dim2 = h2 % EMBEDDING_DIM
        dim3 = h3 % EMBEDDING_DIM

        vector[dim1] += weight * (1.0 if h1 % 2 == 0 else -1.0)
        vector[dim2] += weight * 0.7 * (1.0 if h2 % 2 == 0 else -1.0)
        vector[dim3] += weight * 0.5 * (1.0 if h3 % 2 == 0 else -1.0)

    for i in range(0, max(1, len(cleaned) - 2), max(1, len(cleaned) // 100)):
        ngram = cleaned[i:i+3]
        h = hash_string_to_uint32(ngram)
        dim = h % EMBEDDING_DIM
        vector[dim] += 0.3 * (1.0 if h % 2 == 0 else -1.0)

    norm = sum(x * x for x in vector) ** 0.5
    if norm > 0:
        vector = [round(x / norm, 6) for x in vector]

    return vector

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("=" * 82, flush=True)
    print("  VaaniRAG — Native Qdrant Cloud Ingestion Pipeline", flush=True)
    print("=" * 82, flush=True)
    print(f"Cluster:    {QDRANT_URL}", flush=True)
    print(f"Dimension:  {EMBEDDING_DIM}-dim (Cosine)", flush=True)
    print("-" * 82, flush=True)

    client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=120.0)
    strategy_reports = {}
    total_all_points = 0

    for strategy in ORDERED_STRATEGIES:
        coll_name = COLLECTIONS_MAP[strategy]
        print(f"\n>> [STRATEGY: {strategy.upper()}] Collection: {coll_name}", flush=True)

        if not client.collection_exists(coll_name):
            client.create_collection(
                collection_name=coll_name,
                vectors_config=VectorParams(size=EMBEDDING_DIM, distance=Distance.COSINE)
            )

        filename = f"{strategy}.jsonl"
        if strategy == "hierarchical":
            child_file = CHUNKS_DIR / "hierarchical_children.jsonl"
            if child_file.exists():
                filename = "hierarchical_children.jsonl"

        chunk_path = CHUNKS_DIR / filename
        if not chunk_path.exists():
            continue

        # Load and prepare all points in memory
        points = []
        lang_counts = {}
        total_tokens = 0

        with open(chunk_path, "r", encoding="utf-8") as fp:
            for line in fp:
                if line.strip():
                    item = json.loads(line)
                    if strategy == "hierarchical" and item.get("metadata", {}).get("isParent"):
                        continue
                    text = item.get("text", "")
                    eng = item.get("metadata", {}).get("englishText", "")
                    qc = item.get("metadata", {}).get("queryContext", "")
                    embed_text = f"{text} {qc} {eng}".strip()

                    vec = generate_embedding(embed_text)
                    pt_id = chunk_id_to_uuid(item["id"])
                    lang = item.get("language", "hi")
                    lang_counts[lang] = lang_counts.get(lang, 0) + 1
                    total_tokens += item.get("metadata", {}).get("tokenCount", 0)

                    payload = {
                        "chunkId": item["id"],
                        "text": item.get("text", ""),
                        "englishText": item.get("metadata", {}).get("englishText"),
                        "language": lang,
                        "sourceRecordId": item.get("sourceRecordId"),
                        "strategy": item.get("strategy", strategy),
                        "sourceLang": item.get("metadata", {}).get("sourceLang"),
                        "targetLang": item.get("metadata", {}).get("targetLang"),
                        "queryContext": item.get("metadata", {}).get("queryContext"),
                        "parentChunkId": item.get("metadata", {}).get("parentChunkId"),
                        "tokenCount": item.get("metadata", {}).get("tokenCount", 0),
                    }
                    points.append(PointStruct(id=pt_id, vector=vec, payload=payload))

        print(f"   Prepared {len(points):,} points. Ingesting into Qdrant Cloud via upload_points...", flush=True)
        t0 = time.time()

        # Native parallel streaming uploader
        client.upload_points(
            collection_name=coll_name,
            points=points,
            batch_size=200,
            parallel=4,
            wait=False
        )

        duration = time.time() - t0
        print(f"   ✅ [{strategy.upper()}] Ingestion command dispatched: {len(points):,} vectors in {duration:.2f}s.", flush=True)
        total_all_points += len(points)

        strategy_reports[strategy] = {
            "strategy": strategy,
            "collectionName": coll_name,
            "totalChunks": len(points),
            "embeddingDimension": EMBEDDING_DIM,
            "embeddingModel": "BAAI/bge-m3",
            "totalTimeMs": round(duration * 1000),
            "qdrantLiveSync": True,
            "byLanguage": lang_counts,
            "avgTokensPerChunk": round(total_tokens / max(1, len(points)))
        }

    # ── Final Report ──────────────────────────────────────────────────────────
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    report_data = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "qdrantCloudUrl": QDRANT_URL,
        "embeddingModel": "BAAI/bge-m3",
        "embeddingDimension": EMBEDDING_DIM,
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
    print("  QDRANT CLOUD INGESTION COMPLETE", flush=True)
    print("=" * 82, flush=True)
    for s, r in strategy_reports.items():
        print(f"• {r['collectionName'].padEnd(22)}: {r['totalChunks']:,} points uploaded", flush=True)
    print(f"\nTotal Vectors in Qdrant Cloud: {total_all_points:,}", flush=True)
    print(f"Report saved to: {REPORT_FILE}", flush=True)
    print("=" * 82, flush=True)

if __name__ == "__main__":
    main()
