# VaaniRAG Guardrail & Grounding Suite

## Guardrail Objectives

1. **Zero Hallucination Guarantee**: Answers are strictly generated from retrieved MS MARCO-XI passages. If context relevance is below threshold, the system explicitly refuses or requests clarification.
2. **Citation Enforcement**: Every claim in the generated answer must map directly to a passage ID citation.
3. **Prompt Injection & Safety Filter**: Inbound user queries are sanitized prior to entering the vector store and LLM harness.
