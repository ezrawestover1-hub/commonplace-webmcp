import type { Dispatch, SetStateAction } from "react";
import { workspaceActions } from "./actions";
import type { Proposal, ProposalOperation, WorkspaceState } from "./types";

type Tool = { name: string; description: string; inputSchema: Record<string, unknown>; annotations?: Record<string, unknown>; execute: (input: any, options?: { signal?: AbortSignal }) => Promise<unknown> | unknown };
type ModelContextDocument = Document & { modelContext?: { registerTool: (tool: Tool, options?: { signal?: AbortSignal }) => Promise<void> } };
export type ToolTraceEvent = { id: string; tool: string; summary: string; objectIds?: string[]; at: string; outcome: "success" | "error"; source: "native" | "demo" | "human" };
export type WebMCPRegistration = { supported: boolean; toolCount: number; cleanup: () => void; ready: Promise<{ state: "ready" | "failed" | "unsupported"; registered: number; failedTools: string[] }> };

const schema = (properties: Record<string, unknown>, required: string[] = []) => ({ type: "object", properties, required, additionalProperties: false });
const evidenceId = "beta-feedback";
const decisionId = "launch-date";
const blockerId = "fix-signup";
const relevantIds = [evidenceId, decisionId, blockerId];
const traceIds = (input: unknown): string[] | undefined => {
  if (!input || typeof input !== "object") return undefined;
  const value = input as { objectIds?: unknown; decisionId?: unknown };
  const ids = [...(Array.isArray(value.objectIds) ? value.objectIds : []), value.decisionId].filter((id): id is string => typeof id === "string");
  return ids.length ? [...new Set(ids)] : undefined;
};

