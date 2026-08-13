/**
 * Guardrail Suite & Grounding Check Stub (Phase 6)
 */
export function checkSafety(query) {
  return { isSafe: true, reason: null };
}

export function checkGrounding(answer, passages) {
  return { isGrounded: true, score: 1.0, ungroundedSentences: [] };
}
