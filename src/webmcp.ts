import type { Dispatch, SetStateAction } from "react";
import { workspaceActions } from "./actions";
import type { Proposal, ProposalOperation, WorkspaceObject, WorkspaceState } from "./types";

type Tool = { name: string; description: string; inputSchema: Record<string, unknown>; annotations?: Record<string, unknown>; execute: (input: any, options?: { signal?: AbortSignal }) => Promise<unknown> | unknown };
type ModelContextDocument = Document & { modelContext?: { registerTool: (tool: Tool, options?: { signal?: AbortSignal }) => Promise<void> } };
export type ToolTraceEvent = { id: string; tool: string; summary: string; objectIds?: string[]; at: string; outcome: "success" | "error" };
export type WebMCPRegistration = { supported: boolean; toolCount: number; cleanup: () => void; ready: Promise<{ state: "ready" | "failed" | "unsupported"; registered: number; failedTools: string[] }> };

const schema = (properties: Record<string, unknown>, required: string[] = []) => ({ type: "object", properties, required, additionalProperties: false });
const ids = (state: WorkspaceState, objectIds?: string[]) => objectIds?.length ? state.objects.filter((object) => objectIds.includes(object.id)) : state.objects;

export function registerCommonplaceTools(getState: () => WorkspaceState, setState: Dispatch<SetStateAction<WorkspaceState>>, onTrace?: (event: ToolTraceEvent) => void): WebMCPRegistration {
  const context = (document as ModelContextDocument).modelContext;
  if (typeof context?.registerTool !== "function") return { supported: false, toolCount: 0, cleanup: () => undefined, ready: Promise.resolve({ state: "unsupported", registered: 0, failedTools: [] }) };
  const controller = new AbortController();
  const update = (work: (current: WorkspaceState) => WorkspaceState) => setState((current) => work(current));
  const tools: Tool[] = [
    {
      name: "inspect_workspace",
      description: "Read concise workspace metadata, agent permissions, groups, object counts, and the current human selection.",
      inputSchema: schema({}), annotations: { readOnlyHint: true },
      execute: async () => { const state = getState(); return { name: state.name, objectCount: state.objects.length, selectedObjectId: state.selectedId, groups: state.objects.filter((item) => item.type === "group").map((item) => item.title), permissions: state.permissions, agentStatus: state.agentStatus }; }
    },
    {
      name: "search_objects",
      description: "Find workspace objects by text, semantic type, status, or group. Returns only structured workspace data.",
      inputSchema: schema({ query: { type: "string", description: "Optional text to match in title or content." }, type: { type: "string", enum: ["note", "task", "decision", "group", "heading"] }, groupId: { type: "string" }, status: { type: "string" } }), annotations: { readOnlyHint: true },
      execute: async (input) => { const state = getState(); const query = String(input.query ?? "").toLowerCase(); return state.objects.filter((item) => (!query || `${item.title} ${item.content ?? ""}`.toLowerCase().includes(query)) && (!input.type || item.type === input.type) && (!input.groupId || item.groupId === input.groupId) && (!input.status || item.status === input.status)).slice(0, 25); }
    },
    {
      name: "get_objects",
      description: "Read detailed semantic state for specific Commonplace objects, including provenance, locking, approval, and relationships.",
      inputSchema: schema({ objectIds: { type: "array", items: { type: "string" }, description: "Object IDs to retrieve. Omit for a concise workspace list." } }), annotations: { readOnlyHint: true },
      execute: async (input) => { const state = getState(); const objects = ids(state, input.objectIds); return { objects, connections: state.connections.filter((connection) => objects.some((item) => item.id === connection.from || item.id === connection.to)) }; }
    },
    {
      name: "create_objects",
      description: "Create semantic workspace objects. This changes the shared canvas and is attributed to the agent.",
      inputSchema: schema({ objects: { type: "array", minItems: 1, maxItems: 20, items: { type: "object", properties: { id: { type: "string" }, type: { type: "string", enum: ["note", "task", "decision", "group", "heading"] }, title: { type: "string" }, content: { type: "string" }, groupId: { type: "string" }, x: { type: "number" }, y: { type: "number" }, priority: { type: "string", enum: ["high", "medium", "low"] } }, required: ["id", "type", "title", "x", "y"], additionalProperties: false } } }, ["objects"]),
      execute: async (input) => { update((state) => workspaceActions.createObjects(state, input.objects as Omit<WorkspaceObject, "version" | "createdBy" | "modifiedBy">[], "agent")); return { ok: true, created: input.objects.map((item: WorkspaceObject) => item.id) }; }
    },
    {
      name: "update_objects",
      description: "Update titles, content, status, priority, or confidence for existing unlocked objects. This changes shared workspace state.",
      inputSchema: schema({ updates: { type: "array", minItems: 1, maxItems: 20, items: { type: "object", properties: { id: { type: "string" }, title: { type: "string" }, content: { type: "string" }, status: { type: "string", enum: ["open", "blocked", "complete", "unresolved", "confirmed"] }, priority: { type: "string", enum: ["high", "medium", "low"] }, confidence: { type: "number", minimum: 0, maximum: 100 } }, required: ["id"], additionalProperties: false } } }, ["updates"]),
      execute: async (input) => { update((state) => input.updates.reduce((next: WorkspaceState, change: Partial<WorkspaceObject> & { id: string }) => workspaceActions.updateObject(next, change.id, change, "agent"), state)); return { ok: true, updated: input.updates.map((item: { id: string }) => item.id) }; }
    },
    {
      name: "move_objects",
      description: "Move unlocked objects to explicit canvas coordinates. This changes the human-visible layout using the shared action layer.",
      inputSchema: schema({ moves: { type: "array", minItems: 1, maxItems: 40, items: { type: "object", properties: { id: { type: "string" }, x: { type: "number" }, y: { type: "number" } }, required: ["id", "x", "y"], additionalProperties: false } } }, ["moves"]),
      execute: async (input) => { update((state) => workspaceActions.moveObjects(state, input.moves, "agent")); return { ok: true, moved: input.moves.map((item: { id: string }) => item.id) }; }
    },
    {
      name: "group_objects",
      description: "Place existing unlocked objects into an existing semantic group. This updates the shared visual and semantic workspace together.",
      inputSchema: schema({ groupId: { type: "string", description: "Existing group object ID." }, objectIds: { type: "array", minItems: 1, maxItems: 40, items: { type: "string" }, description: "Objects to place in that group." } }, ["groupId", "objectIds"]),
      execute: async (input) => { update((state) => workspaceActions.groupObjects(state, input.groupId, input.objectIds, "agent")); return { ok: true, groupId: input.groupId, grouped: input.objectIds }; }
    },
    {
      name: "transform_objects",
      description: "Change the semantic type of existing unlocked objects, for example turning a note into a task or decision. This updates the same cards the human sees.",
      inputSchema: schema({ transforms: { type: "array", minItems: 1, maxItems: 20, items: { type: "object", properties: { id: { type: "string" }, type: { type: "string", enum: ["note", "task", "decision", "group", "heading"] } }, required: ["id", "type"], additionalProperties: false } } }, ["transforms"]),
      execute: async (input) => { update((state) => workspaceActions.transformObjects(state, input.transforms, "agent")); return { ok: true, transformed: input.transforms.map((item: { id: string }) => item.id) }; }
    },
    {
      name: "connect_objects",
      description: "Create a named semantic relationship between two existing workspace objects. This changes the shared canvas.",
      inputSchema: schema({ from: { type: "string" }, to: { type: "string" }, relationship: { type: "string", enum: ["depends_on", "supports", "blocks", "related_to"] } }, ["from", "to", "relationship"]),
      execute: async (input) => { update((state) => workspaceActions.connect(state, input, "agent")); return { ok: true, connection: input }; }
    },
    {
      name: "propose_changes",
      description: "Create a reviewable, non-canonical change proposal. The human must accept or reject it in the interface before it becomes a decision.",
      inputSchema: schema({ id: { type: "string" }, title: { type: "string" }, summary: { type: "string" }, reason: { type: "string" }, changes: { type: "array", items: { type: "string" }, minItems: 1 }, objectIds: { type: "array", items: { type: "string" }, minItems: 1 }, confidence: { type: "number", minimum: 0, maximum: 100 }, operations: { type: "array", description: "Optional structured operations that are applied only after the human accepts.", items: { type: "object" } } }, ["id", "title", "summary", "reason", "changes", "objectIds", "confidence"]),
      execute: async (input) => { const proposal: Proposal = { ...input, operations: input.operations as ProposalOperation[] | undefined, status: "pending" }; update((state) => workspaceActions.propose(state, proposal)); return { ok: true, proposalId: input.id, status: "pending", note: "The proposal is visible to the human and is not yet canonical workspace state." }; }
    },
    {
      name: "request_human_decision",
      description: "Ask the human to resolve an explicit decision without guessing. Creates or updates a decision object and leaves authority with the human.",
      inputSchema: schema({ objectId: { type: "string" }, prompt: { type: "string" }, options: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 }, confidence: { type: "number", minimum: 0, maximum: 100 } }, ["objectId", "prompt", "options"]),
      execute: async (input) => { update((state) => workspaceActions.updateObject(state, input.objectId, { content: input.prompt, status: "unresolved", confidence: input.confidence ?? 0, approval: "pending" }, "agent")); return { ok: true, objectId: input.objectId, status: "waiting_for_human", options: input.options }; }
    },
    {
      name: "get_history",
      description: "Read the concise, attributable Commonplace activity history for the workspace or specified objects.",
      inputSchema: schema({ objectIds: { type: "array", items: { type: "string" } } }), annotations: { readOnlyHint: true },
      execute: async (input) => { const state = getState(); return state.activity.filter((entry) => !input.objectIds?.length || entry.objectIds?.some((id: string) => input.objectIds.includes(id))).slice(-30); }
    }
  ];
  const tracedTools = tools.map((tool) => ({
    ...tool,
    execute: async (input: unknown, options?: { signal?: AbortSignal }) => {
      try {
        if (options?.signal?.aborted) throw new DOMException("WebMCP tool execution was cancelled.", "AbortError");
        const result = await tool.execute(input, options);
        const objectIds = Array.isArray((input as { objectIds?: unknown })?.objectIds) ? (input as { objectIds: string[] }).objectIds : undefined;
        onTrace?.({ id: `tool-${Date.now()}-${tool.name}`, tool: tool.name, summary: tool.description, objectIds, at: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" }), outcome: "success" });
        return result;
      } catch (error) {
        onTrace?.({ id: `tool-${Date.now()}-${tool.name}`, tool: tool.name, summary: error instanceof Error ? error.message : "The tool could not complete this request.", at: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" }), outcome: "error" });
        throw error;
      }
    }
  }));
  const ready = Promise.allSettled(tracedTools.map((tool) => context.registerTool(tool, { signal: controller.signal }))).then((results) => {
    const failedTools = results.flatMap((result, index) => result.status === "rejected" ? [tracedTools[index].name] : []);
    return failedTools.length ? { state: "failed" as const, registered: tools.length - failedTools.length, failedTools } : { state: "ready" as const, registered: tools.length, failedTools };
  });
  return { supported: true, toolCount: tools.length, cleanup: () => controller.abort(), ready };
}
