import type { Actor, Connection, ObjectType, Proposal, ProposalOperation, WorkspaceObject, WorkspaceState } from "./types";

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
  moveObjects: (state: WorkspaceState, moves: Array<{ id: string; x: number; y: number }>, actor: Actor, ungroup = false): WorkspaceState => {
    if (actor === "agent" && !state.permissions.reorganize) throw new Error("The agent does not have reorganize permission.");
    const ids = new Set(moves.map((move) => move.id));
    for (const object of state.objects.filter((candidate) => ids.has(candidate.id))) {
      if (object.locked && actor === "agent") throw new Error(`Object '${object.title}' is locked by a human and cannot be moved by the agent.`);
    }
    const positions = new Map(moves.map((move) => [move.id, move]));
    const objects = state.objects.map((object) => {
      const move = positions.get(object.id);
      return move ? { ...object, x: move.x, y: move.y, ...(ungroup ? { groupId: undefined } : {}), modifiedBy: actor, version: object.version + 1 } : object;
    });
    return withEvent({ ...state, objects }, actor, `${ungroup ? "Pulled" : "Moved"} ${moves.length} ${moves.length === 1 ? "object" : "objects"}`, moves.map((move) => move.id));
  },
  groupObjects: (state: WorkspaceState, groupId: string, objectIds: string[], actor: Actor): WorkspaceState => {
    if (actor === "agent" && !state.permissions.reorganize) throw new Error("The agent does not have reorganize permission.");
    const group = state.objects.find((object) => object.id === groupId && object.type === "group");
    if (!group) throw new Error(`Group '${groupId}' does not exist.`);
    const uniqueIds = [...new Set(objectIds)].filter((id) => id !== groupId);
    if (!uniqueIds.length) throw new Error("Choose at least one object to group.");
    for (const id of uniqueIds) {
      const object = state.objects.find((candidate) => candidate.id === id);
      if (!object) throw new Error(`Object '${id}' does not exist.`);
      if (actor === "agent" && object.locked) throw new Error(`Object '${object.title}' is locked by a human and cannot be regrouped by the agent.`);
    }
    const ids = new Set(uniqueIds);
    const objects = state.objects.map((object) => ids.has(object.id) ? { ...object, groupId, modifiedBy: actor, version: object.version + 1 } : object);
    return withEvent({ ...state, objects }, actor, `Grouped ${uniqueIds.length} objects under ${group.title}`, uniqueIds);
  },
  transformObjects: (state: WorkspaceState, transforms: Array<{ id: string; type: ObjectType }>, actor: Actor): WorkspaceState => {
    if (actor === "agent" && !state.permissions.modify) throw new Error("The agent does not have modify permission.");
    const ids = new Set(transforms.map((transform) => transform.id));
    for (const object of state.objects.filter((candidate) => ids.has(candidate.id))) {
      if (object.locked && actor === "agent") throw new Error(`Object '${object.title}' is locked by a human and cannot be transformed by the agent.`);
    }
    const changed = new Map(transforms.map((transform) => [transform.id, transform.type]));
    const objects = state.objects.map((object) => changed.has(object.id) ? { ...object, type: changed.get(object.id)!, modifiedBy: actor, version: object.version + 1 } : object);
    return withEvent({ ...state, objects }, actor, `Transformed ${transforms.length} ${transforms.length === 1 ? "object" : "objects"}`, transforms.map((transform) => transform.id));
  },
  connect: (state: WorkspaceState, connection: Omit<Connection, "id" | "createdBy">, actor: Actor): WorkspaceState => {
    if (actor === "agent" && !state.permissions.connect) throw new Error("The agent does not have connection permission.");
    if (!state.objects.some((object) => object.id === connection.from) || !state.objects.some((object) => object.id === connection.to)) throw new Error("Both objects in a connection must exist.");
    const next = { ...connection, id: crypto.randomUUID(), createdBy: actor };
    return withEvent({ ...state, connections: [...state.connections, next] }, actor, "Created a dependency", [connection.from, connection.to]);
  },
  propose: (state: WorkspaceState, proposal: Proposal): WorkspaceState => withEvent({ ...state, proposal, agentStatus: "waiting" }, "agent", `Proposed ${proposal.changes.length} changes`, proposal.objectIds),
  markProposalStale: (state: WorkspaceState, objectId: string): WorkspaceState => {
    if (!state.proposal || state.proposal.status !== "pending" || !state.proposal.objectIds.includes(objectId)) return state;
    return withEvent({ ...state, proposal: { ...state.proposal, status: "stale" }, agentStatus: "waiting" }, "system", "Human evidence changed; the prior agent proposal is stale", [objectId, ...state.proposal.objectIds]);
  },
  proposeEvidenceRecheck: (state: WorkspaceState): WorkspaceState => {
    const beta = state.objects.find((object) => object.id === "beta-feedback");
    const proposal: Proposal = {
      id: "aurora-evidence-recheck", title: "Re-check launch after beta evidence", summary: "October 14 → October 28", reason: `The human updated Beta feedback to “${beta?.content ?? "new evidence"}.” A later date protects time to resolve the reported onboarding regressions.`, changes: ["Move launch date to October 28", "Schedule onboarding regression review", "Keep beta evidence attached to the decision"], objectIds: ["launch-date", "beta-feedback", "fix-signup"], confidence: 93, status: "pending",
      operations: [{ kind: "update", id: "launch-date", patch: { content: "October 28", status: "confirmed", confidence: 93, approval: "approved" } }]
    };
    return workspaceActions.propose(state, proposal);
  },
  acceptProposal: (state: WorkspaceState): WorkspaceState => {
    if (!state.proposal || state.proposal.status !== "pending") return state;
    const defaultOperations: ProposalOperation[] = [{ kind: "update", id: "launch-date", patch: { content: "October 21", status: "confirmed", confidence: 100, approval: "approved" } }];
    const operations = state.proposal.operations?.length ? state.proposal.operations : defaultOperations;
    let next = state;
    for (const operation of operations) {
      if (operation.kind === "update") next = workspaceActions.updateObject(next, operation.id, operation.patch, "human");
      if (operation.kind === "move") next = workspaceActions.moveObjects(next, [{ id: operation.id, x: operation.x, y: operation.y }], "human");
      if (operation.kind === "group") next = workspaceActions.groupObjects(next, operation.groupId, operation.objectIds, "human");
      if (operation.kind === "transform") next = workspaceActions.transformObjects(next, [{ id: operation.id, type: operation.type }], "human");
    }
    return withEvent({ ...next, proposal: { ...state.proposal, status: "accepted" }, agentStatus: "connected" }, "human", `Accepted ${state.proposal.title}`, state.proposal.objectIds);
  },
  rejectProposal: (state: WorkspaceState): WorkspaceState => !state.proposal ? state : withEvent({ ...state, proposal: { ...state.proposal, status: "rejected" }, agentStatus: "connected" }, "human", "Rejected the proposed launch change", state.proposal.objectIds),
  organizeAurora: (state: WorkspaceState): WorkspaceState => withEvent({ ...state, agentStatus: "waiting" }, "agent", "Organized the launch roadmap and paused for a decision", ["launch-date", "beta-feedback"])
};
