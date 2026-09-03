export type Actor = "human" | "agent" | "system";
export type ObjectType = "note" | "task" | "decision" | "group" | "heading";
export type RelationshipType = "depends_on" | "supports" | "blocks" | "related_to";
export type ApprovalStatus = "not_required" | "pending" | "approved" | "rejected";

export interface WorkspaceObject {
  id: string;
  type: ObjectType;
  title: string;
  content?: string;
  groupId?: string;
  x: number;
  y: number;
  width?: number;
  status?: "open" | "blocked" | "complete" | "unresolved" | "confirmed";
  priority?: "high" | "medium" | "low";
  confidence?: number;
  locked?: boolean;
  createdBy: Actor;
  modifiedBy: Actor;
  approval: ApprovalStatus;
  version: number;
}

export interface Connection {
  id: string;
  from: string;
  to: string;
  relationship: RelationshipType;
  createdBy: Actor;
}

export interface ActivityEvent {
  id: string;
  actor: Actor;
  text: string;
  at: string;
  objectIds?: string[];
}

export interface Proposal {
  id: string;
  contractId: string;
  title: string;
  summary: string;
  reason: string;
  changes: string[];
  objectIds: string[];
  citations: Array<{ label: string; objectId?: string }>;
  groundedOn: { evidenceObjectId: string; evidenceVersion: number; summary: string; at: string };
  confidence: number;
  status: "pending" | "stale" | "accepted" | "rejected";
  operations?: ProposalOperation[];
}

export type ProposalOperation =
  | { kind: "update"; id: string; patch: Partial<Pick<WorkspaceObject, "title" | "content" | "status" | "priority" | "confidence" | "approval">> }
  | { kind: "move"; id: string; x: number; y: number }
  | { kind: "group"; groupId: string; objectIds: string[] }
  | { kind: "transform"; id: string; type: ObjectType };

export interface WorkspaceState {
  id: string;
  name: string;
  objects: WorkspaceObject[];
  connections: Connection[];
  activity: ActivityEvent[];
  selectedId: string;
  agentStatus: "connected" | "working" | "waiting";
  permissions: Record<"read" | "create" | "modify" | "reorganize" | "connect" | "delete", boolean>;
  proposal?: Proposal;
  evidenceRecheck?: {
    evidenceObjectId: string;
    evidenceVersion: number;
    historyRead: boolean;
    objectsRead: boolean;
  };
}
