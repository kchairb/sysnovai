# Sysnova AI Model Roadmap (MVP -> Tunisia-Adapted Model)

Primary strategy reference: `docs/sysnova-ai-model-strategy.md`

## Phase 1 - MVP (Current)

Goal: ship production value quickly using API-based LLM + RAG.

- LLM provider abstraction (`mock`, `openai`)
- RAG context retrieval from FAQs, policies, products, docs
- Prompt templates per mode:
  - general
  - support
  - sales
  - marketing
  - tunisian-assistant
- Multilingual outputs (`en`, `fr`, `ar`, `darija`)
- Observability with trace IDs, retries, timeout, fallback

Exit criteria:
- Stable response quality in top user flows
- Baseline benchmark score for Tunisian tasks
- Data collection pipeline operational

## Phase 2 - Data Flywheel and Benchmarking

Goal: create high-quality supervised data for model adaptation.

- Log anonymized prompts/responses and user feedback
- Build training datasets using `lib/ai/training/schemas.ts`
- Curate benchmark sets using `lib/ai/evals/schemas.ts`
- Track quality by language and by mode
- Add safety and PII filters before training export

Exit criteria:
- Sufficient approved examples per target task
- Regular eval runs with consistent reporting
- Clear weak spots identified (for example, Darija fluency or mixed-language accuracy)

## Phase 3 - Continued Pretraining (CPT)

Goal: improve foundational Tunisian language adaptation.

Data scope:
- Tunisian Darija text
- Tunisian Arabic and French mixed usage
- Business communication style corpora (licensed/internal)

Training approach:
- Continued pretraining on base multilingual model
- Preserve English/French/Arabic competence while increasing local fluency
- Run catastrophic forgetting checks on general capabilities

Exit criteria:
- Better local fluency and mixed-language handling vs MVP baseline
- No major regressions in safety and instruction following

## Phase 4 - Instruction Fine-Tuning (SFT)

Goal: align model to Sysnova tasks.

Primary task packs:
- Tunisian customer support
- Tunisian business communication
- local Q&A
- Darija <-> Arabic/French/English translation

Training signals:
- high-quality human-approved examples
- synthetic augmentation with strict filtering
- mode-specific prompt/response formatting

Exit criteria:
- Significant benchmark gains on task packs
- Better response reliability than API-only baseline

## Phase 5 - Hybrid Production Rollout

Goal: safely introduce custom model in production.

- Keep provider abstraction and route-level compatibility
- Start shadow traffic and offline comparison
- Gradual rollout by mode (for example, tunisian-assistant first)
- Maintain fallback to external LLM providers

Exit criteria:
- Stable latency, cost, and quality in production
- Fallback rarely triggered for target modes

## Phase 6 - Full Sysnova Model Platform

Goal: own local AI stack while keeping interoperability.

- Dedicated inference service for adapted models
- Versioned model registry and canary rollout
- Retrieval + custom model co-optimization
- Continuous evaluation and drift detection

## Practical migration rule

Never break the API contract:
- keep `orchestrator` stable
- plug model changes behind `providers`
- keep eval gates before each rollout step
