import type { WorkspaceState } from "./types";

const event = (id: string, actor: "human" | "agent" | "system", text: string, at: string, objectIds?: string[]) => ({ id, actor, text, at, objectIds });

export const createAuroraWorkspace = (): WorkspaceState => ({
  id: "aurora-launch",
  name: "Project Aurora Launch",
  selectedId: "launch-date",
  agentStatus: "connected",
  permissions: { read: true, create: true, modify: true, reorganize: true, connect: true, delete: false },
  objects: [
    { id: "product", type: "group", title: "Product", x: 86, y: 110, width: 286, createdBy: "agent", modifiedBy: "agent", approval: "approved", version: 1 },
    { id: "research", type: "group", title: "Research", x: 610, y: 110, width: 286, createdBy: "agent", modifiedBy: "agent", approval: "approved", version: 1 },
    { id: "marketing", type: "group", title: "Marketing", x: 86, y: 405, width: 286, createdBy: "agent", modifiedBy: "agent", approval: "approved", version: 1 },
    { id: "operations", type: "group", title: "Operations", x: 610, y: 405, width: 286, createdBy: "agent", modifiedBy: "agent", approval: "approved", version: 1 },
    { id: "fix-signup", type: "task", title: "Fix signup bug", groupId: "product", x: 104, y: 174, status: "blocked", priority: "high", createdBy: "human", modifiedBy: "agent", approval: "not_required", version: 2 },
    { id: "onboarding", type: "task", title: "Improve onboarding", groupId: "product", x: 104, y: 242, priority: "high", createdBy: "human", modifiedBy: "agent", approval: "not_required", version: 2 },
    { id: "analytics", type: "task", title: "Set up analytics", groupId: "product", x: 104, y: 310, priority: "medium", createdBy: "human", modifiedBy: "agent", approval: "not_required", version: 2 },
    { id: "beta-feedback", type: "note", title: "Beta feedback", content: "42 responses", groupId: "research", x: 568, y: 174, createdBy: "human", modifiedBy: "agent", approval: "not_required", version: 4 },
    { id: "interviews", type: "note", title: "Customer interviews", content: "18 interviews", groupId: "research", x: 568, y: 242, createdBy: "human", modifiedBy: "agent", approval: "not_required", version: 2 },
    { id: "beta-group", type: "task", title: "Beta group: 50", groupId: "research", x: 568, y: 310, priority: "medium", createdBy: "human", modifiedBy: "agent", approval: "not_required", version: 2 },
    { id: "landing", type: "task", title: "Landing page", groupId: "marketing", x: 104, y: 510, priority: "high", createdBy: "human", modifiedBy: "agent", approval: "not_required", version: 2 },
    { id: "demo-video", type: "task", title: "Demo video", content: "90 sec", groupId: "marketing", x: 104, y: 578, priority: "high", createdBy: "human", modifiedBy: "agent", approval: "not_required", version: 2 },
    { id: "waitlist", type: "task", title: "Email waitlist", groupId: "marketing", x: 104, y: 646, priority: "medium", createdBy: "human", modifiedBy: "agent", approval: "not_required", version: 2 },
    { id: "support", type: "task", title: "Support email", groupId: "operations", x: 568, y: 510, priority: "medium", createdBy: "human", modifiedBy: "agent", approval: "not_required", version: 2 },
    { id: "legal", type: "task", title: "Legal review", groupId: "operations", x: 568, y: 578, priority: "medium", createdBy: "human", modifiedBy: "agent", approval: "not_required", version: 2 },
    { id: "brand", type: "note", title: "Brand identity finalized", groupId: "operations", x: 568, y: 646, locked: true, createdBy: "human", modifiedBy: "human", approval: "approved", version: 1 },
    { id: "launch-date", type: "decision", title: "Launch date", content: "October 14?", x: 395, y: 334, status: "unresolved", confidence: 62, createdBy: "human", modifiedBy: "agent", approval: "pending", version: 2 }
  ],
  connections: [
    { id: "c1", from: "beta-feedback", to: "launch-date", relationship: "blocks", createdBy: "agent" },
    { id: "c2", from: "landing", to: "launch-date", relationship: "depends_on", createdBy: "agent" },
    { id: "c3", from: "support", to: "launch-date", relationship: "depends_on", createdBy: "agent" },
    { id: "c4", from: "fix-signup", to: "launch-date", relationship: "blocks", createdBy: "agent" }
  ],
  proposal: {
    id: "aurora-date-proposal", contractId: "P-014", title: "Move launch date", summary: "October 14 → October 21", reason: "Beta evidence v4 reports 42 responses. Moving the launch keeps a full week to incorporate the critical improvements already identified.", changes: ["Move launch date to October 21", "Reschedule launch checklist", "Move support briefing", "Move infrastructure scale plan"], objectIds: ["launch-date", "beta-feedback", "support"], citations: [{ label: "Beta feedback v4", objectId: "beta-feedback" }, { label: "Fix signup bug", objectId: "fix-signup" }], groundedOn: { evidenceObjectId: "beta-feedback", evidenceVersion: 4, summary: "42 beta responses", at: "9:42 AM" }, confidence: 87, status: "pending"
  },
  activity: [
    event("e1", "agent", "Read 26 objects", "9:41 AM"),
    event("e2", "agent", "Grouped 19 objects into 4 areas", "9:41 AM"),
    event("e3", "agent", "Created 6 dependencies", "9:42 AM"),
    event("e4", "agent", "Requested a human decision", "9:42 AM", ["launch-date"])
  ]
});