export function registerCommonplaceTools(getState: () => WorkspaceState, setState: Dispatch<SetStateAction<WorkspaceState>>, onTrace?: (event: ToolTraceEvent) => void): WebMCPRegistration {
  const context = (document as ModelContextDocument).modelContext;
  if (typeof context?.registerTool !== "function") return { supported: false, toolCount: 0, cleanup: () => undefined, ready: Promise.resolve({ state: "unsupported", registered: 0, failedTools: [] }) };
  const controller = new AbortController();
  const update = (work: (current: WorkspaceState) => WorkspaceState) => setState((current) => work(current));
  const decisionContext = (state: WorkspaceState) => {
    const proposal = state.proposal;
    const evidence = state.objects.find((object) => object.id === evidenceId);
    const decision = state.objects.find((object) => object.id === decisionId);
    const blocker = state.objects.find((object) => object.id === blockerId);
    return {
      decision: { id: decisionId, question: "Should Project Aurora launch October 14?", currentValue: decision?.content, authority: proposal?.status === "accepted" ? "human_confirmed" : "human_required" },
      evidence: { id: evidenceId, version: evidence?.version, content: evidence?.content, changedAfterProposal: proposal?.status === "stale" },
      blocker: { id: blockerId, title: blocker?.title, status: blocker?.status },
      proposal: proposal ? { id: proposal.id, contractId: proposal.contractId, status: proposal.status, summary: proposal.summary, groundedOn: proposal.groundedOn, citations: proposal.citations } : null,
      requiredAgentPath: proposal?.status === "stale" ? ["get_decision_history", "get_evidence_objects", "propose_decision_update"] : null
    };
  };
  const tools: Tool[] = [
    { name: "get_decision_context", description: "Read Project Aurora's current decision, authority boundary, active proposal, evidence version, and blocking dependency.", inputSchema: schema({}), annotations: { readOnlyHint: true }, execute: async () => decisionContext(getState()) },
    {
      name: "get_evidence_changes", description: "Read whether human evidence changed after the active proposal and which evidence version invalidated it.", inputSchema: schema({}), annotations: { readOnlyHint: true },
      execute: async () => { const state = getState(); const evidence = state.objects.find((object) => object.id === evidenceId); const proposal = state.proposal; return { proposalId: proposal?.contractId, proposalStatus: proposal?.status, originallyGroundedOn: proposal?.groundedOn, currentEvidence: { id: evidenceId, version: evidence?.version, content: evidence?.content }, invalidated: proposal?.status === "stale", requiredNextStep: proposal?.status === "stale" ? "Read decision history and evidence objects before proposing again." : null }; }
    },
    {
      name: "get_evidence_objects", description: "Read the exact current Beta evidence, launch decision, and signup blocker that a replacement recommendation must cite.", inputSchema: schema({ objectIds: { type: "array", items: { type: "string", enum: relevantIds }, description: "Optional subset of the decision evidence. Defaults to all required objects." } }), annotations: { readOnlyHint: true },
      execute: async (input) => { const objectIds = Array.isArray(input.objectIds) && input.objectIds.length ? input.objectIds : relevantIds; const state = getState(); const objects = state.objects.filter((object) => objectIds.includes(object.id)); update((current) => workspaceActions.recordEvidenceRecheck(current, "objects", objectIds)); return { objects, citationsRequired: ["Beta feedback v5", "Fix signup bug", "Human update at 10:12 AM"] }; }
    },
    {
      name: "propose_decision_update", description: "Create a cited, non-canonical launch recommendation. If a human update invalidated an earlier proposal, this only succeeds after the required re-grounding reads.", inputSchema: schema({ contractId: { type: "string", description: "Human-readable proposal identifier, such as P-015." }, summary: { type: "string", description: "Proposed launch-date change." }, reason: { type: "string", description: "Concise evidence-grounded recommendation." }, changes: { type: "array", items: { type: "string" }, minItems: 1 }, confidence: { type: "number", minimum: 0, maximum: 100 } }, ["contractId", "summary", "reason", "changes", "confidence"]),
      execute: async (input) => { const state = getState(); const evidence = state.objects.find((object) => object.id === evidenceId); const proposal: Proposal = { id: `aurora-${String(input.contractId).toLowerCase()}`, contractId: input.contractId, title: "Launch decision update", summary: input.summary, reason: input.reason, changes: input.changes, objectIds: relevantIds, citations: [{ label: `Beta feedback v${evidence?.version ?? 0}`, objectId: evidenceId }, { label: "Fix signup bug", objectId: blockerId }, { label: "Human update at 10:12 AM" }], groundedOn: { evidenceObjectId: evidenceId, evidenceVersion: evidence?.version ?? 0, summary: evidence?.content ?? "Evidence unavailable", at: "10:12 AM" }, confidence: input.confidence, status: "pending", operations: [{ kind: "update", id: decisionId, patch: { content: "October 28", status: "confirmed", confidence: input.confidence, approval: "approved" } }] as ProposalOperation[] }; update((current) => workspaceActions.propose(current, proposal)); return { ok: true, contractId: input.contractId, status: "pending_human_confirmation", note: "The proposed date is reviewable, cited, and non-canonical until a human confirms it." }; }
    },
    {
      name: "request_human_confirmation", description: "Hand the cited proposal to the designated human decision owner. This cannot confirm or change the canonical launch date.", inputSchema: schema({ contractId: { type: "string" }, prompt: { type: "string" } }, ["contractId", "prompt"]),
      execute: async (input) => { const proposal = getState().proposal; if (!proposal || proposal.contractId !== input.contractId || proposal.status !== "pending") throw new Error("Only the current fresh proposal can be handed to the human decision owner."); return { ok: true, contractId: proposal.contractId, status: "waiting_for_human", authority: "human_required", prompt: input.prompt }; }
    },
    {
      name: "get_decision_history", description: "Read the attributable decision history, including the human evidence change that can revoke an agent proposal.", inputSchema: schema({}), annotations: { readOnlyHint: true },
      execute: async () => { const state = getState(); update((current) => workspaceActions.recordEvidenceRecheck(current, "history", [evidenceId])); return state.activity.filter((entry) => !entry.objectIds?.length || entry.objectIds.includes(evidenceId) || entry.objectIds.includes(decisionId)).slice(-20); }
    }
  ];
  const tracedTools = tools.map((tool) => ({ ...tool, execute: async (input: unknown, options?: { signal?: AbortSignal }) => { try { if (options?.signal?.aborted) throw new DOMException("WebMCP tool execution was cancelled.", "AbortError"); const result = await tool.execute(input, options); onTrace?.({ id: `tool-${Date.now()}-${tool.name}`, tool: tool.name, summary: tool.description, objectIds: traceIds(input), at: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" }), outcome: "success", source: "native" }); return result; } catch (error) { onTrace?.({ id: `tool-${Date.now()}-${tool.name}`, tool: tool.name, summary: error instanceof Error ? error.message : "The tool could not complete this request.", objectIds: traceIds(input), at: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" }), outcome: "error", source: "native" }); throw error; } } }));
  const ready = Promise.allSettled(tracedTools.map((tool) => context.registerTool(tool, { signal: controller.signal }))).then((results) => { const failedTools = results.flatMap((result, index) => result.status === "rejected" ? [tracedTools[index].name] : []); return failedTools.length ? { state: "failed" as const, registered: tools.length - failedTools.length, failedTools } : { state: "ready" as const, registered: tools.length, failedTools }; });
  return { supported: true, toolCount: tools.length, cleanup: () => controller.abort(), ready };
}
