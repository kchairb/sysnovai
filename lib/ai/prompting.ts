import { type PromptTemplate, type RagRequest, type RetrievedContext } from "@/lib/ai/types";
import {
  getCoreSystemPrompt,
  getLanguageInstruction,
  getModeTemplate
} from "@/lib/ai/prompts/mode-templates";

export function buildRagPrompt(input: RagRequest, context: RetrievedContext): string {
  const modeTemplate = getModeTemplate(input.mode);
  const languageInstruction = getLanguageInstruction(input.language);
  return [
    getCoreSystemPrompt(),
    modeTemplate.style,
    languageInstruction,
    modeTemplate.modeTask ? `Mode task: ${modeTemplate.modeTask}` : "",
    modeTemplate.modePriority ? `Mode priority: ${modeTemplate.modePriority}` : "",
    `Constraints: ${modeTemplate.constraints.join(" | ")}`,
    `Output format: ${modeTemplate.outputFormat}`,
    `Workspace: ${input.workspaceId}`,
    `User message: ${input.message}`,
    `FAQ context: ${context.faqs.join(" | ")}`,
    `Policy context: ${context.policies.join(" | ")}`,
    `Product context: ${context.products.join(" | ")}`,
    `Document context: ${context.documents.join(" | ")}`
  ].join("\n");
}

export function buildPromptTemplate(
  input: RagRequest,
  context: RetrievedContext
): PromptTemplate {
  const modeTemplate = getModeTemplate(input.mode);
  const languageInstruction = getLanguageInstruction(input.language);

  const system = [
    getCoreSystemPrompt(),
    modeTemplate.style,
    languageInstruction,
    modeTemplate.modeTask ? `Mode task: ${modeTemplate.modeTask}` : "",
    modeTemplate.modePriority ? `Mode priority: ${modeTemplate.modePriority}` : "",
    `Constraints: ${modeTemplate.constraints.join(" | ")}`,
    `Output format: ${modeTemplate.outputFormat}`,
    "Be accurate, concise, and practical.",
    "Use provided context and avoid fabricating company details.",
    input.mode === "tunisian-assistant"
      ? "In Tunisian Assistant mode, answer broadly using real-world practical knowledge for Tunisia life/culture. Use workspace products only if user intent is shopping/business."
      : ""
  ].join("\n");

  const user = [
    `Workspace ID: ${input.workspaceId}`,
    `Mode: ${input.mode}`,
    `Language: ${input.language}`,
    `Message: ${input.message}`,
    `FAQs: ${context.faqs.join(" | ")}`,
    `Policies: ${context.policies.join(" | ")}`,
    `Products: ${context.products.join(" | ")}`,
    `Documents: ${context.documents.join(" | ")}`
  ].join("\n");

  return { system, user };
}
