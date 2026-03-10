# Gemini Setup for Sysnova AI (Low-Cost Testing)

To use Gemini instead of OpenAI for cheaper testing:

1. Open/create `.env.local` in project root.
2. Add:

```bash
SYSNOVA_LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash
# optional model fallback chain (comma-separated)
GEMINI_MODEL_CANDIDATES=gemini-2.0-flash,gemini-2.0-flash-lite,gemini-1.5-flash-latest
SYSNOVA_LLM_TIMEOUT_MS=8000
SYSNOVA_LLM_RETRIES=1
```

3. Restart server:

```bash
npm run dev
```

4. Verify in `Settings -> LLM Provider`:
- Provider: `gemini`
- Provider key: `Configured`
- Test Provider should pass.

If Gemini fails, Sysnova AI automatically falls back to mock provider.

Useful helper endpoint:

- `GET /api/admin/llm/models`
- Lists Gemini models available for your key/project and `generateContent` support.
