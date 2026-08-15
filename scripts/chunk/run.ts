/**
 * scripts/chunk/run.ts — Multi-Strategy Chunking CLI Runner (Phase 7)
 *
 * Runs the cleaned MSMARCO-XI dataset across all 4 chunking strategies:
 *   1. Fixed-Size (512 tokens, 18% overlap)
 *   2. Semantic (Topic similarity driven)
 *   3. Metadata-Aware (Passage & language context preservation)
 *   4. Hierarchical (Parent context + Child search units)
 *
 * Outputs:
 *   data/chunks/fixed.jsonl
 *   data/chunks/semantic.jsonl
 *   data/chunks/metadata.jsonl
 *   data/chunks/hierarchical.jsonl
 *   data/chunks/summary_report.json
 *
 * Usage:
 *   npx tsx scripts/chunk/run.ts
 *   npx tsx scripts/chunk/run.ts --languages hi,ta
 */

import * as fs from 'fs';
import * as path from 'path';
import { CleanedRecord, Chunk, ChunkingStats, ChunkingStrategy } from '../../lib/chunking/types';
import { FixedSizeChunker } from '../../lib/chunking/fixedSizeChunker';
import { SemanticChunker } from '../../lib/chunking/semanticChunker';
import { MetadataAwareChunker } from '../../lib/chunking/metadataChunker';
import { HierarchicalChunker } from '../../lib/chunking/hierarchicalChunker';

const CHUNKING_STRATEGIES: Record<string, ChunkingStrategy> = {
  fixed: new FixedSizeChunker(),
  semantic: new SemanticChunker(),
  metadata: new MetadataAwareChunker(),
  hierarchical: new HierarchicalChunker(),
};

const ALL_LANGUAGES = [
  'as', 'bn', 'gu', 'hi', 'kn', 'ml', 'mr', 'ne', 'or', 'pa', 'ta', 'te', 'ur'
];

interface CommandLineArgs {
  languages: string[];
  inputDir: string;
  outputDir: string;
}

function parseArgs(): CommandLineArgs {
  const args = process.argv.slice(2);
  let languages = ALL_LANGUAGES;
  let inputDir = path.join(process.cwd(), 'data', 'clean');
  let outputDir = path.join(process.cwd(), 'data', 'chunks');

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--languages' && args[i + 1]) {
      languages = args[i + 1].split(',').map(s => s.trim()).filter(Boolean);
      i++;
    } else if (args[i] === '--input-dir' && args[i + 1]) {
      inputDir = path.resolve(args[i + 1]);
      i++;
    } else if (args[i] === '--output-dir' && args[i + 1]) {
      outputDir = path.resolve(args[i + 1]);
      i++;
    }
  }

  return { languages, inputDir, outputDir };
}

function loadCleanedRecords(inputDir: string, languages: string[]): CleanedRecord[] {
  const records: CleanedRecord[] = [];

  for (const lang of languages) {
    const filePath = path.join(inputDir, `${lang}.jsonl`);
    if (!fs.existsSync(filePath)) {
      console.warn(`[Warning] File not found: ${filePath}`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as CleanedRecord;
        records.push(parsed);
      } catch {
        // ignore malformed lines
      }
    }
  }

  return records;
}

function computeStrategyStats(strategyName: string, chunks: Chunk[]): ChunkingStats {
  const byLanguage: Record<string, number> = {};
  let totalTokens = 0;
  let minTokens = Infinity;
  let maxTokens = 0;

  for (const c of chunks) {
    byLanguage[c.language] = (byLanguage[c.language] || 0) + 1;
    const tokens = c.metadata.tokenCount || 0;
    totalTokens += tokens;
    if (tokens < minTokens) minTokens = tokens;
    if (tokens > maxTokens) maxTokens = tokens;
  }

  const count = chunks.length;
  return {
    strategy: strategyName,
    totalChunks: count,
    totalTokens: totalTokens,
    avgTokens: count > 0 ? Math.round(totalTokens / count) : 0,
    minTokens: minTokens === Infinity ? 0 : minTokens,
    maxTokens: maxTokens,
    byLanguage,
  };
}

