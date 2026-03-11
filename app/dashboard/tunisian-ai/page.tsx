"use client";

import { useEffect, useState } from "react";
import { Languages } from "lucide-react";
import { chatWithTunisianAssistant } from "@/lib/client-api";
import { tunisianExamples } from "@/lib/mock-data";
import { tunisianKnowledgePacks } from "@/lib/tunisian-ai-quality";
import { getSelectedWorkspaceId, WORKSPACE_EVENT } from "@/lib/client/workspace-selection";
import { useLocale } from "@/components/i18n/locale-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LearningCandidate = {
  id: string;
  phrase: string;
  language: string;
  source: string;
  status: "pending" | "approved" | "rejected";
  score: number;
  createdAt: string;
};

export default function TunisianAiPage() {
  const { tr } = useLocale();
  const [language, setLanguage] = useState<"darija" | "ar" | "fr" | "en">("darija");
  const [message, setMessage] = useState("");
  const [answer, setAnswer] = useState(
    "A7sen bidaya hiya bech تبني confiance: photos nadhfin, prix wadha7, livraison ma3louma men lawel, w reponse srii3 lel messages."
  );
  const [isLoading, setIsLoading] = useState(false);
  const [runningEval, setRunningEval] = useState(false);
  const [workspaceId, setWorkspaceId] = useState("workspace-default");
  const [historyRuns, setHistoryRuns] = useState<
    Array<{ id: string; averageScore: number; sampleCount: number; createdAt: string }>
  >([]);
  const [learningText, setLearningText] = useState("");
  const [learningStatus, setLearningStatus] = useState<"pending" | "approved" | "rejected" | "all">(
    "pending"
  );
  const [learningQueue, setLearningQueue] = useState<LearningCandidate[]>([]);
  const [submittingLearning, setSubmittingLearning] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [scorecard, setScorecard] = useState<{
    averageScore: number;
    sampleCount: number;
    results: Array<{
      id: string;
      language: string;
      prompt: string;
      score: number;
      breakdown: {
        clarity: number;
        safety: number;
        localization: number;
        empathy: number;
        languageFit: number;
      };
    }>;
  } | null>(null);

  const onSend = async () => {
    if (!message.trim()) return;
    try {
      setIsLoading(true);
      const result = await chatWithTunisianAssistant({ message, language });
      setAnswer(result.answer);
      setMessage("");
    } finally {
      setIsLoading(false);
    }
  };

  const runEvaluation = async () => {
    setRunningEval(true);
    try {
      const response = await fetch("/api/tunisian-assistant/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId })
      });
      const payload = (await response.json()) as {
        averageScore: number;
        sampleCount: number;
        results: Array<{
          id: string;
          language: string;
          prompt: string;
          score: number;
          breakdown: {
            clarity: number;
            safety: number;
            localization: number;
            empathy: number;
            languageFit: number;
          };
        }>;
      };
      if (!response.ok) {
        throw new Error(tr("tunisian.evaluationFailed", "Evaluation failed"));
      }
      setScorecard(payload);
      await loadHistory(workspaceId);
    } finally {
      setRunningEval(false);
    }
  };

  const loadHistory = async (selectedWorkspaceId: string) => {
    const response = await fetch(
      `/api/tunisian-assistant/evaluate/history?workspaceId=${encodeURIComponent(selectedWorkspaceId)}`
    );
    if (!response.ok) return;
    const payload = (await response.json()) as {
      runs?: Array<{ id: string; averageScore: number; sampleCount: number; createdAt: string }>;
    };
    setHistoryRuns(payload.runs ?? []);
  };

  const loadLearningQueue = async (selectedWorkspaceId: string, status = learningStatus) => {
    const response = await fetch(
      `/api/tunisian-learning/queue?workspaceId=${encodeURIComponent(selectedWorkspaceId)}&status=${status}&limit=60`
    );
    if (!response.ok) return;
    const payload = (await response.json()) as { candidates?: LearningCandidate[] };
    setLearningQueue(payload.candidates ?? []);
  };

  const submitLearningCandidate = async () => {
    if (!learningText.trim()) return;
    setSubmittingLearning(true);
    try {
      const response = await fetch("/api/tunisian-learning/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          phrase: learningText.trim(),
          language,
          source: "manual"
        })
      });
      if (!response.ok) {
        throw new Error(tr("tunisian.learningSubmitFailed", "Failed to submit learning phrase"));
      }
      setLearningText("");
      await loadLearningQueue(workspaceId);
    } finally {
      setSubmittingLearning(false);
    }
  };

  const reviewLearning = async (candidateId: string, action: "approve" | "reject") => {
    setReviewingId(candidateId);
    try {
      const response = await fetch(`/api/tunisian-learning/queue/${candidateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      if (!response.ok) {
        throw new Error(tr("tunisian.learningReviewFailed", "Failed to review learning candidate"));
      }
      await loadLearningQueue(workspaceId);
    } finally {
      setReviewingId(null);
    }
  };

  useEffect(() => {
    const selected = getSelectedWorkspaceId();
    setWorkspaceId(selected);
    void loadHistory(selected);
    void loadLearningQueue(selected, "pending");
    const onWorkspaceChange = (event: Event) => {
      const custom = event as CustomEvent<{ workspaceId?: string }>;
      const next = custom.detail?.workspaceId ?? getSelectedWorkspaceId();
      setWorkspaceId(next);
      void loadHistory(next);
      void loadLearningQueue(next, "pending");
    };
    window.addEventListener(WORKSPACE_EVENT, onWorkspaceChange as EventListener);
    return () => window.removeEventListener(WORKSPACE_EVENT, onWorkspaceChange as EventListener);
  }, []);

  useEffect(() => {
    void loadLearningQueue(workspaceId, learningStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [learningStatus]);

  return (
    <div className="space-y-4">
      <section className="premium-page-hero">
        <p className="premium-page-kicker">{tr("tunisian.kicker", "Tunisian AI Mode")}</p>
        <h1 className="premium-page-title">{tr("tunisian.title", "Your personal Tunisian assistant")}</h1>
        <p className="premium-page-description">
          {tr(
            "tunisian.description",
            "Ask about Tunisian daily life, business, communication, and admin tasks in Darija, Arabic, French, or English."
          )}
        </p>
        <div className="premium-action-row mt-4">
          <Button size="sm" onClick={() => setLanguage("darija")}>
            <Languages className="mr-2 h-4 w-4" />
            Darija
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setLanguage("ar")}>
            Arabic
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setLanguage("fr")}>
            French
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setLanguage("en")}>
            English
          </Button>
          <Button size="sm" variant="outline" onClick={() => void runEvaluation()} disabled={runningEval}>
            {runningEval
              ? tr("tunisian.runningEval", "Running quality eval...")
              : tr("tunisian.runScorecard", "Run quality scorecard")}
          </Button>
        </div>
        <div className="mt-3">
          <Badge>
            {tr("common.workspace", "Workspace")}: {workspaceId}
          </Badge>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <article className="premium-panel p-4">
          <h2 className="premium-section-title">{tr("tunisian.examplePrompts", "Example prompts")}</h2>
          <div className="mt-4 space-y-2">
            {tunisianExamples.map((item) => (
              <button
                key={item}
                suppressHydrationWarning
                onClick={() => setMessage(item)}
                className="premium-subpanel premium-interactive w-full p-3 text-left text-sm text-secondary hover:bg-elevated/70"
              >
                {item}
              </button>
            ))}
          </div>
          <h3 className="mt-5 text-sm font-semibold">{tr("tunisian.knowledgePacks", "Knowledge packs")}</h3>
          <div className="mt-2 space-y-2">
            {tunisianKnowledgePacks.map((pack) => (
              <div key={pack.id} className="rounded-xl border border-border/70 bg-elevated/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{pack.title}</p>
                  <Badge>{pack.id}</Badge>
                </div>
                <p className="mt-1 text-xs text-secondary">{pack.description}</p>
                <p className="mt-1 text-xs text-muted">{pack.bullets[0]}</p>
              </div>
            ))}
          </div>

          <h3 className="mt-5 text-sm font-semibold">
            {tr("tunisian.learningQueue", "Learning queue (phase 1)")}
          </h3>
          <div className="mt-2 rounded-xl border border-border/70 bg-elevated/20 p-3">
            <Input
              placeholder={tr("tunisian.learningInput", "Add a Tunisian word/phrase to learn")}
              value={learningText}
              onChange={(event) => setLearningText(event.target.value)}
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1">
                {(["pending", "approved", "rejected", "all"] as const).map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={learningStatus === status ? "default" : "outline"}
                    onClick={() => setLearningStatus(status)}
                  >
                    {status}
                  </Button>
                ))}
              </div>
              <Button size="sm" onClick={() => void submitLearningCandidate()} disabled={submittingLearning}>
                {submittingLearning
                  ? tr("common.saving", "Saving...")
                  : tr("tunisian.submitCandidate", "Submit")}
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              {learningQueue.map((candidate) => (
                <div key={candidate.id} className="rounded-lg border border-border/70 bg-elevated/25 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{candidate.phrase}</p>
                    <Badge>{candidate.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-secondary">
                    {candidate.language} · score {candidate.score} · {new Date(candidate.createdAt).toLocaleString()}
                  </p>
                  {candidate.status === "pending" && (
                    <div className="premium-action-row mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={reviewingId === candidate.id}
                        onClick={() => void reviewLearning(candidate.id, "approve")}
                      >
                        {tr("common.approve", "Approve")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={reviewingId === candidate.id}
                        onClick={() => void reviewLearning(candidate.id, "reject")}
                      >
                        {tr("common.reject", "Reject")}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              {!learningQueue.length && (
                <p className="text-xs text-muted">{tr("common.noData", "No data yet.")}</p>
              )}
            </div>
          </div>
        </article>

        <article className="premium-panel flex min-h-[520px] flex-col p-4">
          <h2 className="premium-section-title">{tr("common.chat", "Chat")}</h2>
          <div className="mt-4 flex-1 space-y-4">
            <div className="ml-auto max-w-[85%] rounded-2xl border border-accent/50 bg-accent/10 p-3 text-sm">
              {message || "Chnowa a7sen tari9a bech nbi3 produit online fi Tounes?"}
            </div>
            <div className="max-w-[88%] rounded-2xl border border-border bg-elevated/40 p-3 text-sm text-secondary">
              {answer}
            </div>
          </div>
          <div className="mt-4 border-t border-border pt-4">
            <Input
              placeholder={tr("tunisian.askPlaceholder", "Ask in Darija, Arabic, French, or English...")}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
            <div className="mt-4 flex justify-end">
              <Button onClick={() => void onSend()} disabled={isLoading}>
                {isLoading ? tr("common.sending", "Sending...") : `${tr("common.send", "Send")} (${language})`}
              </Button>
            </div>
            {scorecard && (
              <div className="mt-4 rounded-xl border border-border/70 bg-elevated/20 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="accent">
                    {tr("tunisian.averageScore", "Average score")}: {scorecard.averageScore}/100
                  </Badge>
                  <Badge>
                    {tr("tunisian.samples", "Samples")}: {scorecard.sampleCount}
                  </Badge>
                </div>
                <div className="mt-2 space-y-1">
                  {scorecard.results.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-lg border border-border/70 bg-elevated/25 px-2.5 py-2 text-xs text-secondary"
                    >
                      <p className="font-medium text-foreground">
                        {row.id} ({row.language}) - {row.score}/100
                      </p>
                      <p className="mt-1 truncate">{row.prompt}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!!historyRuns.length && (
              <div className="mt-4 rounded-xl border border-border/70 bg-elevated/20 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {tr("tunisian.scorecardHistory", "Scorecard history")}
                </p>
                <div className="mt-2 space-y-1">
                  {historyRuns.map((run) => (
                    <div
                      key={run.id}
                      className="rounded-lg border border-border/70 bg-elevated/25 px-2.5 py-2 text-xs text-secondary"
                    >
                      <p className="font-medium text-foreground">
                        {run.averageScore}/100 · {run.sampleCount} prompts
                      </p>
                      <p className="text-muted">{new Date(run.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
