import { afterEach, describe, expect, it, vi } from "vitest";
import { workspaceActions } from "./actions";
import { createAuroraWorkspace } from "./data";
import { registerCommonplaceTools, type ToolTraceEvent } from "./webmcp";

const originalModelContext = Object.getOwnPropertyDescriptor(document, "modelContext");

afterEach(() => {
  if (originalModelContext) Object.defineProperty(document, "modelContext", originalModelContext);
  else delete (document as Document & { modelContext?: unknown }).modelContext;
});

describe("WebMCP decision contract", () => {
  it("registers the purpose-built decision tool surface", async () => {
    const registerTool = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(document, "modelContext", { configurable: true, value: { registerTool } });
    const registration = registerCommonplaceTools(createAuroraWorkspace, vi.fn());
    await Promise.resolve();

    expect(registration).toMatchObject({ supported: true, toolCount: 6 });
    expect(registerTool.mock.calls.map(([tool]) => tool.name)).toEqual([
      "get_decision_context", "get_evidence_changes", "get_evidence_objects", "propose_decision_update", "request_human_confirmation", "get_decision_history"
    ]);
    expect(registerTool.mock.calls.filter(([tool]) => ["get_decision_context", "get_evidence_changes", "get_evidence_objects", "get_decision_history"].includes(tool.name)).every(([tool]) => tool.annotations?.readOnlyHint)).toBe(true);
    await expect(registration.ready).resolves.toEqual({ state: "ready", registered: 6, failedTools: [] });
    registration.cleanup();
  });

  it("returns an honest unsupported result when WebMCP is absent", () => {
    delete (document as Document & { modelContext?: unknown }).modelContext;
    const registration = registerCommonplaceTools(createAuroraWorkspace, vi.fn());
    expect(registration).toMatchObject({ supported: false, toolCount: 0 });
    return expect(registration.ready).resolves.toEqual({ state: "unsupported", registered: 0, failedTools: [] });
  });

  it("reports a partial registration instead of claiming the full contract is live", async () => {
    const registerTool = vi.fn().mockImplementation((tool: { name: string }) => tool.name === "get_decision_history" ? Promise.reject(new Error("denied")) : Promise.resolve());
    Object.defineProperty(document, "modelContext", { configurable: true, value: { registerTool } });
    const registration = registerCommonplaceTools(createAuroraWorkspace, vi.fn());
    await expect(registration.ready).resolves.toEqual({ state: "failed", registered: 5, failedTools: ["get_decision_history"] });
  });

  it("labels native decision tools and keeps canonical authority with the human", async () => {
    const registerTool = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(document, "modelContext", { configurable: true, value: { registerTool } });
    let workspace = createAuroraWorkspace();
    const traces: ToolTraceEvent[] = [];
    const registration = registerCommonplaceTools(() => workspace, (update) => { workspace = typeof update === "function" ? update(workspace) : update; }, (event) => traces.push(event));
    await registration.ready;
    const tools = new Map(registerTool.mock.calls.map(([tool]) => [tool.name, tool]));

    const context = await tools.get("get_decision_context").execute({});
    expect(context).toMatchObject({ decision: { authority: "human_required" }, proposal: { contractId: "P-014", groundedOn: { evidenceVersion: 4 } } });
    await tools.get("request_human_confirmation").execute({ contractId: "P-014", prompt: "Confirm the recommendation." });
    expect(workspace.objects.find((object) => object.id === "launch-date")?.content).toBe("October 14?");
    expect(traces.at(-1)).toMatchObject({ tool: "request_human_confirmation", source: "native", outcome: "success" });
    registration.cleanup();
  });

  it("requires decision history and current evidence before a stale replacement can be proposed", async () => {
    const registerTool = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(document, "modelContext", { configurable: true, value: { registerTool } });
    let workspace = createAuroraWorkspace();
    const registration = registerCommonplaceTools(() => workspace, (update) => { workspace = typeof update === "function" ? update(workspace) : update; });
    await registration.ready;
    const tools = new Map(registerTool.mock.calls.map(([tool]) => [tool.name, tool]));
    workspace = workspaceActions.markProposalStale(workspaceActions.updateObject(workspace, "beta-feedback", { content: "68 responses · 9 critical onboarding regressions" }, "human"), "beta-feedback");
    const replacement = { contractId: "P-015", summary: "October 14 → October 28", reason: "Beta v5 reports critical regressions and signup is blocked.", changes: ["Move launch date to October 28"], confidence: 93 };

    await expect(tools.get("propose_decision_update").execute(replacement)).rejects.toThrow("must re-read");
    await tools.get("get_decision_history").execute({});
    await tools.get("get_evidence_objects").execute({ objectIds: ["beta-feedback", "launch-date", "fix-signup"] });
    await expect(tools.get("propose_decision_update").execute(replacement)).resolves.toMatchObject({ ok: true, contractId: "P-015", status: "pending_human_confirmation" });
    expect(workspace.proposal).toMatchObject({ contractId: "P-015", groundedOn: { evidenceVersion: 5 } });
    expect(workspace.proposal?.citations).toEqual(expect.arrayContaining([expect.objectContaining({ label: "Beta feedback v5" }), expect.objectContaining({ label: "Fix signup bug" })]));
    registration.cleanup();
  });
});
