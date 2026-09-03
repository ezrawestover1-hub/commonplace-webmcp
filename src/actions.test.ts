import { describe, expect, it } from "vitest";
import { workspaceActions } from "./actions";
import { createAuroraWorkspace } from "./data";

describe("Commonplace shared action layer", () => {
  it("records a human acceptance as canonical shared state", () => {
    const accepted = workspaceActions.acceptProposal(createAuroraWorkspace());
    const decision = accepted.objects.find((object) => object.id === "launch-date");
    expect(decision?.content).toBe("October 21");
    expect(decision?.status).toBe("confirmed");
    expect(decision?.approval).toBe("approved");
    expect(accepted.proposal?.status).toBe("accepted");
    expect(accepted.activity.at(-1)?.actor).toBe("human");
  });

  it("prevents an agent from moving a human-locked object", () => {
    const workspace = createAuroraWorkspace();
    expect(() => workspaceActions.moveObjects(workspace, [{ id: "brand", x: 10, y: 10 }], "agent")).toThrow("locked by a human");
  });

  it("allows a human to rearrange the same canonical object", () => {
    const workspace = createAuroraWorkspace();
    const moved = workspaceActions.moveObjects(workspace, [{ id: "brand", x: 80, y: 90 }], "human");
    const brand = moved.objects.find((object) => object.id === "brand");
    expect(brand?.x).toBe(80);
    expect(brand?.modifiedBy).toBe("human");
  });

  it("lets a human pull a card out of a group while preserving canonical provenance", () => {
    const workspace = createAuroraWorkspace();
    const pulled = workspaceActions.moveObjects(workspace, [{ id: "fix-signup", x: 540, y: 520 }], "human", true);
    const object = pulled.objects.find((item) => item.id === "fix-signup");
    expect(object?.groupId).toBeUndefined();
    expect(object?.x).toBe(540);
    expect(pulled.activity.at(-1)?.text).toContain("Pulled 1 object");
  });

  it("groups unlocked objects through the canonical action layer", () => {
    const workspace = createAuroraWorkspace();
    const grouped = workspaceActions.groupObjects(workspace, "marketing", ["fix-signup", "analytics"], "agent");
    expect(grouped.objects.find((object) => object.id === "fix-signup")?.groupId).toBe("marketing");
    expect(grouped.activity.at(-1)?.text).toContain("Grouped 2 objects under Marketing");
  });

  it("refuses an agent transform of a human-locked object", () => {
    expect(() => workspaceActions.transformObjects(createAuroraWorkspace(), [{ id: "brand", type: "task" }], "agent")).toThrow("locked by a human");
  });

  it("applies the structured operations that a human accepts", () => {
    const workspace = createAuroraWorkspace();
    const proposed = workspaceActions.propose(workspace, {
      id: "generic-proposal", contractId: "P-TEST", title: "Convert evidence", summary: "Note → task", reason: "Makes the follow-up actionable.", changes: ["Convert beta feedback"], objectIds: ["beta-feedback"], citations: [{ label: "Beta feedback v4", objectId: "beta-feedback" }], groundedOn: { evidenceObjectId: "beta-feedback", evidenceVersion: 4, summary: "42 responses", at: "9:42 AM" }, confidence: 88, status: "pending",
      operations: [{ kind: "transform", id: "beta-feedback", type: "task" }]
    });
    const accepted = workspaceActions.acceptProposal(proposed);
    expect(accepted.objects.find((object) => object.id === "beta-feedback")?.type).toBe("task");
    expect(accepted.proposal?.status).toBe("accepted");
  });

  it("invalidates a pending proposal when a person changes its evidence", () => {
    const workspace = createAuroraWorkspace();
    const edited = workspaceActions.updateObject(workspace, "beta-feedback", { content: "68 responses · 9 critical onboarding regressions" }, "human");
    const stale = workspaceActions.markProposalStale(edited, "beta-feedback");
    expect(stale.proposal?.status).toBe("stale");
    expect(workspaceActions.acceptProposal(stale)).toBe(stale);
    expect(stale.activity.at(-1)?.text).toContain("proposal is stale");
  });

  it("preserves the versioned Evidence Contract from P-014 through cited P-015", () => {
    const initial = createAuroraWorkspace();
    expect(initial.proposal).toMatchObject({ contractId: "P-014", groundedOn: { evidenceVersion: 4, summary: "42 beta responses" } });

    const updated = workspaceActions.updateObject(initial, "beta-feedback", { content: "68 responses · 9 critical onboarding regressions" }, "human");
    const stale = workspaceActions.markProposalStale(updated, "beta-feedback");
    expect(stale.proposal?.status).toBe("stale");
    expect(stale.evidenceRecheck).toMatchObject({ evidenceObjectId: "beta-feedback", evidenceVersion: 5, historyRead: false, objectsRead: false });

    const fresh = workspaceActions.proposeEvidenceRecheck(stale);
    expect(fresh.proposal).toMatchObject({ contractId: "P-015", groundedOn: { evidenceVersion: 5 } });
    expect(fresh.proposal?.citations).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Beta feedback v5", objectId: "beta-feedback" }),
      expect.objectContaining({ label: "Fix signup bug", objectId: "fix-signup" }),
      expect.objectContaining({ label: "Human update at 10:12 AM" })
    ]));
  });

  it("creates a new reviewable proposal only after the evidence re-check path", () => {
    const stale = workspaceActions.markProposalStale(createAuroraWorkspace(), "beta-feedback");
    const rechecked = workspaceActions.proposeEvidenceRecheck(stale);
    expect(rechecked.proposal?.status).toBe("pending");
    expect(rechecked.proposal?.summary).toContain("October 28");
    expect(workspaceActions.acceptProposal(rechecked).objects.find((object) => object.id === "launch-date")?.content).toBe("October 28");
  });

  it("enforces fresh history and object reads before an agent can replace a stale proposal", () => {
    const stale = workspaceActions.markProposalStale(createAuroraWorkspace(), "beta-feedback");
    const replacement = { id: "replacement", contractId: "P-015", title: "Fresh launch recommendation", summary: "October 14 → October 28", reason: "New evidence was reviewed.", changes: ["Move launch date"], objectIds: ["launch-date", "beta-feedback"], citations: [{ label: "Beta feedback v5", objectId: "beta-feedback" }], groundedOn: { evidenceObjectId: "beta-feedback", evidenceVersion: 5, summary: "68 responses", at: "10:12 AM" }, confidence: 93, status: "pending" as const };
    expect(() => workspaceActions.propose(stale, replacement)).toThrow("must re-read");
    const historyRead = workspaceActions.recordEvidenceRecheck(stale, "history", ["beta-feedback"]);
    expect(() => workspaceActions.propose(historyRead, replacement)).toThrow("must re-read");
    const rechecked = workspaceActions.recordEvidenceRecheck(historyRead, "objects", ["beta-feedback", "launch-date"]);
    expect(workspaceActions.propose(rechecked, replacement).proposal?.status).toBe("pending");
  });

  it("enforces connection permission for an agent while allowing a human relationship", () => {
    const workspace = createAuroraWorkspace();
    const noConnection = { ...workspace, permissions: { ...workspace.permissions, connect: false } };
    expect(() => workspaceActions.connect(noConnection, { from: "beta-feedback", to: "launch-date", relationship: "related_to" }, "agent")).toThrow("connection permission");
    const connected = workspaceActions.connect(noConnection, { from: "beta-feedback", to: "launch-date", relationship: "related_to" }, "human");
    expect(connected.connections.at(-1)?.createdBy).toBe("human");
  });

  it("enforces create permission for an agent while preserving human creation", () => {
    const workspace = createAuroraWorkspace();
    const noCreate = { ...workspace, permissions: { ...workspace.permissions, create: false } };
    const object = { id: "new-note", type: "note" as const, title: "A new note", x: 420, y: 620, approval: "not_required" as const };
    expect(() => workspaceActions.createObjects(noCreate, [object], "agent")).toThrow("create permission");
    expect(workspaceActions.createObjects(noCreate, [object], "human").objects.find((item) => item.id === "new-note")?.createdBy).toBe("human");
  });
});
