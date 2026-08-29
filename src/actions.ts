import type { Actor, Connection, Proposal, WorkspaceObject, WorkspaceState } from "./types";

const now = () => new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const eventId = () => `event-${crypto.randomUUID()}`;

const withEvent = (state: WorkspaceState, actor: Actor, text: string, objectIds?: string[]): WorkspaceState => ({
  ...state,
  activity: [...state.activity, { id: eventId(), actor, text, at: now(), objectIds }]
});

export const workspaceActions = {
  select: (state: WorkspaceState, id: string) => ({ ...state, selectedId: id }),
  updateObject: (state: WorkspaceState, id: string, patch: Partial<WorkspaceObject>, actor: Actor): WorkspaceState => {
    const target = state.objects.find((object) => object.id === id);
    if (!target) throw new Error(`Object '${id}' does not exist.`);
    if (target.locked && actor === "agent") throw new Error(`Object '${id}' is locked by a human and cannot be modified by the agent.`);
    if (actor === "agent" && !state.permissions.modify) throw new Error("The agent does not have modify permission.");
    const objects = state.objects.map((object) => object.id === id ? { ...object, ...patch, modifiedBy: actor, version: object.version + 1 } : object);
    return withEvent({ ...state, objects }, actor, `Updated ${target.title}`, [id]);
  },
  createObjects: (state: WorkspaceState, objects: Array<Omit<WorkspaceObject, "version" | "createdBy" | "modifiedBy">>, actor: Actor): WorkspaceState => {
    if (actor === "agent" && !state.permissions.create) throw new Error("The agent does not have create permission.");
    const created = objects.map((object) => ({ ...object, createdBy: actor, modifiedBy: actor, version: 1 }));
    return withEvent({ ...state, objects: [...state.objects, ...created] }, actor, `Created ${created.length} ${created.length === 1 ? "object" : "objects"}`, created.map((object) => object.id));
  },
  moveObjects: (state: WorkspaceState, moves: Array<{ id: string; x: number; y: number }>, actor: Actor): WorkspaceState => {
    if (actor === "agent" && !state.permissions.reorganize) throw new Error("The agent does not have reorganize permission.");
    const ids = new Set(moves.map((move) => move.id));
    for (const object of state.objects.filter((candidate) => ids.has(candidate.id))) {
      if (object.locked && actor === "agent") throw new Error(`Object '${object.title}' is locked by a human and cannot be moved by the agent.`);
    }
    const positions = new Map(moves.map((move) => [move.id, move]));
    const objects = state.objects.map((object) => {
      const move = positions.get(object.id);
      return move ? { ...object, x: move.x, y: move.y, modifiedBy: actor, version: object.version + 1 } : object;
    });
    return withEvent({ ...state, objects }, actor, `Moved ${moves.length} ${moves.length === 1 ? "object" : "objects"}`, moves.map((move) => move.id));
  },
  connect: (state: WorkspaceState, connection: Omit<Connection, "id" | "createdBy">, actor: Actor): WorkspaceState => {
    if (actor === "agent" && !state.permissions.connect) throw new Error("The agent does not have connection permission.");
    if (!state.objects.some((object) => object.id === connection.from) || !state.objects.some((object) => object.id === connection.to)) throw new Error("Both objects in a connection must exist.");
    const next = { ...connection, id: crypto.randomUUID(), createdBy: actor };
    return withEvent({ ...state, connections: [...state.connections, next] }, actor, "Created a dependency", [connection.from, connection.to]);
  },
  propose: (state: WorkspaceState, proposal: Proposal): WorkspaceState => withEvent({ ...state, proposal, agentStatus: "waiting" }, "agent", `Proposed ${proposal.changes.length} changes`, proposal.objectIds),
  acceptProposal: (state: WorkspaceState): WorkspaceState => {
    if (!state.proposal || state.proposal.status !== "pending") return state;
    const objects = state.objects.map((object) => object.id === "launch-date" ? { ...object, content: "October 21", status: "confirmed" as const, confidence: 100, approval: "approved" as const, modifiedBy: "human" as const, version: object.version + 1 } : object);
    return withEvent({ ...state, objects, proposal: { ...state.proposal, status: "accepted" }, agentStatus: "connected" }, "human", "Accepted the launch plan", ["launch-date"]);
  },
  rejectProposal: (state: WorkspaceState): WorkspaceState => !state.proposal ? state : withEvent({ ...state, proposal: { ...state.proposal, status: "rejected" }, agentStatus: "connected" }, "human", "Rejected the proposed launch change", state.proposal.objectIds),
  organizeAurora: (state: WorkspaceState): WorkspaceState => withEvent({ ...state, agentStatus: "waiting" }, "agent", "Organized the launch roadmap and paused for a decision", ["launch-date", "beta-feedback"])
};
