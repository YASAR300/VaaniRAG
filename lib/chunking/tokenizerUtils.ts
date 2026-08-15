/**
 * lib/chunking/tokenizerUtils.ts
 *
 * Multilingual & Indic-aware sentence splitting and token estimation utilities.
 * Tailored for Indic scripts (Devanagari, Dravidian, Bengali, Gurmukhi, Perso-Arabic).
 */

// Sentence boundary patterns covering Indic dandas (।, ॥), Urdu full stops (۔), Arabic question marks (؟), and standard punctuation (.!?)
const INDIC_SENTENCE_REGEX = /([।॥۔؟!?\n]+|(?<!\b[A-Za-z0-9]\.)\.(?!\d))/g;

/**
 * Split multilingual text into cohesive sentence units, respecting Indic punctuation marks.
 */
export function splitIndicSentences(text: string): string[] {
  if (!text || !text.trim()) return [];

  const rawSentences: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = INDIC_SENTENCE_REGEX.exec(text)) !== null) {
    const endIndex = match.index + match[0].length;
    const sentence = text.slice(lastIndex, endIndex).trim();
    if (sentence.length > 0) {
      rawSentences.push(sentence);
    }
    lastIndex = endIndex;
  }

  // Add any trailing text
  if (lastIndex < text.length) {
    const remainder = text.slice(lastIndex).trim();
    if (remainder.length > 0) {
      rawSentences.push(remainder);
    }
  }

  // If regex produced nothing (e.g. single sentence without ending punctuation), return full text
  if (rawSentences.length === 0) {
    return [text.trim()];
  }

  return rawSentences;
}

/**
 * Estimate token count for multilingual & Indic text aligned with BGE-M3 / XLM-RoBERTa BPE tokenizers.
 *
 * Analysis:
 * - English/Latin: ~1 token per 4 characters (0.75 words)
 * - Indic scripts (Devanagari, Tamil, Telugu, Malayalam, Bengali, etc.):
 *   Complex conjuncts, matras, and vowel modifiers lead to ~1 token per 2.6 characters.
 * - Non-ASCII Indic Unicode range: \u0900-\u0DFF, \u0600-\u06FF (Urdu/Perso-Arabic)
 */
export function estimateTokenCount(text: string): number {
  if (!text || text.length === 0) return 0;

  let indicCharCount = 0;
  let latinCharCount = 0;

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    // Indic & Perso-Arabic Unicode ranges (Devanagari, Bengali, Gurmukhi, Gujarati, Odia, Tamil, Telugu, Kannada, Malayalam, Arabic)
    if ((code >= 0x0600 && code <= 0x0DFF) || (code >= 0x0900 && code <= 0x097F)) {
      indicCharCount++;
    } else {
      latinCharCount++;
    }
  }

  // Token weighting: 2.8 chars/token for Indic, 4.0 chars/token for Latin/numbers/whitespace
  const indicTokens = indicCharCount / 2.8;
  const latinTokens = latinCharCount / 4.0;

  return Math.max(1, Math.round(indicTokens + latinTokens));
}

/**
 * Compute term frequency vector for lightweight, deterministic semantic similarity between sentences.
 */
export function computeTFVector(sentence: string): Map<string, number> {
  const words = sentence.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w => w.length > 1);
  const tf = new Map<string, number>();
  for (const w of words) {
    tf.set(w, (tf.get(w) || 0) + 1);
  }
  return tf;
}

/**
 * Cosine similarity between two sparse term-frequency representations (0.0 to 1.0).
 */
export function computeSparseCosineSimilarity(
  vecA: Map<string, number>,
  vecB: Map<string, number>
): number {
  if (vecA.size === 0 || vecB.size === 0) return 0.0;

  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;

  for (const [word, countA] of vecA.entries()) {
    normA += countA * countA;
    if (vecB.has(word)) {
      dotProduct += countA * (vecB.get(word) || 0);
    }
  }

  for (const countB of vecB.values()) {
    normB += countB * countB;
  }

  if (normA === 0 || normB === 0) return 0.0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
