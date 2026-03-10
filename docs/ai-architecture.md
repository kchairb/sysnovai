# Sysnova AI - RAG Architecture (MVP)

## Flow

User message  
-> retrieve workspace context (FAQs, policies, products, documents)  
-> build mode-aware + language-aware prompt  
-> send to LLM provider (mock in MVP)  
-> return grounded response

## Implemented in code

- `lib/ai/types.ts` - shared AI types for modes, languages, RAG input/output
- `lib/ai/retrieval.ts` - context retrieval layer (workspace sources)
- `lib/ai/prompting.ts` - prompt packaging with mode/language instructions
- `lib/ai/prompts/mode-templates.ts` - mode-specific style, constraints, output shape
- `lib/ai/providers/provider-factory.ts` - provider selection entry point
- `lib/ai/providers/mock-provider.ts` - mock LLM provider implementation
- `lib/ai/providers/openai-provider.ts` - OpenAI provider implementation
- `lib/ai/providers/gemini-provider.ts` - Gemini provider implementation
- `lib/ai/observability.ts` - trace IDs and structured pipeline events
- `lib/ai/orchestrator.ts` - pipeline orchestration
- `lib/ai/training/schemas.ts` - contracts for training examples and dataset manifests
- `lib/ai/evals/schemas.ts` - contracts for benchmark cases and eval runs
- `lib/ai/evals/tunisian-benchmark.v1.json` - first tunisian benchmark seed
- `app/api/chat/reply/route.ts` - business assistant endpoint using RAG pipeline
- `app/api/tunisian-assistant/chat/route.ts` - tunisian assistant endpoint using RAG pipeline

## Supported AI modes

- General assistant
- Support assistant
- Sales assistant
- Marketing assistant
- Tunisian assistant

## Supported languages

- English (`en`)
- French (`fr`)
- Arabic (`ar`)
- Tunisian Darija (`darija`)

## Next production upgrades

- Replace mock retrieval with DB + embeddings
- Add vector index per workspace
- Add OpenAI/Anthropic provider implementations
- Add citations and confidence metadata

## Provider configuration

- Environment variable: `SYSNOVA_LLM_PROVIDER`
- Supported values: `mock`, `openai`, `gemini`
- Environment variable: `OPENAI_API_KEY` (required for OpenAI)
- Environment variable: `OPENAI_MODEL` (optional, defaults to `gpt-4.1-mini`)
- Environment variable: `GEMINI_API_KEY` (required for Gemini)
- Environment variable: `GEMINI_MODEL` (optional, defaults to `gemini-1.5-flash`)
- Environment variable: `SYSNOVA_LLM_TIMEOUT_MS` (optional, defaults to `8000`)
- Environment variable: `SYSNOVA_LLM_RETRIES` (optional, defaults to `1`)

## Resilience and observability

- Fallback chain: `openai -> mock` (when primary provider fails)
- Fallback chain: `gemini -> mock` (when primary provider fails)
- Retry strategy: `retries + 1` attempts per provider
- Timeout guard: per-attempt timeout in milliseconds
- Tracing: each pipeline run emits a `traceId` and stage events in API metadata

## Related docs

- `docs/ai-layer-structure.md`
- `docs/ai-model-roadmap.md`
- `docs/sysnova-ai-model-strategy.md`
- `docs/openai-setup.md`
- `docs/gemini-setup.md`

## Benchmark runner

- Command: `npm run ai:benchmark`
- Script: `scripts/ai/run-benchmark.mjs`
- Input benchmark: `lib/ai/evals/tunisian-benchmark.v1.json`
- Output reports: `reports/evals/*.json`
