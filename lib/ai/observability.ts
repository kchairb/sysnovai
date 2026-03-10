import { randomUUID } from "crypto";
import { type RagTrace, type TraceEvent } from "@/lib/ai/types";

export function createTrace(): RagTrace {
  return {
    traceId: randomUUID(),
    events: []
  };
}

export function addTraceEvent(trace: RagTrace, event: Omit<TraceEvent, "at">): void {
  trace.events.push({
    ...event,
    at: new Date().toISOString()
  });
}

export function flushTrace(trace: RagTrace): void {
  // Lightweight server-side tracing for MVP observability.
  console.info("[sysnova-ai-trace]", JSON.stringify(trace));
}
