export async function generateMarketingContent(payload: {
  product: string;
  audience: string;
  language: string;
  tone: string;
  format: string;
}) {
  const response = await fetch("/api/marketing/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error("Failed to generate marketing content");
  }
  return (await response.json()) as { output: string };
}

export async function chatWithTunisianAssistant(payload: {
  message: string;
  language: string;
}) {
  const response = await fetch("/api/tunisian-assistant/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error("Failed to chat with Tunisian assistant");
  }
  return (await response.json()) as { answer: string };
}