export const createResearchWorkspace = (): WorkspaceState => ({
  id: "research-synthesis",
  name: "Research synthesis",
  selectedId: "retention-claim",
  agentStatus: "connected",
  permissions: { read: true, create: true, modify: true, reorganize: true, connect: true, delete: false },
  objects: [
    { id: "claims", type: "group", title: "Claims", x: 86, y: 112, width: 286, createdBy: "agent", modifiedBy: "agent", approval: "approved", version: 1 },
    { id: "evidence", type: "group", title: "Evidence", x: 610, y: 112, width: 286, createdBy: "agent", modifiedBy: "agent", approval: "approved", version: 1 },
    { id: "contradictions", type: "group", title: "Contradictions", x: 86, y: 405, width: 286, createdBy: "agent", modifiedBy: "agent", approval: "approved", version: 1 },
    { id: "questions", type: "group", title: "Open questions", x: 610, y: 405, width: 286, createdBy: "agent", modifiedBy: "agent", approval: "approved", version: 1 },
    { id: "retention-claim", type: "decision", title: "Onboarding improves retention", content: "Needs evidence", x: 395, y: 334, status: "unresolved", confidence: 58, createdBy: "human", modifiedBy: "agent", approval: "pending", version: 2 },
    { id: "interview-theme", type: "note", title: "Interview theme", content: "Users want a faster first win", groupId: "claims", x: 104, y: 174, createdBy: "human", modifiedBy: "agent", approval: "not_required", version: 2 },
    { id: "activation-task", type: "task", title: "Test guided activation", groupId: "claims", x: 104, y: 242, priority: "high", createdBy: "agent", modifiedBy: "agent", approval: "not_required", version: 1 },
    { id: "cohort-data", type: "note", title: "Cohort analysis", content: "Week-one activation correlates with return", groupId: "evidence", x: 568, y: 174, createdBy: "human", modifiedBy: "agent", approval: "not_required", version: 2 },
    { id: "support-log", type: "note", title: "Support log", content: "Setup confusion is the top early complaint", groupId: "evidence", x: 568, y: 242, createdBy: "human", modifiedBy: "agent", approval: "not_required", version: 2 },
    { id: "small-sample", type: "note", title: "Small sample warning", content: "Only 18 interview participants", groupId: "contradictions", x: 104, y: 510, createdBy: "human", modifiedBy: "human", approval: "not_required", version: 1 },
    { id: "pricing-effect", type: "note", title: "Pricing effect unknown", content: "Retention may be confounded by plan choice", groupId: "contradictions", x: 104, y: 578, createdBy: "human", modifiedBy: "human", approval: "not_required", version: 1 },
    { id: "experiment", type: "task", title: "Run activation experiment", groupId: "questions", x: 568, y: 510, priority: "high", createdBy: "agent", modifiedBy: "agent", approval: "not_required", version: 1 },
    { id: "segment", type: "note", title: "Which segment benefits?", groupId: "questions", x: 568, y: 578, createdBy: "human", modifiedBy: "agent", approval: "not_required", version: 2 }
  ],
  connections: [
    { id: "r1", from: "cohort-data", to: "retention-claim", relationship: "supports", createdBy: "agent" },
    { id: "r2", from: "small-sample", to: "retention-claim", relationship: "blocks", createdBy: "agent" },
    { id: "r3", from: "retention-claim", to: "experiment", relationship: "depends_on", createdBy: "agent" }
  ],
  activity: [
    event("r1", "agent", "Read 13 research objects", "10:12 AM"),
    event("r2", "agent", "Separated claims from evidence", "10:12 AM"),
    event("r3", "agent", "Flagged two contradictions", "10:13 AM", ["small-sample", "pricing-effect"]),
    event("r4", "agent", "Requested validation before confirming the claim", "10:13 AM", ["retention-claim"])
  ]
});
