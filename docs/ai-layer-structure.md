# Sysnova AI Layer Structure

This structure keeps MVP speed while preparing for custom Tunisia-adapted models.

## Folder layout

```text
lib/ai/
  types.ts
  orchestrator.ts
  retrieval.ts
  prompting.ts
  observability.ts
  prompts/
    mode-templates.ts
  providers/
    provider-factory.ts
    mock-provider.ts
    openai-provider.ts
  training/
    schemas.ts
  evals/
    schemas.ts
    tunisian-benchmark.v1.json
docs/
  ai-architecture.md
  ai-layer-structure.md
  ai-model-roadmap.md
```

## Responsibilities

- `orchestrator.ts`: pipeline entry point (`retrieve -> prompt -> provider -> trace`)
- `retrieval.ts`: context selection for RAG (FAQs, policies, products, docs)
- `prompting.ts`: shared prompt assembly logic
- `prompts/mode-templates.ts`: mode-specific behavior and output constraints
- `providers/*`: LLM adapters (OpenAI today, custom model later)
- `training/schemas.ts`: dataset row contracts for continued pretraining and SFT
- `evals/schemas.ts`: benchmark and evaluation run contracts
- `observability.ts`: trace IDs, stage logs, and fallback visibility

## Design principles

- Keep API layer provider-agnostic through `LlmProvider` interface.
- Keep mode logic declarative in templates, not hardcoded in routes.
- Keep training and eval schemas versioned to support future data governance.
- Keep RAG and model adaptation independent so each can evolve safely.
