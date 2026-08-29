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
      id: "generic-proposal", title: "Convert evidence", summary: "Note → task", reason: "Makes the follow-up actionable.", changes: ["Convert beta feedback"], objectIds: ["beta-feedback"], confidence: 88, status: "pending",
      operations: [{ kind: "transform", id: "beta-feedback", type: "task" }]
    });
    const accepted = workspaceActions.acceptProposal(proposed);
    expect(accepted.objects.find((object) => object.id === "beta-feedback")?.type).toBe("task");
    expect(accepted.proposal?.status).toBe("accepted");
  });
});
