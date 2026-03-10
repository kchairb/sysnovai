import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

const benchmarkPath = path.join(repoRoot, "lib", "ai", "evals", "tunisian-benchmark.v1.json");
const outDir = path.join(repoRoot, "reports", "evals");
const baseUrl = process.env.SYSNOVA_BENCHMARK_BASE_URL ?? "http://localhost:3000";
const workspaceId = process.env.SYSNOVA_BENCHMARK_WORKSPACE_ID ?? "workspace-default";
const modelName = process.env.SYSNOVA_LLM_PROVIDER ?? "unknown-provider";
const modelVersion = process.env.OPENAI_MODEL ?? "default";

function normalizeMode(mode) {
  return mode;
}

function toApiLanguage(language) {
  if (language === "mixed") return "darija";
  return language;
}

function includesAny(text, words) {
  const lower = text.toLowerCase();
  return words.some((word) => lower.includes(word));
}

function scoreCase(outputText, focus) {
  const text = outputText ?? "";
  const hasMeaningfulLength = text.trim().length > 30;
  const hasTunisiaSignals = includesAny(text, [
    "tunisia",
    "tunis",
    "sfax",
    "darija",
    "commande",
    "livraison"
  ]);
  const hasBusinessSignals = includesAny(text, [
    "customer",
    "client",
    "support",
    "reply",
    "campaign",
    "cta",
    "delivery",
    "payment"
  ]);
  const hasLanguageSwitchSignals = includesAny(text, ["fr", "arabic", "darija", "english"]);

  const baseFluency = hasMeaningfulLength ? 0.75 : 0.4;
  const baseGrounding = hasBusinessSignals ? 0.75 : 0.45;
  const baseLocal = hasTunisiaSignals ? 0.8 : 0.5;
  const baseSafety = 0.9;
  const baseTask = hasMeaningfulLength ? 0.8 : 0.5;

  const metrics = {
    grounding: baseGrounding,
    fluency: baseFluency,
    localRelevance: baseLocal,
    safety: baseSafety,
    taskCompletion: baseTask
  };

  const strategic = {
    darijaUnderstanding: focus.includes("darija-understanding")
      ? hasMeaningfulLength
        ? 0.78
        : 0.45
      : 0.7,
    languageSwitching: focus.includes("language-switching")
      ? hasLanguageSwitchSignals
        ? 0.75
        : 0.5
      : 0.68,
    supportQuality: focus.includes("support-quality") ? (hasBusinessSignals ? 0.8 : 0.5) : 0.7,
    businessWritingQuality: focus.includes("business-writing")
      ? hasBusinessSignals
        ? 0.8
        : 0.52
      : 0.7,
    tunisiaRelevance: focus.includes("tunisia-relevance") ? baseLocal : 0.68
  };

  return { metrics, strategic };
}

function average(numbers) {
  if (!numbers.length) return 0;
  return Number((numbers.reduce((sum, n) => sum + n, 0) / numbers.length).toFixed(4));
}

async function callCaseApi(testCase) {
  const isTunisianAssistant = testCase.mode === "tunisian-assistant";
  const endpoint = isTunisianAssistant
    ? `${baseUrl}/api/tunisian-assistant/chat`
    : `${baseUrl}/api/chat/reply`;

  const body = isTunisianAssistant
    ? {
        workspaceId,
        language: toApiLanguage(testCase.inputLanguage),
        message: testCase.prompt
      }
    : {
        workspaceId,
        language: toApiLanguage(testCase.inputLanguage),
        mode: normalizeMode(testCase.mode),
        prompt: testCase.prompt
      };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Case ${testCase.id} failed: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  return isTunisianAssistant ? payload.answer : payload.reply;
}

async function run() {
  const benchmarkRaw = await readFile(benchmarkPath, "utf8");
  const benchmark = JSON.parse(benchmarkRaw);
  const runId = `eval-${Date.now()}`;
  const executedAt = new Date().toISOString();

  const caseResults = [];
  const failures = [];

  for (const testCase of benchmark.cases) {
    try {
      const outputText = await callCaseApi(testCase);
      const scored = scoreCase(outputText, testCase.focus ?? []);
      caseResults.push({
        caseId: testCase.id,
        mode: testCase.mode,
        inputLanguage: testCase.inputLanguage,
        focus: testCase.focus ?? [],
        outputText,
        metrics: scored.metrics,
        strategic: scored.strategic
      });
    } catch (error) {
      failures.push({
        caseId: testCase.id,
        reason: error instanceof Error ? error.message : "Unknown benchmark failure",
        severity: "high"
      });
    }
  }

  const aggregate = {
    grounding: average(caseResults.map((c) => c.metrics.grounding)),
    fluency: average(caseResults.map((c) => c.metrics.fluency)),
    localRelevance: average(caseResults.map((c) => c.metrics.localRelevance)),
    safety: average(caseResults.map((c) => c.metrics.safety)),
    taskCompletion: average(caseResults.map((c) => c.metrics.taskCompletion)),
    overall: average(
      caseResults.map((c) =>
        average([
          c.metrics.grounding,
          c.metrics.fluency,
          c.metrics.localRelevance,
          c.metrics.safety,
          c.metrics.taskCompletion
        ])
      )
    )
  };

  const strategicMetrics = {
    darijaUnderstanding: average(caseResults.map((c) => c.strategic.darijaUnderstanding)),
    languageSwitching: average(caseResults.map((c) => c.strategic.languageSwitching)),
    supportQuality: average(caseResults.map((c) => c.strategic.supportQuality)),
    businessWritingQuality: average(caseResults.map((c) => c.strategic.businessWritingQuality)),
    tunisiaRelevance: average(caseResults.map((c) => c.strategic.tunisiaRelevance))
  };

  const byLanguage = {};
  const byMode = {};

  for (const result of caseResults) {
    const overallScore = average([
      result.metrics.grounding,
      result.metrics.fluency,
      result.metrics.localRelevance,
      result.metrics.safety,
      result.metrics.taskCompletion
    ]);

    if (!byLanguage[result.inputLanguage]) byLanguage[result.inputLanguage] = [];
    byLanguage[result.inputLanguage].push(overallScore);

    if (!byMode[result.mode]) byMode[result.mode] = [];
    byMode[result.mode].push(overallScore);
  }

  const byLanguageScores = Object.fromEntries(
    Object.entries(byLanguage).map(([k, v]) => [k, average(v)])
  );
  const byModeScores = Object.fromEntries(Object.entries(byMode).map(([k, v]) => [k, average(v)]));

  const report = {
    runId,
    modelName,
    modelVersion,
    benchmark: benchmark.benchmark,
    executedAt,
    aggregate,
    strategicMetrics,
    byLanguage: byLanguageScores,
    byMode: byModeScores,
    failures,
    totalCases: benchmark.cases.length,
    passedCases: caseResults.length,
    results: caseResults
  };

  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `${runId}.json`);
  await writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

  console.log(`Benchmark completed: ${runId}`);
  console.log(`Report written to: ${outPath}`);
  console.log(
    `Overall: ${aggregate.overall} | Darija: ${strategicMetrics.darijaUnderstanding} | Switching: ${strategicMetrics.languageSwitching}`
  );
  if (failures.length) {
    console.log(`Failures: ${failures.length}`);
  }
}

run().catch((error) => {
  console.error("Benchmark runner failed:", error);
  process.exit(1);
});
