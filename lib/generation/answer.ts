/**
 * lib/generation/answer.ts — Grounded Answer Generation via Groq API (Phase 10)
 *
 * Latency Context:
 *   - The 200ms budget covers everything POST-STT (Retrieval + LLM Generation ≤ 200ms).
 *   - Uses Groq's low-latency inference engine (Llama-3.3-70b-versatile or Llama-3.1-8b-instant).
 *   - Answers are strictly constrained to 2-3 concise sentences to minimize token generation time.
 *   - Structured JSON response validated via Zod schema.
 */

import { z } from 'zod';
import { GenerationInput, GenerationResult, GenerationStreamChunk } from './types';
import { RetrievedChunk } from '../retrieval/types';

export const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
export const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Zod Schema for Structured Grounded Output
export const GenerationResultSchema = z.object({
  answer: z.string().min(1, 'Answer must not be empty'),
  citedChunkIds: z.array(z.string()).default([]),
  confidence: z.enum(['high', 'medium', 'low']).default('medium'),
});

/**
 * Construct lean, strictly grounded system prompt for Groq
 */
function buildSystemPrompt(detectedLanguage: string): string {
  return `You are VaaniRAG's verified multilingual Indic question-answering engine.
Follow these rules strictly:
1. Answer the user's question using the verified facts provided in the Context passages. Do NOT use outside unverified knowledge.
2. If relevant context facts are present, provide a direct, helpful, grounded answer based on those passages and cite the chunk IDs.
3. Only if the provided context is completely unrelated or empty, respond: "I do not have sufficient verified context in the dataset to answer this question."
4. Always respond in the EXACT same language as the user's question (${detectedLanguage}).
5. Keep answers concise, factual, and direct (2 to 3 sentences maximum).
6. Return your response ONLY as valid JSON in this exact structure:
{
  "answer": "Grounded answer text in the query language",
  "citedChunkIds": ["chunk_id_1", "chunk_id_2"],
  "confidence": "high" | "medium" | "low"
}`;
}

/**
 * Format retrieved chunks as clean context items with chunk IDs
 */
function buildContextString(chunks: RetrievedChunk[]): string {
  if (!chunks || chunks.length === 0) {
    return 'NO CONTEXT PROVIDED.';
  }

  return chunks
    .map((c, i) => {
      // Use parent chunk text if present (for hierarchical strategy expansion), otherwise child text
      const content = (c.parentChunkText || c.text || '').trim();
      const engContent = (c.metadata as any)?.englishText ? `\n[Reference/English Content: ${(c.metadata as any).englishText}]` : '';
      return `[Chunk ID: ${c.id}] (Language: ${c.language})\n${content}${engContent}`;
    })
    .join('\n\n---\n\n');
}

/**
 * Generate a grounded answer from retrieved chunks using Groq hosted LLM.
 */
export async function generateAnswer(input: GenerationInput): Promise<GenerationResult> {
  const apiKey = process.env.GROQ_API_KEY || process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set in environment variables');
  }

  const model = input.model || DEFAULT_GROQ_MODEL;
  const systemPrompt = buildSystemPrompt(input.detectedLanguage);
  const contextStr = buildContextString(input.retrievedChunks);

  const userMessage = `Context Passages:\n${contextStr}\n\nUser Question (${input.detectedLanguage}): ${input.question}`;

  const tStart = performance.now();

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'VaaniRAG-Client/1.0',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: input.temperature ?? 0.1,
      max_tokens: input.maxTokens ?? 512,
      response_format: { type: 'json_object' },
    }),
  });

  const requestMs = Math.round((performance.now() - tStart) * 100) / 100;

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API failed with status ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content || '{}';

  let parsedJson: any;
  try {
    parsedJson = JSON.parse(rawContent);
  } catch (err) {
    // If model emitted wrapped markdown json, extract it
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsedJson = JSON.parse(jsonMatch[0]);
      } catch (innerErr) {
        throw new Error(`Failed to parse Groq structured JSON: ${rawContent}`);
      }
    } else {
      throw new Error(`Groq did not return valid JSON: ${rawContent}`);
    }
  }

  // Validate with Zod
  const validated = GenerationResultSchema.parse(parsedJson);

  // Cross-reference cited chunk IDs against real candidate IDs
  const validChunkIdSet = new Set(input.retrievedChunks.map(c => c.id));
  const verifiedCitations = validated.citedChunkIds.filter(id => validChunkIdSet.has(id));

  return {
    answer: validated.answer,
    citedChunkIds: verifiedCitations.length > 0 ? verifiedCitations : validated.citedChunkIds,
    confidence: validated.confidence,
    timing: {
      requestMs,
    },
    raw: {
      model: data.model,
      usage: data.usage,
    },
  };
}

/**
 * Stream answer tokens progressively for live typewriter UI and measure time-to-first-token.
 */
export async function* generateAnswerStream(
  input: GenerationInput
): AsyncIterable<GenerationStreamChunk> {
  const apiKey = process.env.GROQ_API_KEY || process.env.LLM_API_KEY;
  if (!apiKey) {
    yield { type: 'error', error: 'GROQ_API_KEY is not set in environment variables' };
    return;
  }

  const model = input.model || DEFAULT_GROQ_MODEL;
  const systemPrompt = buildSystemPrompt(input.detectedLanguage);
  const contextStr = buildContextString(input.retrievedChunks);
  const userMessage = `Context Passages:\n${contextStr}\n\nUser Question (${input.detectedLanguage}): ${input.question}`;

  const tStart = performance.now();
  let timeToFirstTokenMs: number | undefined = undefined;
  let fullRawResponse = '';

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'VaaniRAG-Client/1.0',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: input.temperature ?? 0.1,
        max_tokens: input.maxTokens ?? 512,
        response_format: { type: 'json_object' },
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      const errText = await response.text();
      yield { type: 'error', error: `Groq stream failed with HTTP ${response.status}: ${errText}` };
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;

        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            const delta = data.choices?.[0]?.delta?.content || '';

            if (delta) {
              if (timeToFirstTokenMs === undefined) {
                timeToFirstTokenMs = Math.round((performance.now() - tStart) * 100) / 100;
              }
              fullRawResponse += delta;
              yield {
                type: 'token',
                token: delta,
                accumulatedAnswer: fullRawResponse,
              };
            }
          } catch {
            // ignore non-json SSE lines
          }
        }
      }
    }

    const requestMs = Math.round((performance.now() - tStart) * 100) / 100;

    // Parse final JSON from accumulated stream
    let parsed: any = {};
    try {
      parsed = JSON.parse(fullRawResponse);
    } catch {
      const jsonMatch = fullRawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[0]); } catch {}
      }
    }

    const finalResult: GenerationResult = {
      answer: parsed.answer || fullRawResponse,
      citedChunkIds: Array.isArray(parsed.citedChunkIds) ? parsed.citedChunkIds : [],
      confidence: parsed.confidence || 'medium',
      timing: {
        requestMs,
        timeToFirstTokenMs,
      },
    };

    yield {
      type: 'done',
      result: finalResult,
    };
  } catch (err: any) {
    yield {
      type: 'error',
      error: err?.message || 'Streaming generation failed',
    };
  }
}
