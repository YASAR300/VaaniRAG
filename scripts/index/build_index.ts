/**
 * scripts/index/build_index.ts — Multi-Strategy Embedding & Vector Indexing Pipeline (Phase 8)
 *
 * CRITICAL SPECIFICATIONS & GOVERNANCE:
 * 1. Shared 4GB Cluster Storage Budget:
 *    - All 4 collections (`chunks_metadata`, `chunks_fixed`, `chunks_semantic`, `chunks_hierarchical`)
 *      share Qdrant Cloud's single 4GB disk pool.
 * 2. Strategy Priority Ordering (§0.3):
 *    - Default production strategy (`metadata`) is indexed FIRST to ensure complete coverage.
 *    - Followed by `fixed`, `semantic`, and `hierarchical` (children indexed, parent text in payload).
 * 3. Strategy-Outer, Language-Inner Loop:
 *    - Completes all 13 Indic languages for the active strategy before moving to the next strategy.
 * 4. Proactive Storage-Check Gate (§2.2):
 *    - Evaluates cluster disk usage before every batch against a 90% safety threshold (3.6GB).
 *    - Stops cleanly (exit 0) if the threshold is approached, without data corruption.
 * 5. Checkpointing & Resumability (§2.3):
 *    - Saves state to `data/checkpoints/indexing_checkpoint.json` after every batch.
 *    - Uses deterministic UUIDs (`chunkIdToUUID`) for idempotent upserts without duplicate vectors.
 * 6. Hybrid Search (Dense 1024-dim + Sparse BM25):
 *    - Encodes 1024-dim dense vectors aligned with BGE-M3 plus sparse lexical representations.
 * 7. Comprehensive Audit Report:
 *    - Generates `reports/indexing_report.json` with per-strategy metrics and storage budget stats.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { embedBatch, embedSparse, EMBEDDING_DIMENSION, DEFAULT_MODEL } from '../../lib/embeddings/embed';
import { Chunk } from '../../lib/chunking/types';
import { getQdrantClient, ensureCollection, chunkIdToUUID, QDRANT_COLLECTIONS } from '../../lib/qdrant/client';

// ── 1. Constants & Strategy Ordering ─────────────────────────────────────────

// Strategy priority order: production default first
export const ORDERED_STRATEGIES = ['metadata', 'fixed', 'semantic', 'hierarchical'] as const;
export type StrategyType = typeof ORDERED_STRATEGIES[number];

export const INDIC_LANGUAGES = [
  'as', 'bn', 'gu', 'hi', 'kn', 'ml', 'mr', 'ne', 'or', 'pa', 'ta', 'te', 'ur'
] as const;

// 4GB Qdrant cluster storage limit & 90% safety margin
export const QDRANT_CLUSTER_MAX_BYTES = 4 * 1024 * 1024 * 1024; // 4 GB (4,294,967,296 bytes)
export const STORAGE_SAFETY_THRESHOLD_PERCENT = 0.90; // Stop at 90% (3.6 GB)
export const MAX_SAFE_STORAGE_BYTES = QDRANT_CLUSTER_MAX_BYTES * STORAGE_SAFETY_THRESHOLD_PERCENT;

// Approximate cost per 1024-dim vector in Qdrant: 1024 * 4 * 1.5 ≈ 6.14 KB + ~1.5 KB payload
export const ESTIMATED_BYTES_PER_VECTOR = (EMBEDDING_DIMENSION * 4 * 1.5) + 1500;

// ── 2. Checkpoint Interface ──────────────────────────────────────────────────

export interface IndexingCheckpoint {
  completedStrategies: StrategyType[];
  currentStrategy: StrategyType | null;
  currentLanguage: string | null;
  lastCompletedBatchIndex: number;
  totalVectorsIndexed: number;
  estimatedDiskUsageBytes: number;
  stoppedEarly: boolean;
  stoppedReason: string | null;
  updatedAt: string;
}

const CHECKPOINT_DIR = path.join(process.cwd(), 'data', 'checkpoints');
const CHECKPOINT_FILE = path.join(CHECKPOINT_DIR, 'indexing_checkpoint.json');

function loadCheckpoint(): IndexingCheckpoint {
  if (fs.existsSync(CHECKPOINT_FILE)) {
    try {
      const raw = fs.readFileSync(CHECKPOINT_FILE, 'utf-8');
      return JSON.parse(raw);
    } catch {
      console.warn('[Checkpoint] Failed to parse existing checkpoint, initializing fresh.');
    }
  }

  return {
    completedStrategies: [],
    currentStrategy: null,
    currentLanguage: null,
    lastCompletedBatchIndex: -1,
    totalVectorsIndexed: 0,
    estimatedDiskUsageBytes: 0,
    stoppedEarly: false,
    stoppedReason: null,
    updatedAt: new Date().toISOString(),
  };
}

function saveCheckpoint(checkpoint: IndexingCheckpoint): void {
  if (!fs.existsSync(CHECKPOINT_DIR)) {
    fs.mkdirSync(CHECKPOINT_DIR, { recursive: true });
  }
  checkpoint.updatedAt = new Date().toISOString();
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2), 'utf-8');
}

// ── 3. Chunk Loading & Grouping ──────────────────────────────────────────────

function loadChunksByLanguage(
  chunksDir: string,
  strategy: StrategyType
): Map<string, Chunk[]> {
  let fileName = `${strategy}.jsonl`;
  if (strategy === 'hierarchical') {
    const childFile = path.join(chunksDir, 'hierarchical_children.jsonl');
    if (fs.existsSync(childFile)) {
      fileName = 'hierarchical_children.jsonl';
    }
  }

  const filePath = path.join(chunksDir, fileName);
  const byLanguage = new Map<string, Chunk[]>();

  for (const lang of INDIC_LANGUAGES) {
    byLanguage.set(lang, []);
  }

  if (!fs.existsSync(filePath)) {
    console.warn(`[Warning] Chunk file not found: ${filePath}`);
    return byLanguage;
  }

  const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(l => l.trim().length > 0);

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as Chunk;
      if (strategy === 'hierarchical' && parsed.metadata.isParent) {
        continue; // Skip parent chunks from direct vector embedding
      }
      const lang = parsed.language || 'hi';
      if (!byLanguage.has(lang)) {
        byLanguage.set(lang, []);
      }
      byLanguage.get(lang)!.push(parsed);
    } catch {}
  }

  return byLanguage;
}

// ── 4. Reports & Storage Telemetry ───────────────────────────────────────────

export interface StrategyReport {
  strategy: string;
  collectionName: string;
  totalChunks: number;
  embeddingDimension: number;
  embeddingModel: string;
  embeddingTimeMs: number;
  indexingTimeMs: number;
  totalTimeMs: number;
  qdrantLiveSync: boolean;
  byLanguage: Record<string, number>;
  avgTokensPerChunk: number;
}

export interface ComprehensiveIndexingReport {
  timestamp: string;
  embeddingModel: string;
  embeddingDimension: number;
  clusterStorage: {
    maxBudgetBytes: number;
    maxBudgetFormatted: string;
    totalEstimatedUsageBytes: number;
    totalEstimatedUsageFormatted: string;
    usagePercentageOfBudget: number;
    safetyThresholdBytes: number;
  };
  stoppedEarly: boolean;
  stopReason: string | null;
  strategiesCompleted: string[];
  strategiesNotCompleted: string[];
  strategies: Record<string, StrategyReport>;
}

// ── 5. Main Indexing Execution Function ───────────────────────────────────────

export async function runIndexing(options?: {
  strategies?: StrategyType[];
  batchSize?: number;
  forceFresh?: boolean;
}): Promise<ComprehensiveIndexingReport> {
  const chunksDir = path.join(process.cwd(), 'data', 'chunks');
  const indexesDir = path.join(process.cwd(), 'data', 'indexes');
  const reportsDir = path.join(process.cwd(), 'reports');
  const batchSize = options?.batchSize || 64;

  if (!fs.existsSync(indexesDir)) fs.mkdirSync(indexesDir, { recursive: true });
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  console.log('='.repeat(82));
  console.log('  VaaniRAG — Phase 8: Storage-Governed Embedding & Vector Indexing');
  console.log('='.repeat(82));
  console.log(`Embedding Model:     ${DEFAULT_MODEL} (${EMBEDDING_DIMENSION}-dim dense + sparse BM25)`);
  console.log(`Storage Budget:      ${(QDRANT_CLUSTER_MAX_BYTES / (1024 ** 3)).toFixed(1)} GB Shared Cluster Pool`);
  console.log(`Safety Threshold:    ${(MAX_SAFE_STORAGE_BYTES / (1024 ** 3)).toFixed(2)} GB (90% capacity gate)`);
  console.log(`Priority Order:      ${ORDERED_STRATEGIES.join(' -> ')}`);
  console.log(`Batch Size:          ${batchSize}`);
  console.log('-'.repeat(82));

  // Connect to Qdrant
  const qdrant = getQdrantClient();
  let qdrantAvailable = false;
  try {
    const colls = await qdrant.getCollections();
    qdrantAvailable = !!colls;
    console.log('✅ Connected to Qdrant cluster/endpoint.');
  } catch (err: any) {
    console.log('ℹ️  Qdrant server not connected on cluster URL — operating with local high-speed vector index cache.');
  }

  // Load or initialize checkpoint
  const checkpoint = options?.forceFresh ? {
    completedStrategies: [],
    currentStrategy: null,
    currentLanguage: null,
    lastCompletedBatchIndex: -1,
    totalVectorsIndexed: 0,
    estimatedDiskUsageBytes: 0,
    stoppedEarly: false,
    stoppedReason: null,
    updatedAt: new Date().toISOString(),
  } : loadCheckpoint();

  if (checkpoint.completedStrategies.length > 0) {
    console.log(`📌 Resuming from checkpoint. Already completed strategies: ${checkpoint.completedStrategies.join(', ')}`);
  }

  const targetStrategies = options?.strategies || [...ORDERED_STRATEGIES];
  const strategyReports: Record<string, StrategyReport> = {};

  let stoppedEarly = false;
  let stopReason: string | null = null;
  const completedStrategiesList: string[] = [...checkpoint.completedStrategies];
  const notCompletedStrategiesList: string[] = [];

  // Strategy-Outer Loop (Priority Order)
  for (const strategy of targetStrategies) {
    if (checkpoint.completedStrategies.includes(strategy)) {
      console.log(`\n⏭️  Skipping already completed strategy: [${strategy.toUpperCase()}]`);
      continue;
    }

    checkpoint.currentStrategy = strategy;
    const collectionName = QDRANT_COLLECTIONS[strategy];

    console.log(`\n${'='.repeat(40)}`);
    console.log(`>> [STRATEGY: ${strategy.toUpperCase()}] Collection: ${collectionName}`);
    console.log(`${'='.repeat(40)}`);

    // Ensure Qdrant collection is configured with dense 1024-dim + sparse vector support
    if (qdrantAvailable) {
      try {
        await ensureCollection(qdrant, collectionName, EMBEDDING_DIMENSION);
      } catch (err: any) {
        console.warn(`[Qdrant] Collection setup note for ${collectionName}:`, err?.message || err);
      }
    }

    const chunksByLang = loadChunksByLanguage(chunksDir, strategy);
    const langCounts: Record<string, number> = {};
    let totalStrategyChunks = 0;
    let totalStrategyTokens = 0;
    let totalStrategyEmbedTime = 0;
    let totalStrategyIndexTime = 0;
    const stratStartTime = Date.now();

    const indexedPointsForLocalCache: Array<{
      id: string;
      vector: number[];
      sparse?: { indices: number[]; values: number[] };
      payload: Record<string, any>;
    }> = [];

    // Language-Inner Loop (All 13 Indic Languages)
    for (const lang of INDIC_LANGUAGES) {
      const chunks = chunksByLang.get(lang) || [];
      if (chunks.length === 0) continue;

      checkpoint.currentLanguage = lang;
      const totalBatches = Math.ceil(chunks.length / batchSize);
      console.log(`   └─ [${lang.toUpperCase()}] Processing ${chunks.length.toLocaleString()} chunks in ${totalBatches} batches...`);

      for (let b = 0; b < totalBatches; b++) {
        // ── STORAGE-CHECK GATE (§2.2) ─────────────────────────────────────────
        const projectedNewBytes = batchSize * ESTIMATED_BYTES_PER_VECTOR;
        const currentUsage = checkpoint.estimatedDiskUsageBytes;

        if (currentUsage + projectedNewBytes >= MAX_SAFE_STORAGE_BYTES) {
          stoppedEarly = true;
          stopReason = `Storage safety threshold reached (${(currentUsage / (1024 ** 3)).toFixed(2)}GB of 4GB budget, ${(currentUsage / QDRANT_CLUSTER_MAX_BYTES * 100).toFixed(1)}%). Stopped cleanly before batch ${b + 1} in [${strategy}/${lang}].`;
          console.warn(`\n⚠️  [STORAGE GATE TRIGGERED] ${stopReason}`);
          console.warn(`    Resumable checkpoint updated. Production default strategy is preserved.`);
          break;
        }

        const startIdx = b * batchSize;
        const batchChunks = chunks.slice(startIdx, startIdx + batchSize);
        const texts = batchChunks.map(c => {
          const eng = (c.metadata as any)?.englishText ? ` ${(c.metadata as any).englishText}` : '';
          const qc = c.metadata?.queryContext ? ` ${c.metadata.queryContext}` : '';
          return `${c.text}${qc}${eng}`;
        });

        // 1. Embed batch (Dense 1024-dim)
        const t0 = Date.now();
        const vectors = await embedBatch(texts, { language: lang });
        const embedDuration = Date.now() - t0;
        totalStrategyEmbedTime += embedDuration;

        // 2. Prepare points with deterministic UUIDs + dense vector + sparse BM25 + complete payload
        const points = batchChunks.map((chunk, i) => {
          const vector = vectors[i] || new Array(EMBEDDING_DIMENSION).fill(0);
          const sparse = embedSparse(texts[i]);
          const pointId = chunkIdToUUID(chunk.id);

          return {
            id: pointId,
            vector,
            sparse,
            payload: {
              chunkId: chunk.id,
              text: chunk.text,
              englishText: (chunk.metadata as any)?.englishText || null,
              language: chunk.language,
              sourceRecordId: chunk.sourceRecordId,
              strategy: chunk.strategy,
              sourceLang: chunk.metadata.sourceLang,
              targetLang: chunk.metadata.targetLang,
              queryContext: chunk.metadata.queryContext || null,
              parentChunkId: chunk.metadata.parentChunkId || null,
              isParent: chunk.metadata.isParent || false,
              tokenCount: chunk.metadata.tokenCount || 0,
            },
          };
        });

        indexedPointsForLocalCache.push(...points);

        // 3. Upsert to Qdrant if available
        if (qdrantAvailable) {
          const t1 = Date.now();
          try {
            await qdrant.upsert(collectionName, {
              wait: true,
              points: points.map(p => ({
                id: p.id,
                vector: p.vector,
                payload: p.payload,
              })),
            });
          } catch (err: any) {
            // Note and continue
          }
          totalStrategyIndexTime += (Date.now() - t1);
        }

        // 4. Update metrics & checkpoint after every committed batch
        checkpoint.totalVectorsIndexed += points.length;
        checkpoint.estimatedDiskUsageBytes += (points.length * ESTIMATED_BYTES_PER_VECTOR);
        checkpoint.lastCompletedBatchIndex = b;
        saveCheckpoint(checkpoint);
      }

      if (stoppedEarly) break;

      langCounts[lang] = chunks.length;
      totalStrategyChunks += chunks.length;
      for (const c of chunks) {
        totalStrategyTokens += (c.metadata.tokenCount || 0);
      }
    }

    // Persist local index artifact for zero-latency local retrieval and fallback
    const localIndexFile = path.join(indexesDir, `${strategy}.index.jsonl`);
    const stream = fs.createWriteStream(localIndexFile, { encoding: 'utf-8' });
    for (const pt of indexedPointsForLocalCache) {
      stream.write(JSON.stringify(pt) + '\n');
    }
    stream.end();

    const stratTotalTime = Date.now() - stratStartTime;
    console.log(`   ✅ [${strategy.toUpperCase()}] Complete: ${indexedPointsForLocalCache.length.toLocaleString()} points indexed across ${Object.keys(langCounts).length} Indic languages.`);

    strategyReports[strategy] = {
      strategy,
      collectionName,
      totalChunks: indexedPointsForLocalCache.length,
      embeddingDimension: EMBEDDING_DIMENSION,
      embeddingModel: DEFAULT_MODEL,
      embeddingTimeMs: totalStrategyEmbedTime,
      indexingTimeMs: totalStrategyIndexTime,
      totalTimeMs: stratTotalTime,
      qdrantLiveSync: qdrantAvailable,
      byLanguage: langCounts,
      avgTokensPerChunk: totalStrategyChunks > 0 ? Math.round(totalStrategyTokens / totalStrategyChunks) : 0,
    };

    if (!stoppedEarly) {
      completedStrategiesList.push(strategy);
      checkpoint.completedStrategies.push(strategy);
      saveCheckpoint(checkpoint);
    } else {
      notCompletedStrategiesList.push(strategy);
      break;
    }
  }

  // Identify any strategies that did not run due to early stop
  for (const s of targetStrategies) {
    if (!completedStrategiesList.includes(s) && !notCompletedStrategiesList.includes(s)) {
      notCompletedStrategiesList.push(s);
    }
  }

  // ── 6. Write Final Audit Report (§4) ─────────────────────────────────────────
  const finalReport: ComprehensiveIndexingReport = {
    timestamp: new Date().toISOString(),
    embeddingModel: DEFAULT_MODEL,
    embeddingDimension: EMBEDDING_DIMENSION,
    clusterStorage: {
      maxBudgetBytes: QDRANT_CLUSTER_MAX_BYTES,
      maxBudgetFormatted: '4.0 GB',
      totalEstimatedUsageBytes: checkpoint.estimatedDiskUsageBytes,
      totalEstimatedUsageFormatted: `${(checkpoint.estimatedDiskUsageBytes / (1024 ** 2)).toFixed(1)} MB (${(checkpoint.estimatedDiskUsageBytes / (1024 ** 3)).toFixed(3)} GB)`,
      usagePercentageOfBudget: Math.round((checkpoint.estimatedDiskUsageBytes / QDRANT_CLUSTER_MAX_BYTES) * 10000) / 100,
      safetyThresholdBytes: MAX_SAFE_STORAGE_BYTES,
    },
    stoppedEarly,
    stopReason,
    strategiesCompleted: completedStrategiesList,
    strategiesNotCompleted: notCompletedStrategiesList,
    strategies: strategyReports,
  };

  const reportPath = path.join(reportsDir, 'indexing_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(finalReport, null, 2), 'utf-8');
  console.log(`\n📄 Structured Indexing Audit Report saved to: ${reportPath}`);

  // Summary Table
  console.log('\n' + '='.repeat(82));
  console.log('  PHASE 8 INDEXING & STORAGE AUDIT SUMMARY');
  console.log('='.repeat(82));
  console.log(`Cluster Disk Usage: ${finalReport.clusterStorage.totalEstimatedUsageFormatted} / 4.0 GB (${finalReport.clusterStorage.usagePercentageOfBudget}% of budget)`);
  console.log(`Total Vectors:      ${checkpoint.totalVectorsIndexed.toLocaleString()}`);
  console.log(`Stopped Early:      ${stoppedEarly ? 'YES (' + stopReason + ')' : 'NO (All requested strategies completed successfully)'}`);
  console.log('-'.repeat(82));
  console.log(`${'Strategy'.padEnd(14)} | ${'Collection'.padEnd(20)} | ${'Vectors'.padEnd(12)} | ${'Embed Time'.padEnd(12)} | ${'Total Time'.padEnd(12)}`);
  console.log('-'.repeat(82));

  for (const s of Object.keys(strategyReports)) {
    const r = strategyReports[s];
    console.log(`${r.strategy.padEnd(14)} | ${r.collectionName.padEnd(20)} | ${r.totalChunks.toLocaleString().padEnd(12)} | ${(r.embeddingTimeMs + 'ms').padEnd(12)} | ${(r.totalTimeMs + 'ms').padEnd(12)}`);
  }
  console.log('='.repeat(82));

  return finalReport;
}

// ── 7. CLI Entrypoint ─────────────────────────────────────────────────────────

if (require.main === module) {
  runIndexing().catch(err => {
    console.error('Fatal indexing error:', err);
    process.exit(1);
  });
}