async function main() {
  const { languages, inputDir, outputDir } = parseArgs();

  console.log('='.repeat(78));
  console.log('  VaaniRAG — Multi-Strategy Chunking Engine (Phase 7)');
  console.log('='.repeat(78));
  console.log(`Input Directory:  ${inputDir}`);
  console.log(`Output Directory: ${outputDir}`);
  console.log(`Languages (${languages.length}): ${languages.join(', ')}`);
  console.log('-'.repeat(78));

  // 1. Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 2. Load cleaned records across target languages
  console.log('\n>> Loading cleaned records from disk...');
  const records = loadCleanedRecords(inputDir, languages);
  console.log(`✅ Loaded ${records.length.toLocaleString()} cleaned records across ${languages.length} languages.\n`);

  if (records.length === 0) {
    console.error('❌ No records found to chunk. Please verify that Phase 6 clean files exist in data/clean/');
    process.exit(1);
  }

  const allStats: Record<string, ChunkingStats> = {};

  // 3. Execute all 4 chunking strategies
  const strategyKeys = ['fixed', 'semantic', 'metadata', 'hierarchical'] as const;

  for (const key of strategyKeys) {
    const strategy = CHUNKING_STRATEGIES[key];
    console.log(`>> Processing Strategy [${key.toUpperCase()}]...`);

    const startTime = Date.now();
    const chunks = await strategy.chunk(records);
    const durationMs = Date.now() - startTime;

    // Write chunks to data/chunks/<strategy>.jsonl
    const outputFile = path.join(outputDir, `${key}.jsonl`);
    const stream = fs.createWriteStream(outputFile, { encoding: 'utf-8' });

    for (const chunk of chunks) {
      stream.write(JSON.stringify(chunk) + '\n');
    }
    stream.end();

    // For hierarchical, also write separate parent and child files for easy inspection in Phase 8
    if (key === 'hierarchical') {
      const parentsFile = path.join(outputDir, 'hierarchical_parents.jsonl');
      const childrenFile = path.join(outputDir, 'hierarchical_children.jsonl');

      const parentStream = fs.createWriteStream(parentsFile, { encoding: 'utf-8' });
      const childStream = fs.createWriteStream(childrenFile, { encoding: 'utf-8' });

      for (const chunk of chunks) {
        if (chunk.metadata.isParent) {
          parentStream.write(JSON.stringify(chunk) + '\n');
        } else {
          childStream.write(JSON.stringify(chunk) + '\n');
        }
      }
      parentStream.end();
      childStream.end();
    }

    const stats = computeStrategyStats(key, chunks);
    allStats[key] = stats;

    console.log(`   ✅ Produced ${chunks.length.toLocaleString()} chunks in ${durationMs}ms (Avg: ${stats.avgTokens} tokens/chunk, Min: ${stats.minTokens}, Max: ${stats.maxTokens})`);
  }

  // 4. Write Summary Report JSON
  const reportPath = path.join(outputDir, 'summary_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(allStats, null, 2), 'utf-8');
  console.log(`\n📄 Summary report saved to: ${reportPath}`);

  // 5. Print Comparison Summary Table
  console.log('\n' + '='.repeat(78));
  console.log('  CHUNKING STRATEGY COMPARISON SUMMARY');
  console.log('='.repeat(78));
  console.log(`${'Strategy'.padEnd(14)} | ${'Total Chunks'.padEnd(14)} | ${'Avg Tokens'.padEnd(12)} | ${'Min Tokens'.padEnd(12)} | ${'Max Tokens'.padEnd(12)}`);
  console.log('-'.repeat(78));

  for (const key of strategyKeys) {
    const s = allStats[key];
    console.log(`${s.strategy.padEnd(14)} | ${s.totalChunks.toLocaleString().padEnd(14)} | ${s.avgTokens.toString().padEnd(12)} | ${s.minTokens.toString().padEnd(12)} | ${s.maxTokens.toString().padEnd(12)}`);
  }
  console.log('-'.repeat(78));

  // Language distribution overview
  console.log('\n  PER-LANGUAGE CHUNK DISTRIBUTION:');
  console.log(`${'Lang'.padEnd(6)} | ${'Fixed'.padEnd(10)} | ${'Semantic'.padEnd(10)} | ${'Metadata'.padEnd(10)} | ${'Hierarchical'.padEnd(14)}`);
  console.log('-'.repeat(60));
  for (const lang of languages) {
    const fCount = allStats.fixed?.byLanguage[lang] || 0;
    const sCount = allStats.semantic?.byLanguage[lang] || 0;
    const mCount = allStats.metadata?.byLanguage[lang] || 0;
    const hCount = allStats.hierarchical?.byLanguage[lang] || 0;
    console.log(`${lang.padEnd(6)} | ${fCount.toLocaleString().padEnd(10)} | ${sCount.toLocaleString().padEnd(10)} | ${mCount.toLocaleString().padEnd(10)} | ${hCount.toLocaleString().padEnd(14)}`);
  }
  console.log('='.repeat(78));
}

main().catch(err => {
  console.error('Fatal chunking error:', err);
  process.exit(1);
});
