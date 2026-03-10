# Sysnova AI Model Strategy

## Goal

Build an AI system that understands Tunisian Darija, Arabic, French, English, and Tunisian mixed-language usage.

## Phase 1 - MVP

Use an existing LLM through API and add RAG grounded on workspace knowledge.

RAG sources:
- products
- FAQs
- business policies
- documents
- tunisian knowledge base (added progressively)

Operational requirements:
- provider abstraction behind one interface
- prompt templates by mode
- multilingual output controls
- traceability and fallback reliability

## Phase 2 - Data Collection

Collect and organize high-quality training data:
- Tunisian Darija text
- Darija in Latin script
- Arabic-script Tunisian content
- French used in Tunisia
- mixed-language examples
- customer support examples
- business/admin writing examples

Data governance:
- PII redaction
- source and license tracking
- quality scoring and reviewer approval

## Phase 3 - Language Adaptation

Adapt a base multilingual model with continued pretraining on Tunisian language data.

Targets:
- stronger Darija comprehension
- better mixed-language robustness
- preserve Arabic/French/English baseline competence

## Phase 4 - Instruction Tuning

Fine-tune on Sysnova use cases:
- Tunisian customer replies
- Tunisian business communication
- local Q&A
- translation tasks (Darija, Arabic, French, English)
- marketing generation

## Phase 5 - Evaluation

Measure model quality continuously with Tunisian-first benchmarks:
- Darija understanding
- French/Arabic/Darija switching
- customer support quality
- business writing quality
- local Tunisia relevance

Promotion rule:
- no production promotion without passing benchmark thresholds by language and by mode.
