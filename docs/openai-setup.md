# OpenAI Key Setup for Sysnova AI

To enable real OpenAI generation in Sysnova AI:

1. Create a local env file in project root:

```bash
.env.local
```

2. Add these values:

```bash
SYSNOVA_LLM_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1-mini
SYSNOVA_LLM_TIMEOUT_MS=8000
SYSNOVA_LLM_RETRIES=1
```

3. Restart the dev server:

```bash
npm run dev
```

4. Verify in UI:
- open `Settings`
- check `LLM Provider` card
- status should show:
  - `Provider: openai`
  - `OpenAI key: Configured`

If OpenAI fails at runtime, Sysnova AI falls back to mock provider automatically.
