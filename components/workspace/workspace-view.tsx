"use client";

import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  ChevronsUpDown,
  Copy,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Search,
  WandSparkles
} from "lucide-react";
import { promptTemplates } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme/theme-provider";
import { useLocale } from "@/components/i18n/locale-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_WORKSPACE_ID,
  getSelectedWorkspaceId,
  WORKSPACE_EVENT
} from "@/lib/client/workspace-selection";

type PersistedConversation = {
  id: string;
  workspaceId: string;
  title: string;
  mode: string;
  language: string;
  tone: string;
  updatedAt: string;
};

type PersistedMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type WorkspaceMode = "general" | "support" | "sales" | "marketing" | "tunisian-assistant";
type ProviderBadge = {
  badge: "healthy" | "degraded" | "fallback";
  summary?: {
    fallbackCount?: number;
    errorCount?: number;
    successCount?: number;
  };
};

const modes: Array<{ label: string; value: WorkspaceMode }> = [
  { label: "General", value: "general" },
  { label: "Support", value: "support" },
  { label: "Sales", value: "sales" },
  { label: "Marketing", value: "marketing" },
  { label: "Tunisian Assistant", value: "tunisian-assistant" }
];

export function WorkspaceView() {
  const { tr } = useLocale();
  const { theme } = useTheme();
  const lightInterface = theme === "light";
  const [workspaceId, setWorkspaceId] = useState(DEFAULT_WORKSPACE_ID);
  const [showLeftPanel, setShowLeftPanel] = useState(false);
  const [conversationList, setConversationList] = useState<PersistedConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [conversationSearch, setConversationSearch] = useState("");
  const [selectedMode, setSelectedMode] = useState<WorkspaceMode>("support");
  const [selectedLanguage, setSelectedLanguage] = useState("fr");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [messagesByConversation, setMessagesByConversation] = useState<
    Record<string, PersistedMessage[]>
  >({});
  const [actionLoadingMessageId, setActionLoadingMessageId] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState("Ready");
  const [loadingChats, setLoadingChats] = useState(true);
  const [streamingReply, setStreamingReply] = useState("");
  const [workspaceResyncNotice, setWorkspaceResyncNotice] = useState("");
  const [toasts, setToasts] = useState<
    Array<{ id: string; type: "error" | "success"; message: string }>
  >([]);
  const [providerBadge, setProviderBadge] = useState<ProviderBadge | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const pushToast = (type: "error" | "success", message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3200);
  };

  const selectedConversation = useMemo(
    () => conversationList.find((conversation) => conversation.id === selectedConversationId),
    [conversationList, selectedConversationId]
  );

  const messages = selectedConversationId ? messagesByConversation[selectedConversationId] ?? [] : [];

  const filteredConversations = useMemo(
    () =>
      conversationList.filter((conversation) =>
        `${conversation.title} ${conversation.mode}`
          .toLowerCase()
          .includes(conversationSearch.toLowerCase())
      ),
    [conversationList, conversationSearch]
  );

  const replaceMessage = (conversationId: string, messageId: string, content: string) => {
    setMessagesByConversation((prev) => ({
      ...prev,
      [conversationId]: (prev[conversationId] ?? []).map((message) =>
        message.id === messageId ? { ...message, content } : message
      )
    }));
  };

  const loadChats = async () => {
    setLoadingChats(true);
    try {
      const response = await fetch(`/api/workspace/chats?workspaceId=${workspaceId}`);
      if (!response.ok) {
        const message =
          response.status === 401
            ? tr("workspace.sessionExpired", "Session expired. Please login again.")
            : response.status === 403
              ? tr("workspace.accessDenied", "Access denied for this workspace.")
              : tr("workspace.unableLoadChats", "Unable to load chats. Please retry.");
        setLiveStatus(message);
        pushToast("error", message);
        return;
      }
      const payload = (await response.json()) as { chats: PersistedConversation[] };
      const chats = payload.chats ?? [];
      setConversationList(chats);
      const hasSelectedInWorkspace = chats.some((chat) => chat.id === selectedConversationId);
      if (!hasSelectedInWorkspace) {
        const nextConversationId = chats[0]?.id ?? "";
        setSelectedConversationId(nextConversationId);
        if (chats[0]) {
          setSelectedLanguage(chats[0].language ?? "fr");
          setSelectedMode((chats[0].mode as WorkspaceMode) ?? "support");
        }
      }
    } finally {
      setLoadingChats(false);
    }
  };

  const loadProviderHealth = async () => {
    try {
      const response = await fetch(`/api/workspace/provider-health?workspaceId=${workspaceId}`);
      if (!response.ok) return;
      const payload = (await response.json()) as { badge?: ProviderBadge };
      if (payload.badge) {
        setProviderBadge(payload.badge);
      }
    } catch {
      // Best-effort telemetry badge.
    }
  };

  const loadMessages = async (chatId: string) => {
    const response = await fetch(`/api/workspace/chats/${chatId}?workspaceId=${workspaceId}`);
    if (!response.ok) {
      if (response.status === 403 || response.status === 404) {
        setSelectedConversationId("");
        const message = tr(
          "workspace.conversationUnavailable",
          "Conversation is not available in this workspace. Select another chat."
        );
        setLiveStatus(message);
        pushToast("error", message);
      } else if (response.status === 401) {
        pushToast("error", tr("workspace.sessionExpired", "Session expired. Please login again."));
      } else {
        pushToast(
          "error",
          tr("workspace.unableLoadMessages", "Unable to load conversation messages.")
        );
      }
      return;
    }
    const payload = (await response.json()) as {
      chat: PersistedConversation;
      messages: PersistedMessage[];
    };
    setMessagesByConversation((prev) => ({ ...prev, [chatId]: payload.messages ?? [] }));
  };

  const requestReply = async (inputPrompt: string, conversationId: string) => {
    const response = await fetch("/api/chat/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        conversationId,
        prompt: inputPrompt,
        mode: selectedMode,
        language: selectedLanguage
      })
    });
    const payload = (await response.json()) as {
      reply?: string;
      meta?: { provider?: string; model?: string };
    };
    if (!response.ok) {
      const message =
        (payload as unknown as { error?: string }).error ??
        (response.status === 401
          ? tr("workspace.sessionExpired", "Session expired. Please login again.")
          : response.status === 403
            ? tr(
                "workspace.mismatchCreatingFresh",
                "Conversation/workspace mismatch. Creating a fresh chat..."
              )
            : response.status >= 500
              ? tr("workspace.serverGenerateError", "Server error while generating. Please retry.")
              : tr("workspace.failedGenerateReply", "Failed to generate reply"));
      throw new Error(message);
    }
    setLiveStatus(
      payload.meta?.provider
        ? `Live: ${payload.meta.provider}/${payload.meta?.model ?? "default"}`
        : tr("workspace.liveProviderUnavailable", "Live: provider unavailable")
    );
    return payload.reply ?? tr("workspace.noResponseProvider", "No response from provider.");
  };

  const requestReplyStream = async (inputPrompt: string, conversationId: string) => {
    const response = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        conversationId,
        prompt: inputPrompt,
        mode: selectedMode,
        language: selectedLanguage
      })
    });

    if (!response.ok || !response.body) {
      let serverError = "";
      try {
        const payload = (await response.json()) as { error?: string };
        serverError = payload.error ?? "";
      } catch {
        serverError = "";
      }
      throw new Error(
        serverError ||
          (response.status === 401
            ? tr("workspace.sessionExpired", "Session expired. Please login again.")
            : response.status >= 500
              ? tr(
                  "workspace.serverStreamError",
                  "Server error while starting stream. Please retry."
                )
              : "") ||
          (response.status === 403
            ? tr(
                "workspace.mismatchCreatingFresh",
                "Conversation/workspace mismatch. Creating a fresh chat..."
              )
            : tr("workspace.failedStartStream", "Failed to start streaming response"))
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let complete = false;
    setStreamingReply("");

    while (!complete) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const event of events) {
        const line = event.split("\n").find((candidate) => candidate.startsWith("data: "));
        if (!line) continue;

        const payload = JSON.parse(line.slice(6)) as {
          delta?: string;
          done?: boolean;
          provider?: string;
          model?: string;
        };

        if (payload.delta) {
          setStreamingReply((prev) => prev + payload.delta);
        }
        if (payload.done) {
          complete = true;
          setLiveStatus(
            payload.provider
              ? `Live: ${payload.provider}/${payload.model ?? "default"}`
              : tr("workspace.liveProviderUnavailable", "Live: provider unavailable")
          );
        }
      }
    }
  };

  useEffect(() => {
    setWorkspaceId(getSelectedWorkspaceId());
    const onWorkspaceChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ workspaceId?: string }>;
      const nextWorkspaceId = customEvent.detail?.workspaceId ?? getSelectedWorkspaceId();
      setWorkspaceId(nextWorkspaceId);
      setSelectedConversationId("");
      setMessagesByConversation({});
      setConversationList([]);
      setWorkspaceResyncNotice(
        `${tr("workspace.switchedTo", "Workspace switched to")} ${nextWorkspaceId}. ${tr(
          "workspace.conversationsResynced",
          "Conversations are automatically resynced."
        )}`
      );
      setLiveStatus(
        tr("workspace.changedResyncing", "Workspace changed. Resyncing conversations...")
      );
    };
    window.addEventListener(WORKSPACE_EVENT, onWorkspaceChange as EventListener);
    return () => window.removeEventListener(WORKSPACE_EVENT, onWorkspaceChange as EventListener);
  }, []);

  useEffect(() => {
    void loadChats();
    void loadProviderHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadProviderHealth();
    }, 20_000);
    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isGenerating, selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId) return;
    void loadMessages(selectedConversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId]);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setShowLeftPanel((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const ensureConversationForGeneration = async () => {
    if (selectedConversationId && conversationList.some((chat) => chat.id === selectedConversationId)) {
      return selectedConversationId;
    }
    const response = await fetch("/api/workspace/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        mode: selectedMode,
        language: selectedLanguage,
        tone: "Warm, premium, trustworthy"
      })
    });
    const payload = (await response.json()) as { chat?: PersistedConversation; error?: string };
    if (!response.ok || !payload.chat) {
      throw new Error(payload.error ?? tr("workspace.unableCreateChat", "Unable to create chat."));
    }
    setSelectedConversationId(payload.chat.id);
    await loadChats();
    return payload.chat.id;
  };

  const onGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    const promptToSend = prompt;
    setPrompt("");

    try {
      const conversationId = await ensureConversationForGeneration();
      try {
        await requestReplyStream(promptToSend, conversationId);
        await loadMessages(conversationId);
      } catch (streamError) {
        const canRetryFreshChat =
          streamError instanceof Error &&
          streamError.message.toLowerCase().includes("workspace mismatch");
        if (canRetryFreshChat) {
          setSelectedConversationId("");
          const freshConversationId = await ensureConversationForGeneration();
          await requestReplyStream(promptToSend, freshConversationId);
          await loadMessages(freshConversationId);
        } else {
          throw streamError;
        }
      }
      await loadChats();
      await loadProviderHealth();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : tr("workspace.generationFailed", "Generation failed");
      setLiveStatus(message);
      pushToast("error", message);
      setPrompt(promptToSend);
    } finally {
      setStreamingReply("");
      setIsGenerating(false);
    }
  };

  const onNewChat = () => {
    void (async () => {
      try {
        const conversationId = await ensureConversationForGeneration();
        await loadMessages(conversationId);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : tr("workspace.unableCreateChat", "Unable to create chat.");
        setLiveStatus(message);
        pushToast("error", message);
      }
    })();
  };

  const runAssistantAction = async (
    messageId: string,
    action: "regenerate" | "shorten" | "translate" | "formal"
  ) => {
    const conversationMessages = messagesByConversation[selectedConversationId] ?? [];
    const targetIndex = conversationMessages.findIndex((message) => message.id === messageId);
    const targetMessage = conversationMessages[targetIndex];
    if (targetIndex === -1 || !targetMessage || targetMessage.role !== "assistant") return;

    const previousUser = [...conversationMessages.slice(0, targetIndex)]
      .reverse()
      .find((message) => message.role === "user");
    const baseText =
      action === "regenerate" ? previousUser?.content ?? targetMessage.content : targetMessage.content;

    const transformedPrompt =
      action === "regenerate"
        ? `Regenerate this response with better clarity and trust: ${baseText}`
        : action === "shorten"
          ? `Shorten this response while keeping key meaning: ${baseText}`
          : action === "translate"
            ? `Translate this response to ${selectedLanguage}: ${baseText}`
            : `Rewrite this response in a more formal and premium tone: ${baseText}`;

    try {
      setActionLoadingMessageId(messageId);
      const reply = await requestReply(transformedPrompt, selectedConversationId);
      replaceMessage(selectedConversationId, messageId, reply);
      await loadChats();
    } catch (error) {
      replaceMessage(
        selectedConversationId,
        messageId,
        error instanceof Error
          ? `${tr("workspace.actionFailed", "Action failed")}: ${error.message}`
          : tr("workspace.actionFailed", "Action failed.")
      );
    } finally {
      setActionLoadingMessageId(null);
    }
  };

  const onPromptKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter") return;
    if (event.shiftKey) return;
    if (event.nativeEvent.isComposing) return;
    event.preventDefault();
    void onGenerate();
  };

  const formatMessageTime = (isoDate?: string) => {
    if (!isoDate) return "";
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getHours().toString().padStart(2, "0")}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  };

  const formatConversationMetaTime = (isoDate?: string) => {
    if (!isoDate) return "";
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString([], {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className={cn("space-y-4", lightInterface ? "text-slate-900" : "text-foreground")}>
      {!!toasts.length && (
        <div className="fixed right-5 top-20 z-[90] space-y-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={cn(
                "rounded-xl border px-3 py-2 text-xs shadow-lg",
                toast.type === "error"
                  ? "border-error/45 bg-error/15 text-error"
                  : "border-success/45 bg-success/15 text-success"
              )}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}
      {workspaceResyncNotice && (
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-xs",
            lightInterface
              ? "border-[#bfd1f1] bg-white/85 text-slate-700"
              : "border-accent/30 bg-accent/10 text-secondary"
          )}
        >
          <p>{workspaceResyncNotice}</p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-7" onClick={() => void loadChats()}>
              {tr("common.refreshNow", "Refresh now")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7"
              onClick={() => setWorkspaceResyncNotice("")}
            >
              {tr("common.dismiss", "Dismiss")}
            </Button>
          </div>
        </div>
      )}
      <div
        className={cn(
          "grid h-[calc(100vh-6.75rem)] gap-4 transition-all duration-200 ease-out",
          showLeftPanel ? "xl:grid-cols-[268px_minmax(0,1fr)]" : "xl:grid-cols-1"
        )}
      >
        {showLeftPanel && (
          <aside
            className={cn(
              "rounded-3xl border p-3",
              lightInterface
                ? "premium-light-panel border-[#bfd1f1]"
                : "elevation-l2"
            )}
          >
            <div className="flex items-center justify-between px-1 py-1">
              <h2 className="text-sm font-medium">{tr("workspace.conversations", "Conversations")}</h2>
              <Button size="sm" onClick={onNewChat}>
                {tr("workspace.newChat", "New Chat")}
              </Button>
            </div>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                className="pl-9"
                    placeholder={tr("workspace.searchChats", "Search chats...")}
                value={conversationSearch}
                onChange={(event) => setConversationSearch(event.target.value)}
              />
            </div>
            <div
              className={cn(
                "mt-3 h-[calc(100vh-15rem)] space-y-2 overflow-y-auto rounded-2xl p-2",
                lightInterface
                  ? "border border-[#CBD7EE] bg-[#EEF3FF]/85"
                  : "border border-border/70 bg-background/35"
              )}
            >
              {loadingChats && (
                <p className="rounded-lg border border-border/70 bg-elevated/30 p-2 text-xs text-muted">
                      {tr("workspace.loadingChats", "Loading chats...")}
                </p>
              )}
              {filteredConversations.map((conversation, idx) => (
                <button
                  key={conversation.id}
                  suppressHydrationWarning
                  onClick={() => setSelectedConversationId(conversation.id)}
                  className={cn(
                    "premium-interactive w-full rounded-2xl border p-2.5 text-left transition-all duration-200",
                    (selectedConversationId ? conversation.id === selectedConversationId : idx === 0)
                      ? lightInterface
                        ? "border-accent/35 bg-white shadow-[0_0_0_1px_rgba(34,199,214,0.16)]"
                        : "border-accent/45 bg-elevated/60 shadow-[0_10px_30px_rgba(2,8,20,0.32)]"
                      : lightInterface
                        ? "border-[#CBD7EE] bg-[#F6F9FF] hover:bg-white hover:shadow-sm"
                        : "border-border/80 bg-elevated/30 hover:bg-elevated/55"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{conversation.title}</p>
                    <span className="text-[11px] text-muted">
                      {formatConversationMetaTime(conversation.updatedAt)}
                    </span>
                  </div>
                  <p className={cn("mt-1 text-xs", lightInterface ? "text-slate-600" : "text-secondary")}>
                    {conversation.title}
                  </p>
                  <Badge className="mt-2">{conversation.mode}</Badge>
                </button>
              ))}
            </div>
          </aside>
        )}

        <section
          className={cn(
            "flex min-w-0 flex-col rounded-3xl border p-4",
            lightInterface
              ? "premium-light"
              : "premium-panel",
            "h-[calc(100vh-6.75rem)]"
          )}
        >
          <div
            className={cn(
              "mb-3 flex items-center justify-between rounded-2xl border px-3 py-2.5",
                lightInterface ? "border-[#CBD7EE] bg-white/95" : "elevation-l1 border-border/80"
            )}
          >
            <p className="truncate text-sm font-medium">
              {selectedConversation?.title ?? tr("workspace.newConversation", "New conversation")}
            </p>
            <div className="flex items-center gap-2">
              <p className={cn("text-xs", lightInterface ? "text-slate-500" : "text-muted")}>{liveStatus}</p>
              {providerBadge && (
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    providerBadge.badge === "healthy"
                      ? "border-success/40 bg-success/10 text-success"
                      : providerBadge.badge === "fallback"
                        ? "border-warning/40 bg-warning/10 text-warning"
                        : "border-error/40 bg-error/10 text-error"
                  )}
                  title={`Fallback: ${providerBadge.summary?.fallbackCount ?? 0} · Errors: ${providerBadge.summary?.errorCount ?? 0}`}
                >
                  {providerBadge.badge}
                </span>
              )}
              <Button
                size="sm"
                variant={compactMode ? "secondary" : "outline"}
                className="h-8"
                onClick={() => setCompactMode((prev) => !prev)}
                title={tr("workspace.toggleCompactDensity", "Toggle compact density")}
              >
                <ChevronsUpDown className="mr-1 h-3.5 w-3.5" />
                {tr("workspace.compact", "Compact")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => setShowLeftPanel((prev) => !prev)}
                title={tr("workspace.toggleChatsShortcut", "Toggle chats (Ctrl/Cmd + B)")}
              >
                {showLeftPanel ? <PanelLeftClose className="h-3.5 w-3.5" /> : <PanelLeftOpen className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          <div
            className={cn(
              "flex flex-wrap gap-1.5 border-b border-border/80 pb-3 pt-1",
              lightInterface && "rounded-lg bg-[#EEF3FF] px-2"
            )}
          >
            {[
              { key: "darija", label: tr("common.darija", "Darija") },
                  { key: "ar", label: tr("common.arabic", "Arabic") },
                  { key: "fr", label: tr("common.french", "French") },
                  { key: "en", label: tr("common.english", "English") }
            ].map((lang) => (
              <Button
                key={lang.key}
                variant={selectedLanguage === lang.key ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedLanguage(lang.key)}
                className="h-8 px-3 text-xs"
              >
                {lang.label}
              </Button>
            ))}
            <div className="w-2" />
            {modes.map((mode) => (
              <Button
                key={mode.value}
                variant={selectedMode === mode.value ? "default" : lightInterface ? "outline" : "ghost"}
                size="sm"
                onClick={() => setSelectedMode(mode.value)}
                className="h-8 px-3 text-xs"
              >
                {mode.value === "general"
                  ? tr("workspace.mode.general", "General")
                  : mode.value === "support"
                    ? tr("workspace.mode.support", "Support")
                    : mode.value === "sales"
                      ? tr("workspace.mode.sales", "Sales")
                      : mode.value === "marketing"
                        ? tr("workspace.mode.marketing", "Marketing")
                        : tr("workspace.mode.tunisianAssistant", "Tunisian Assistant")}
              </Button>
            ))}
          </div>

          <div
            className={cn(
              "mt-3 flex-1 overflow-y-auto rounded-2xl pr-1.5",
              compactMode ? "space-y-2" : "space-y-3",
              lightInterface
                ? "border border-[#CBD7EE] bg-[#EEF3FF] p-2"
                : "border border-border/70 bg-background/25 p-2"
            )}
          >
            {messages.length <= 1 && (
              <div
                className={cn(
                  "grid gap-2 rounded-2xl border p-2 sm:grid-cols-3",
                  lightInterface ? "border-[#CBD7EE] bg-white/80" : "border-border/60 bg-surface/30"
                )}
              >
                {[
                  "Reply politely in Darija to delivery question",
                  "Write premium French customer follow-up",
                  "Translate this to Arabic formal style"
                ].map((starter) => (
                  <button
                    key={starter}
                    suppressHydrationWarning
                    onClick={() => setPrompt(starter)}
                    className={cn(
                      "premium-interactive rounded-xl border px-3 py-2 text-left text-xs transition-colors",
                      lightInterface
                        ? "border-[#CBD7EE] bg-[#F7FAFF] text-slate-600 hover:bg-white"
                        : "border-border bg-elevated/30 text-secondary hover:bg-elevated/50"
                    )}
                  >
                    {starter}
                  </button>
                ))}
              </div>
            )}

            {!messages.length && (
              <p className="rounded-lg border border-border/70 bg-elevated/25 p-3 text-sm text-muted">
                    {tr("workspace.emptyConversation", "Empty conversation. Write a prompt to start.")}
              </p>
            )}

            {messages.map((message) => (
              <article
                key={message.id}
                className={cn(
                  "max-w-[88%] rounded-2xl border px-3 py-2.5 text-sm leading-relaxed transition-colors",
                  compactMode && "max-w-[92%] px-2.5 py-2 text-[13px]",
                  message.role === "user"
                    ? lightInterface
                      ? "ml-auto border-accent/35 bg-[#E9FAFF] text-slate-900"
                      : "ml-auto border-accent/45 bg-accent/10 text-foreground shadow-[0_10px_20px_rgba(5,14,28,0.28)]"
                    : lightInterface
                      ? "border-[#CBD7EE] bg-white text-slate-900"
                      : "border-border/70 bg-surface/65"
                )}
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className={cn("text-[11px] uppercase tracking-wide", lightInterface ? "text-slate-500" : "text-muted")}>
                    {message.role === "user"
                      ? tr("common.you", "You")
                      : tr("common.sysnovaAi", "Sysnova AI")}
                  </p>
                  <p className={cn("text-[11px]", lightInterface ? "text-slate-500" : "text-muted")}>
                    {formatMessageTime(message.createdAt)}
                  </p>
                </div>
                <p className={cn("whitespace-pre-line", lightInterface ? "text-slate-700" : "text-secondary")}>
                  {message.content}
                </p>
                {message.role === "assistant" && (
                  <div className={cn("mt-2 flex flex-wrap gap-2", compactMode && "gap-1.5")}>
                    <Button
                      size="sm"
                      variant="outline"
                      className={cn("h-8", compactMode && "h-7 px-2 text-xs")}
                      onClick={() => {
                        void navigator.clipboard.writeText(message.content);
                      }}
                    >
                      <Copy className="mr-1 h-3.5 w-3.5" />
                          {tr("common.copy", "Copy")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className={cn("h-8", compactMode && "h-7 px-2 text-xs")}
                      disabled={actionLoadingMessageId === message.id}
                      onClick={() => void runAssistantAction(message.id, "regenerate")}
                    >
                      <RefreshCw className="mr-1 h-3.5 w-3.5" />
                          {actionLoadingMessageId === message.id
                            ? tr("common.working", "Working...")
                            : tr("common.regenerate", "Regenerate")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className={cn("h-8", compactMode && "h-7 px-2 text-xs")}
                      disabled={actionLoadingMessageId === message.id}
                      onClick={() => void runAssistantAction(message.id, "shorten")}
                    >
                      {tr("workspace.shorten", "Shorten")}
                    </Button>
                    <select
                      className={cn(
                        "h-8 rounded-md border border-border/70 bg-elevated/30 px-2 text-xs text-secondary",
                        compactMode && "h-7"
                      )}
                      disabled={actionLoadingMessageId === message.id}
                      defaultValue=""
                      onChange={(event) => {
                        const value = event.target.value as "translate" | "formal" | "";
                        if (!value) return;
                        void runAssistantAction(message.id, value);
                        event.currentTarget.value = "";
                      }}
                    >
                      <option value="">{tr("workspace.moreActions", "More actions")}</option>
                      <option value="translate">{tr("workspace.translate", "Translate")}</option>
                      <option value="formal">{tr("workspace.makeFormal", "Make Formal")}</option>
                    </select>
                  </div>
                )}
              </article>
            ))}

            {isGenerating && (
              <article
                className={cn(
                  "max-w-[88%] rounded-2xl border px-3 py-2.5 text-sm",
                  lightInterface ? "border-[#CBD7EE] bg-white text-slate-900" : "border-border/70 bg-surface/70"
                )}
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className={cn("text-[11px] uppercase tracking-wide", lightInterface ? "text-slate-500" : "text-muted")}>
                    {tr("common.sysnovaAi", "Sysnova AI")}
                  </p>
                  <p className={cn("text-[11px]", lightInterface ? "text-slate-500" : "text-muted")}>
                    {tr("workspace.typing", "typing...")}
                  </p>
                </div>
                <p className={cn("whitespace-pre-line", lightInterface ? "text-slate-700" : "text-secondary")}>
                      {streamingReply || tr("workspace.generatingResponse", "Generating response...")}
                </p>
              </article>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div
            className={cn(
              "sticky bottom-0 -mx-4 mt-3 border-t px-4 pb-3 pt-3 backdrop-blur-sm",
              lightInterface ? "border-[#CBD7EE] bg-[#F8FAFF]/96" : "border-border/80 bg-background/95"
            )}
          >
            <Textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={onPromptKeyDown}
                  placeholder={tr(
                    "workspace.promptPlaceholder",
                    "Write your prompt... e.g. Write a customer support reply in Darija and French."
                  )}
              className={cn(
                "min-h-[116px] text-[15px] leading-7",
                lightInterface
                  ? "border-[#CBD7EE] bg-white text-slate-900 placeholder:text-slate-400"
                  : "border-border/80 bg-surface/60"
              )}
            />
            <div className="mt-2 flex items-center justify-between">
              <div className="flex flex-wrap gap-1.5">
                {promptTemplates.slice(0, 3).map((template) => (
                  <button
                    key={template}
                    suppressHydrationWarning
                    onClick={() => setPrompt(template)}
                    className={cn(
                      "premium-interactive rounded-md border px-2 py-1 text-[11px]",
                      lightInterface
                        ? "border-[#CBD7EE] bg-white text-slate-600 hover:bg-[#EEF3FF]"
                        : "border-border/70 bg-elevated/25 text-secondary hover:bg-elevated/45"
                    )}
                  >
                    {template}
                  </button>
                ))}
              </div>
              <Button onClick={() => void onGenerate()} disabled={isGenerating} className="h-10 rounded-xl px-5">
                <WandSparkles className="mr-2 h-4 w-4" />
                    {isGenerating
                      ? tr("workspace.generating", "Generating...")
                      : tr("workspace.generate", "Generate")}
              </Button>
            </div>
          </div>
        </section>
       </div>
     </div>
   );
 }
